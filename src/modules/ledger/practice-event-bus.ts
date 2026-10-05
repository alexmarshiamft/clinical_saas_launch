/**
 * TheraFlow OS — Unified Practice Event Bus & Encounter Ledger
 * 
 * Enforces the core architectural principle:
 * "Enter clinical activity once. Everything downstream derives from it."
 * 
 * Complete downstream pipeline:
 * Appointment -> Clinical Encounter -> Clinical Note -> CPT / Claim ->
 * Payment / ERA Deposit -> Clinician Compensation -> Payroll Earnings ->
 * Payroll Funding -> Practice Financial Reporting.
 * 
 * Includes idempotency guardrails preventing duplicate compensation processing.
 */

import { PracticeEvent, PracticeEventType, EarningLineItem } from '@/types/practice-os';

export type EventHandler<T = any> = (event: PracticeEvent<T>) => void | Promise<void>;

export class PracticeEventBus {
  private static instance: PracticeEventBus;
  private listeners: Map<PracticeEventType, Set<EventHandler>> = new Map();
  private eventHistory: PracticeEvent[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): PracticeEventBus {
    if (!PracticeEventBus.instance) {
      PracticeEventBus.instance = new PracticeEventBus();
    }
    return PracticeEventBus.instance;
  }

  /**
   * Subscribe a listener to a specific practice business event.
   */
  public subscribe<T = any>(eventType: PracticeEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return un-subscribe function
    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emits a business event. Guarantees idempotency.
   */
  public async emit<T = any>(
    type: PracticeEventType,
    practiceId: string,
    actorId: string,
    idempotencyKey: string,
    payload: T
  ): Promise<{ delivered: boolean; skippedDuplicate: boolean }> {
    // Check if this action was already processed to prevent duplicate compensation/payments
    if (this.processedIdempotencyKeys.has(idempotencyKey)) {
      console.warn(`[PracticeEventBus] Idempotency duplicate event prevented: ${type} (${idempotencyKey})`);
      return { delivered: false, skippedDuplicate: true };
    }

    this.processedIdempotencyKeys.add(idempotencyKey);

    const event: PracticeEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      practiceId,
      timestamp: new Date().toISOString(),
      actorId,
      idempotencyKey,
      payload,
    };

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 500) this.eventHistory.pop();

    const handlers = this.listeners.get(type);
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (handlerErr) {
          console.error(`[PracticeEventBus] Handler exception on event ${type}:`, handlerErr);
        }
      }
    }

    return { delivered: true, skippedDuplicate: false };
  }

  /**
   * Alias for emit accepting an object
   */
  public async publish<T = any>(eventData: {
    type: PracticeEventType;
    practiceId: string;
    actorId: string;
    idempotencyKey: string;
    payload: T;
  }): Promise<{ delivered: boolean; skippedDuplicate: boolean }> {
    return this.emit(eventData.type, eventData.practiceId, eventData.actorId, eventData.idempotencyKey, eventData.payload);
  }

  public getEventHistory(limit: number = 50): PracticeEvent[] {
    return this.eventHistory.slice(0, limit);
  }

  public clearHistory(): void {
    this.eventHistory = [];
    this.processedIdempotencyKeys.clear();
  }
}

export const practiceEventBus = PracticeEventBus.getInstance();
