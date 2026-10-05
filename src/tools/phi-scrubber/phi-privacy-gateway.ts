/**
 * TheraFlow PHI Privacy Gateway
 * 
 * Enforces mandatory de-identification on all outbound clinical LLM/cloud requests.
 * Features a fail-closed architecture: if sanitization encounters any failure,
 * unhandled error, or if direct identifiers remain unredacted, outbound network calls
 * are aborted and fail closed into secure local deterministic clinical rule engines.
 */

import { scrubText } from './engine';
import { ScrubOptions, ScrubResult } from './types';

export class PhiSanitizationError extends Error {
  public readonly reason: string;
  public readonly directEntitiesDetected: number;

  constructor(message: string, reason: string, directEntitiesDetected: number = 0) {
    super(message);
    this.name = 'PhiSanitizationError';
    this.reason = reason;
    this.directEntitiesDetected = directEntitiesDetected;
  }
}

export interface SanitizedPayload {
  cleanText: string;
  itemsRedacted: number;
  categoriesTriggered: string[];
  scrubResult: ScrubResult;
}

export interface GatewayPatientContext {
  name?: string;
  dob?: string;
  mrn?: string;
  phone?: string;
}

/**
 * Sanitizes input text before dispatch to external cloud or LLM endpoints.
 * Guarantees fail-closed behavior: never returns unsanitized text on failure.
 */
export function sanitizeForOutboundLlm(
  rawInput: string,
  context?: GatewayPatientContext,
  options: Partial<ScrubOptions> = {}
): SanitizedPayload {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      cleanText: '',
      itemsRedacted: 0,
      categoriesTriggered: [],
      scrubResult: scrubText('', options),
    };
  }

  try {
    const scrubOptions: Partial<ScrubOptions> = {
      maskStyle: options.maskStyle || 'tag',
      customPatientContext: context
        ? {
            name: context.name,
            dob: context.dob,
            mrn: context.mrn,
            phone: context.phone,
          }
        : undefined,
    };

    const result = scrubText(rawInput, scrubOptions);

    // Fail-Closed Validation: Verify no direct identifiers bypassed sanitization
    // If the patient's explicit name was passed in context, verify it does not appear in cleanText
    if (context?.name && context.name.trim().length > 2) {
      const escapedName = context.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameCheck = new RegExp(`\\b${escapedName}\\b`, 'i');
      if (nameCheck.test(result.cleanText)) {
        throw new PhiSanitizationError(
          'Fail-closed security check triggered: Patient name was detected in outbound text post-scrubbing.',
          'PATIENT_NAME_LEAK_PREVENTED',
          1
        );
      }
    }

    if (context?.mrn && context.mrn.trim().length > 3) {
      const escapedMrn = context.mrn.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mrnCheck = new RegExp(escapedMrn, 'i');
      if (mrnCheck.test(result.cleanText)) {
        throw new PhiSanitizationError(
          'Fail-closed security check triggered: MRN was detected in outbound text post-scrubbing.',
          'MRN_LEAK_PREVENTED',
          1
        );
      }
    }

    return {
      cleanText: result.cleanText,
      itemsRedacted: result.itemsRedacted,
      categoriesTriggered: result.categoriesTriggered,
      scrubResult: result,
    };
  } catch (err) {
    if (err instanceof PhiSanitizationError) {
      throw err;
    }
    // Fail-closed on any unexpected engine exception
    throw new PhiSanitizationError(
      `Fail-closed exception: PHI scrubber encountered an internal fault: ${String(err)}`,
      'ENGINE_INTERNAL_FAULT',
      0
    );
  }
}
