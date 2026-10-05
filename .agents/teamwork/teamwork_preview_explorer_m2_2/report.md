# Implementation Blueprint: Stripe Subscription Billing — Pricing UI & Subscription Context
**Milestone**: Milestone 2 (Stripe Subscription Billing)  
**Agent**: Explorer 2 (`teamwork_preview_explorer_m2_2`)  
**Scope**: `src/lib/subscription.tsx` (Subscription Context & State Engine) & `src/pages/Subscription.tsx` (Commercial Pricing Table & Billing UI)  
**Authoritative Specs**: `ORIGINAL_REQUEST.md` (§R2, §AC3), `PROJECT.md` (Features 5, 6, 7)  

---

## 1. Executive Summary

Milestone 2 establishes commercial readiness for the Clinical Telehealth & AI Scribe SaaS platform. While Milestone 1 secured the perimeter with dual-engine authentication, Milestone 2 monetizes and gates the 4 core clinical applications (TheraFlow EHR, Clinical AI Scribe v2, Aura Assistant, HIPAA PHI Scrubber) behind active Stripe subscription tiers.

This document provides the definitive implementation blueprint for:
1. **`src/lib/subscription.tsx`**: Central subscription state management with reactive tier switching, annual/monthly billing cycles, fail-closed `localStorage` persistence under key `clinical_saas_subscription`, seamless integration with `POST /api/create-checkout-session`, and automated URL parameter interceptors for `?status=success&session_id=...` return workflows.
2. **`src/pages/Subscription.tsx`**: A production-grade commercial pricing matrix featuring the 3 tiers (Starter $49/mo, Clinician Pro $99/mo, Practice Group $249/mo), an interactive 20% annual discount switcher, interactive checkout CTAs calling `subscribe(planId)`, checkout return banners, and an explicit **Developer Sandbox / Auditor Mode** with 1-click 14-day trial unlock and unsubscribed simulation.

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Browser / SPA                               │
│                                                                             │
│   ┌──────────────────────────┐          ┌───────────────────────────────┐   │
│   │   SubscriptionProvider   │◄─────────┤   localStorage                │   │
│   │  (src/lib/subscription)  │          │   clinical_saas_subscription │   │
│   └────────────┬─────────────┘          └───────────────────────────────┘   │
│                │                                                            │
│       Reactive Context                                                      │
│    { status, tier, cycle,                                                   │
│      subscribe, startTrial }                                                │
│                │                                                            │
│       ┌────────┴────────┬─────────────────────────┐                         │
│       ▼                 ▼                         ▼                         │
│ ┌───────────┐   ┌─────────────────┐     ┌──────────────────────┐            │
│ │ Sidebar   │   │ SubscriptionGate│     │ Subscription Page    │            │
│ │  Badges   │   │  Clinical Locks │     │ Commercial Pricing   │            │
│ └───────────┘   └─────────────────┘     └──────────┬───────────┘            │
│                                                    │                        │
└────────────────────────────────────────────────────┼────────────────────────┘
                                                     │ POST /api/create-checkout-session
                                                     ▼
                                    ┌─────────────────────────────────┐
                                    │    Express Server (server.ts)   │
                                    │                                 │
                                    │ Branch A: Live Stripe (sk_test) │
                                    │ Branch B: Simulated Sandbox     │
                                    └─────────────────────────────────┘
```

---

## 3. Subscription Context Engine Blueprint (`src/lib/subscription.tsx`)

### 3.1 Interface Contracts & Type Hierarchy

The context must provide strict typing for all tiers, lifecycle statuses, and operations.

```typescript
export type SubscriptionTier = 'starter' | 'pro' | 'group';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'none';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanDetails {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  popular?: boolean;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
}

export interface StoredSubscriptionState {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  renewsOn: string | null;
  trialDaysRemaining: number;
  lastSessionId?: string | null;
}

export interface SubscriptionContextType {
  // Reactive State
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  planName: string;
  isSubscribed: boolean;
  trialDaysRemaining: number;
  renewsOn: string | null;

  // Actions
  subscribe: (planId?: SubscriptionTier, cycle?: BillingCycle) => Promise<{ url?: string; sessionId?: string; error?: string }>;
  createCheckoutSession: (planId: SubscriptionTier, cycle?: BillingCycle) => Promise<{ url?: string; sessionId?: string; error?: string }>; // Backward compatibility alias
  startTrial: (tier?: SubscriptionTier) => void;
  cancelSubscription: () => Promise<void>;
  resetSubscription: () => void; // Reset to 'none' for testing/auditing
  setBillingCycle: (cycle: BillingCycle) => void;
  updateTier: (tier: SubscriptionTier) => void;
}
```

### 3.2 Authoritative Plan Catalog (`SUBSCRIPTION_PLANS`)

The plan catalog accurately reflects the clinical scope, feature allowances, and pricing structure:

```typescript
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanDetails> = {
  starter: {
    id: 'starter',
    name: 'Starter Tier',
    tagline: 'Solo Therapists',
    priceMonthly: 49,
    priceAnnual: 39,
    description: 'Perfect for solo practitioners needing core EHR, progress notes, and client invoicing.',
    features: [
      'Core TheraFlow EHR & Calendar Roster',
      'Client Invoicing & CMS-1500 Superbills',
      'Basic PHI Scrubber (25 docs/mo)',
      'Clinical AI Scribe (5 sessions/mo)',
      'Standard Email Support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Clinician Pro',
    tagline: 'All 4 Tools Unlocked',
    popular: true,
    priceMonthly: 99,
    priceAnnual: 79,
    description: 'The flagship clinical suite for full-time clinicians with all 4 tools unlocked.',
    features: [
      'Full TheraFlow EHR & WebRTC Telehealth',
      'Unlimited Clinical AI Scribe v2 Diarization',
      'Aura Assistant Floating In-Workflow Copilot',
      'Unlimited 18 Safe Harbor PHI Redactions',
      'Signed HIPAA Business Associate Agreement (BAA)',
      'Priority 24/7 Clinical Support',
    ],
  },
  group: {
    id: 'group',
    name: 'Practice Group',
    tagline: 'Multi-Provider Practice',
    priceMonthly: 249,
    priceAnnual: 199,
    description: 'For clinics and behavioral health group practices managing multiple providers.',
    features: [
      '5 Clinician Licenses Included',
      'Centralized Multi-Provider Billing & Claims',
      'Custom Practice Clinical Note Templates',
      'Group Practice Forensic Audit Export',
      'Dedicated Account Manager & EHR Onboarding',
    ],
  },
};
```

### 3.3 Storage Persistence Key & Resilient Cache Parser

To prevent UI flash and asynchronous race conditions during component mounting or test runs, the stored state must be retrieved synchronously on initial render:

```typescript
export const STORAGE_KEY_SUBSCRIPTION = 'clinical_saas_subscription';

export function getStoredSubscription(): StoredSubscriptionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        status: ['active', 'trialing', 'canceled', 'none'].includes(parsed.status) ? parsed.status : 'active',
        tier: ['starter', 'pro', 'group'].includes(parsed.tier) ? parsed.tier : 'pro',
        billingCycle: ['monthly', 'annual'].includes(parsed.billingCycle) ? parsed.billingCycle : 'monthly',
        renewsOn: parsed.renewsOn || null,
        trialDaysRemaining: typeof parsed.trialDaysRemaining === 'number' ? parsed.trialDaysRemaining : 14,
        lastSessionId: parsed.lastSessionId || null,
      };
    }
  } catch (err) {
    console.warn('[Subscription] Failed to parse cached subscription:', err);
  }
  return null;
}
```

### 3.4 Immediate Return URL Parameter Handling (`?status=success&session_id=...`)

When Stripe redirects back to `/dashboard/subscription?status=success&session_id=cs_...&plan=...`:
1. The client must immediately parse the query string upon mount.
2. If `status=success` and a valid session ID or plan parameter exists, update context status to `'active'`.
3. Set `renewsOn` to +30 days (or +365 days if annual).
4. Persist updated status immediately to `localStorage`.
5. Log verification confirmation.

```typescript
// Return URL parameter interceptor inside SubscriptionProvider
useEffect(() => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const checkoutStatus = urlParams.get('status');
  const sessionId = urlParams.get('session_id');
  const planParam = urlParams.get('plan') as SubscriptionTier | null;

  if (checkoutStatus === 'success' && (sessionId || planParam)) {
    const validPlan = planParam && SUBSCRIPTION_PLANS[planParam] ? planParam : tier;
    const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    setTier(validPlan);
    setStatus('active');
    setRenewsOn(nextRenewal);
    persistState(validPlan, 'active', billingCycle, nextRenewal, 14, sessionId);
    console.log(`[Subscription] Checkout confirmed: tier=${validPlan}, session=${sessionId}`);
  }
}, []);
```

### 3.5 Integration with `POST /api/create-checkout-session`

The `subscribe` method must dispatch requests to the Express backend endpoint:

```typescript
const subscribe = async (
  planId: SubscriptionTier = tier,
  cycle: BillingCycle = billingCycle
): Promise<{ url?: string; sessionId?: string; error?: string }> => {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        billingCycle: cycle,
        clinicianEmail: user?.email || 'sarah.chen.md@behavioralhealth.org',
        successUrl: `${origin}/dashboard/subscription?status=success&session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
        cancelUrl: `${origin}/dashboard/subscription?status=canceled`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Failed to initialize Stripe checkout session' };
    }

    // In simulated sandbox mode (no live Stripe key), immediately update local state
    if (data.simulated) {
      const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setTier(planId);
      setStatus('active');
      setRenewsOn(nextRenewal);
      persistState(planId, 'active', cycle, nextRenewal, 14, data.sessionId);
    }

    return {
      url: data.url,
      sessionId: data.sessionId,
    };
  } catch (err: any) {
    console.error('[Subscription] Checkout session network error:', err);
    return { error: err.message || 'Network error during checkout initialization' };
  }
};
```

---

## 4. Pricing UI Blueprint (`src/pages/Subscription.tsx`)

### 4.1 Visual Hierarchy & Component Structure

The `Subscription.tsx` page comprises six distinct functional zones:
1. **Return Banners Zone**:
   - **Success Banner**: Rendered when `?status=success`. Displays emerald border/background, CheckCircle icon, confirmation message, and session ID chip (`cs_test_...`). Includes "Dismiss" and "Open Scribe" buttons.
   - **Canceled Banner**: Rendered when `?status=canceled`. Displays amber warning banner clarifying that no charges occurred.
   - **Error Banner**: Displays any network or Stripe API error during checkout session generation.
2. **Subscription Header & Status Pill**:
   - Primary heading: "Practice Subscription & Billing".
   - Subtitle: "Manage your plan, clinical licenses, and Stripe test billing integration."
   - Current status badge card: Shows active plan name, status badge (`Active`, `Trial (14d left)`, `Canceled`, `No Active Subscription`), and next renewal date.
3. **Billing Cycle Switcher**:
   - Pill toggle button group: "Monthly Billing" vs "Annual Billing".
   - Includes a green badge: **"Save 20%"** on the Annual button.
   - Dynamically recalculates tier prices:
     - Starter: $49/mo (monthly) vs $39/mo (annual)
     - Clinician Pro: $99/mo (monthly) vs $79/mo (annual)
     - Practice Group: $249/mo (monthly) vs $199/mo (annual)
4. **3-Tier Pricing Table (Grid)**:
   - **Starter**: Clean white card, $49/mo ($39 annual). Solo therapist focus.
   - **Clinician Pro**: Flagship styling with deep indigo card (`bg-indigo-900 text-white`), glowing border (`border-indigo-500 shadow-xl`), -translate-y elevation, and top pill: **"MOST POPULAR • ALL 4 TOOLS UNLOCKED"**. Highlighting unlimited AI Scribe and full EHR.
   - **Practice Group**: Slate accent card, $249/mo ($199 annual). 5 clinical licenses and practice auditing.
5. **Interactive Checkout CTAs**:
   - If plan is currently active: renders disabled pill `"Active Plan"`.
   - If plan is inactive: renders interactive button `"Upgrade to [Plan Name]"`, which triggers `handleSelectPlan(planKey)` -> `subscribe(planKey, billingCycle)`.
   - Loading indicator: `"Connecting Stripe..."` with spinner while awaiting response.
   - Direct redirection: `window.location.href = res.url`.
6. **Developer Sandbox & Auditor Mode (Test Mode)**:
   - Specific component requested by spec: `"Unlock Instant 14-Day Trial (Test Mode)"` toggle.
   - Instant action buttons:
     - **"Unlock Instant 14-Day Trial (Test Mode)"** (calls `startTrial('pro')`)
     - **"Simulate Unsubscribed (Lockout Test)"** (calls `resetSubscription()`, sets `status = 'none'`)
     - Quick tier setters: `"Set Starter ($49)"`, `"Set Clinician Pro ($99)"`, `"Set Practice Group ($249)"`.

### 4.2 Exact Markup & Interaction Design

```tsx
{/* Return Banner on Stripe Return */}
{checkoutStatus === 'success' && (
  <div id="stripe-checkout-success-banner" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs">
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      <div>
        <div className="font-bold text-sm">Subscription Activated Successfully!</div>
        <div className="text-xs text-emerald-700">
          Welcome to {planName}. All 4 clinical tools are unlocked for your practice.
          {sessionId && <span className="font-mono ml-1.5 opacity-90 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">({sessionId.substring(0, 20)}...)</span>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <NavLink
        to="/dashboard/scribe"
        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
      >
        Launch AI Scribe →
      </NavLink>
    </div>
  </div>
)}
```

---

## 5. State Machine & Transitions

| Current Status | Action | New Status | Resulting Access |
|---|---|---|---|
| `none` (Unsubscribed) | `subscribe(planId)` (Success) | `active` | All clinical apps unlocked; `isSubscribed: true` |
| `none` (Unsubscribed) | `startTrial(tier)` | `trialing` | All clinical apps unlocked for 14 days; `isSubscribed: true` |
| `active` | `cancelSubscription()` | `canceled` | Status set to canceled; `isSubscribed: false` |
| `canceled` | `subscribe(planId)` | `active` | Reactivated; `isSubscribed: true` |
| `active` / `trialing` | `resetSubscription()` | `none` | Lockout simulated; `<SubscriptionGate>` active |

---

## 6. Compatibility & Integration Points

1. **Backend Integration (`server.ts`)**:
   - Compatible with Explorer 1's `POST /api/create-checkout-session`.
   - Sends `planId`, `billingCycle`, `clinicianEmail`, `successUrl`, `cancelUrl`.
   - Accurately supports both simulated sandbox mode (for CI/CD and offline testing) and live Stripe test keys (`sk_test_...`).
2. **Access Gating Integration (`<SubscriptionGate>`)**:
   - Compatible with Explorer 3's `<SubscriptionGate requiredTier="pro">`.
   - `SubscriptionGate` checks `isSubscribed && (tierWeight[tier] >= tierWeight[requiredTier])`.
   - When status is `'none'`, `isSubscribed` evaluates to `false`, activating the lock screen.
3. **Navigation Shell Integration (`Sidebar.tsx` & `Header.tsx`)**:
   - Shows active plan name and status pill in the sidebar.
   - Seamlessly updates when user switches tiers via the Sandbox mode or Stripe checkout.

---

## 7. Verification Strategy & Test Matrix

An automated test suite (`tests/verify-subscription-billing.tsx`) must execute the following checks:
1. **Initial State & Persistence**:
   - Verifies default or cached state in `localStorage` (`clinical_saas_subscription`).
   - Verifies that setting `status: 'none'` properly causes `isSubscribed` to evaluate to `false`.
2. **Checkout Session Invocation**:
   - Calls `subscribe('pro', 'monthly')`.
   - Asserts fetch to `/api/create-checkout-session`.
   - Verifies return object has `sessionId` and `url`.
3. **URL Parameter Activation**:
   - Mounts provider at URL with `?status=success&session_id=cs_test_mock123&plan=group`.
   - Confirms state changes to `status: 'active'`, `tier: 'group'`.
   - Confirms `localStorage` is updated.
4. **Pricing Table Component Verification**:
   - Mounts `Subscription.tsx`.
   - Verifies all 3 tiers render ($49, $99, $249).
   - Toggles Annual billing: confirms prices update ($39, $79, $199) and "Save 20%" badge exists.
   - Verifies Clinician Pro is highlighted as "Most Popular • All 4 Tools Unlocked".
   - Verifies Developer Sandbox box renders with "Unlock Instant 14-Day Trial (Test Mode)".
   - Clicks trial unlock button: confirms transition to `trialing` with Pro tier.
