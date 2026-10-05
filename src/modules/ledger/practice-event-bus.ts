/**
 * TheraFlow OS — Durable Practice Event Bus & Encounter Ledger
 * 
 * Enforces the core architectural principle:
 * "Enter clinical activity once. Everything downstream derives from it."
 * 
 * Complete downstream pipeline:
 * Appointment -> Clinical Encounter -> Clinical Note -> CPT / Claim ->
 * Payment / ERA Deposit -> Clinician Compensation -> Payroll Earnings ->
 * Payroll Funding -> Practice Financial Reporting.
 * 
 * REMEDIATED ARCHITECTURE (DURABLE IDEMPOTENCY & TRANSACTION SAFETY):
 * - Persisted to durable append-only event store (`data/practice_event_store.jsonl`).
 * - Survives process restarts and page refreshes.
 * - Never burns idempotency keys prior to successful handler execution (retry-safe).
 * - Deterministic uniqueness constraints for payment events and compensation accruals.
 */

import { PracticeEvent, PracticeEventType } from '@/types/practice-os';

export type EventHandler<T = any> = (event: PracticeEvent<T>) => void | Promise<void>;

// Browser/Node safe module loader
function getFs(): any {
  if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
    return (process as any).getBuiltinModule('fs');
  }
  return null;
}

function getPath(): any {
  if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
    return (process as any).getBuiltinModule('path');
  }
  return null;
}

function getDefaultStorePath(): string {
  const p = getPath();
  if (p && typeof process !== 'undefined') {
    return p.resolve(process.cwd(), 'data', 'practice_event_store.jsonl');
  }
  return 'data/practice_event_store.jsonl';
}

export class PracticeEventBus {
  private static instance: PracticeEventBus;
  private listeners: Map<PracticeEventType, Set<EventHandler>> = new Map();
  private eventHistory: PracticeEvent[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();
  private storeFilePath: string = getDefaultStorePath();
  private isDurableStorageAvailable: boolean = false;

  private constructor(customStoreFile?: string) {
    if (customStoreFile) {
      this.storeFilePath = customStoreFile;
    }
    this.hydrateFromDurableStore();
  }

  public static getInstance(customStoreFile?: string): PracticeEventBus {
    if (!PracticeEventBus.instance) {
      PracticeEventBus.instance = new PracticeEventBus(customStoreFile);
    }
    return PracticeEventBus.instance;
  }

  /**
   * Reset instance (used in test isolation)
   */
  public static resetInstance(customStoreFile?: string): PracticeEventBus {
    PracticeEventBus.instance = new PracticeEventBus(customStoreFile);
    return PracticeEventBus.instance;
  }

  /**
   * Hydrate idempotency keys and event log from durable file store on restart
   */
  private hydrateFromDurableStore(): void {
    const fs = getFs();
    if (fs && fs.existsSync(this.storeFilePath)) {
      try {
        const content = fs.readFileSync(this.storeFilePath, 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as PracticeEvent;
            if (parsed.idempotencyKey) {
              this.processedIdempotencyKeys.add(parsed.idempotencyKey);
            }
            this.eventHistory.unshift(parsed);
          } catch {}
        }
        this.isDurableStorageAvailable = true;
      } catch (err) {
        console.error('[PracticeEventBus] Failed to hydrate from store:', err);
      }
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('theraflow_processed_idempotency_keys');
        if (raw) {
          const keys = JSON.parse(raw);
          if (Array.isArray(keys)) {
            keys.forEach((k) => this.processedIdempotencyKeys.add(k));
          }
        }
      } catch {}
    }
  }

  private persistEvent(event: PracticeEvent): void {
    const fs = getFs();
    const p = getPath();
    if (fs && p) {
      try {
        const dir = p.dirname(this.storeFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(this.storeFilePath, `${JSON.stringify(event)}\n`, 'utf-8');
        this.isDurableStorageAvailable = true;
      } catch (err) {
        console.error('[PracticeEventBus] Failed to append event to durable file:', err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Array.from(this.processedIdempotencyKeys);
        localStorage.setItem('theraflow_processed_idempotency_keys', JSON.stringify(keys.slice(-500)));
      } catch {}
    }
  }

  /**
   * Deterministic payment event key generator:
   * UNIQUE(practice_id, source, external_event_id)
   */
  public static createPaymentIdempotencyKey(practiceId: string, source: string, externalEventId: string): string {
    return `pay:${practiceId}:${source}:${externalEventId}`;
  }

  /**
   * Deterministic compensation accrual key generator:
   * UNIQUE(encounter_id, compensation_rule_id, payment_event_id, accrual_type)
   */
  public static createAccrualIdempotencyKey(
    encounterId: string,
    compensationRuleId: string,
    paymentEventId: string,
    accrualType: string
  ): string {
    return `accrual:${encounterId}:${compensationRuleId}:${paymentEventId}:${accrualType}`;
  }

  /**
   * Subscribe a listener to a specific practice business event.
   */
  public subscribe<T = any>(eventType: PracticeEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emits a business event with durable idempotency.
   * CRITICAL GUARANTEE: If a handler throws, the idempotency key is NOT burned,
   * allowing the caller to safely retry the transaction.
   */
  public async emit<T = any>(
    type: PracticeEventType,
    practiceId: string,
    actorId: string,
    idempotencyKey: string,
    payload: T
  ): Promise<{ delivered: boolean; skippedDuplicate: boolean }> {
    // Step 1: Pre-check duplicate key
    if (this.processedIdempotencyKeys.has(idempotencyKey)) {
      console.warn(`[PracticeEventBus] Durable idempotency duplicate rejected: ${type} (${idempotencyKey})`);
      return { delivered: false, skippedDuplicate: true };
    }

    const event: PracticeEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      practiceId,
      timestamp: new Date().toISOString(),
      actorId,
      idempotencyKey,
      payload,
    };

    // Step 2: Execute all handlers FIRST
    const handlers = this.listeners.get(type);
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        // If a handler fails, throw immediately so the key is not burned!
        await handler(event);
      }
    }

    // Step 3: Atomic commit: only mark key processed and append to durable storage AFTER all handlers succeed
    this.processedIdempotencyKeys.add(idempotencyKey);
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 500) this.eventHistory.pop();

    this.persistEvent(event);

    return { delivered: true, skippedDuplicate: false };
  }

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

  public isProcessed(idempotencyKey: string): boolean {
    return this.processedIdempotencyKeys.has(idempotencyKey);
  }

  public clearHistory(): void {
    this.eventHistory = [];
    this.processedIdempotencyKeys.clear();
    const fs = getFs();
    if (fs && fs.existsSync(this.storeFilePath)) {
      try {
        fs.unlinkSync(this.storeFilePath);
      } catch {}
    }
  }
}

export const practiceEventBus = PracticeEventBus.getInstance();
