# Milestone 2 Implementation Blueprint: Subscription Access Gating

**Author**: Explorer 3 (teamwork_preview_explorer_m2_3)  
**Target Milestone**: Milestone 2: Stripe Subscription Billing — Subscription Access Gating  
**Authoritative Specs**: `ORIGINAL_REQUEST.md` (§R2, §AC2, §AC3) & `PROJECT.md` (Feature 7, Interface Contracts)  
**Target Files**:
- `src/components/guards/SubscriptionGate.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/App.tsx`
- `scripts/verify-subscription-gate.mjs`

---

## Executive Summary

Subscription Access Gating enforces commercial monetization and prevents unauthorized access to electronic Protected Health Information (ePHI) across the merged Clinical SaaS platform. 

This blueprint details the architectural specifications, concrete component code modifications, UI lock overlay design, badge derivations, route wiring, and automated test suite to ensure:
1. **`<SubscriptionGate>`**: Blocks access to the 4 core clinical tools (`/dashboard/ehr`, `/dashboard/scribe`, `/dashboard/aura`, `/dashboard/phi-scrubber`) whenever a clinician has no active subscription (`status: 'none' | 'canceled'`).
2. **Lock Overlay Presentation**: Displays an elegant, clinician-tailored lock screen headlined **"Clinician Pro Subscription Required"**, complete with direct **"Subscribe Now"** (triggers Stripe Checkout) and **"Activate Free Trial"** (14-day instant bypass for auditors and evaluators).
3. **Seamless Permissive Mode**: When subscription is `'active'` or `'trialing'`, the clinical tool renders immediately with zero lag or DOM artifacts.
4. **Header & Sidebar Badges**: Displays the active tier badge (`STARTER`, `PRO CLINICIAN`, `PRACTICE GROUP`, or `TRIAL`) in both Header and Sidebar, and displays **"Upgrade"** badges next to locked tools for Starter tier accounts.
5. **Deterministic Verification**: Establishes `scripts/verify-subscription-gate.mjs` verifying that unsubscribed users are strictly gated and cannot leak ePHI until subscribed or trial-activated.

---

## 1. Component Blueprint: `<SubscriptionGate>`

### 1.1 State Machine & Access Logic

The gate must evaluate both subscription validity (`isSubscribed`) and tier hierarchy (`tierWeight`):

```ts
type SubscriptionTier = 'starter' | 'pro' | 'group';
type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'none';

const TIER_WEIGHTS: Record<SubscriptionTier, number> = {
  starter: 1,
  pro: 2,
  group: 3,
};
```

**Access Evaluation Rules**:
1. If `!isSubscribed` (`status === 'none'` or `'canceled'`):
   - Access is **DENIED** regardless of requested tool.
   - Lock screen displays: *"Clinician Pro Subscription Required"*.
2. If `isSubscribed` (`status === 'active'` or `'trialing'`):
   - If `status === 'trialing'`: Full access granted to all tools (Trial grants Pro/Group equivalent access).
   - If `status === 'active'`: Access granted if `TIER_WEIGHTS[userTier] >= TIER_WEIGHTS[requiredTier]`.
   - If `TIER_WEIGHTS[userTier] < TIER_WEIGHTS[requiredTier]` (e.g., Starter user accessing Pro-gated Aura or Scribe): Access is **DENIED** with tier upgrade prompt.
3. When access is granted: Render `children ? <>{children}</> : null`.

### 1.2 User Experience & Visual Lock Overlay

When access is denied, `<SubscriptionGate>` renders an elegant, focused lock overlay:
- **Visual Design**: Clean, modern clinical aesthetic with subtle ambient gradient, lock and crown iconography, and clear tier requirements.
- **Copy & Messaging**:
  - Title: **"Clinician Pro Subscription Required"** (or customized based on `requiredTier`).
  - Subtitle: Clear explanation that the requested tool requires an active clinical license.
  - Feature Checklist: Bullet points highlighting key capabilities of the plan (e.g. Unlimited Dual-Speaker Diarization, DSM-5 Copilot, 18 Safe Harbor Redaction).
- **Direct Action Buttons**:
  1. **"Subscribe Now"**:
     - Calls `createCheckoutSession(requiredTier || 'pro')`.
     - Displays spinner: *"Connecting to Stripe..."*.
     - Redirects user to Stripe checkout URL (`window.location.href = data.url`).
  2. **"Activate Free Trial"**:
     - Calls `startTrial(requiredTier || 'pro')`.
     - Immediately persists `status: 'trialing'` in `localStorage`.
     - Re-renders `SubscriptionGate` seamlessly into the unlocked clinical workspace.
  3. **"View All Plans"**:
     - `<NavLink to="/dashboard/subscription">` allows viewing the full 3-tier commercial pricing table.

### 1.3 Concrete Code Specification: `src/components/guards/SubscriptionGate.tsx`

```tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  useSubscription,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
} from '@/lib/subscription';
import {
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface SubscriptionGateProps {
  children?: React.ReactNode;
  requiredTier?: SubscriptionTier;
  featureName?: string;
  headline?: string;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  children,
  requiredTier = 'pro',
  featureName = 'Clinical Suite Feature',
  headline,
}) => {
  const {
    isSubscribed,
    status,
    tier,
    startTrial,
    createCheckoutSession,
  } = useSubscription();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const tierWeight: Record<SubscriptionTier, number> = {
    starter: 1,
    pro: 2,
    group: 3,
  };

  // Evaluation logic
  const hasAccess =
    isSubscribed &&
    (status === 'trialing' || tierWeight[tier] >= tierWeight[requiredTier]);

  // Seamless rendering when authorized
  if (hasAccess) {
    return children ? <>{children}</> : null;
  }

  const targetPlan = SUBSCRIPTION_PLANS[requiredTier] || SUBSCRIPTION_PLANS.pro;
  const isStarterUpgrade = isSubscribed && tier === 'starter' && requiredTier !== 'starter';

  const displayTitle =
    headline ||
    (requiredTier === 'pro'
      ? 'Clinician Pro Subscription Required'
      : `${targetPlan.name} Required`);

  const handleSubscribeNow = async () => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await createCheckoutSession(requiredTier, 'monthly');
      if (res.error) {
        setCheckoutError(res.error);
        setIsCheckingOut(false);
      } else if (res.url) {
        window.location.href = res.url;
      } else {
        setIsCheckingOut(false);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to initialize Stripe checkout');
      setIsCheckingOut(false);
    }
  };

  const handleActivateTrial = () => {
    startTrial(requiredTier);
  };

  return (
    <div
      data-testid="subscription-gate-lock"
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-indigo-100 shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Lock & Crown Icon */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100 relative">
            <Crown className="h-8 w-8 text-amber-200" />
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-indigo-700 border-2 border-white flex items-center justify-center text-white">
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {/* Badge indicator */}
          <span
            data-testid="subscription-gate-badge"
            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mb-3"
          >
            {isStarterUpgrade ? 'Tier Upgrade Required' : 'Subscription Required'}
          </span>

          {/* Headline */}
          <h2
            data-testid="subscription-gate-title"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-2"
          >
            {displayTitle}
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-md mx-auto">
            {isStarterUpgrade
              ? `You are currently on the Starter tier. Access to ${featureName} requires upgrading to ${targetPlan.name} or higher.`
              : `Access to ${featureName} is restricted to active subscribers. Choose a clinical plan to unlock uninterrupted access to charts, live AI acoustic diarization, and HIPAA safe harbor redaction.`}
          </p>

          {/* Checkout Error notification */}
          {checkoutError && (
            <div className="p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Feature highlights container */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left mb-6 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Included in {targetPlan.name}:</span>
            </div>
            {targetPlan.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Action Button Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Direct Stripe Checkout Trigger */}
            <button
              id="subscribe-now-btn"
              data-testid="subscribe-now-btn"
              type="button"
              disabled={isCheckingOut}
              onClick={handleSubscribeNow}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Connecting to Stripe...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 text-indigo-200" />
                  <span>Subscribe Now (${targetPlan.priceMonthly}/mo)</span>
                </>
              )}
            </button>

            {/* Instant Free Trial / Sandbox Bypass */}
            <button
              id="activate-trial-btn"
              data-testid="activate-trial-btn"
              type="button"
              onClick={handleActivateTrial}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4 text-slate-950" />
              <span>Activate Free Trial</span>
            </button>
          </div>

          {/* View All Plans Navigation */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Evaluating for your group clinic?</span>
            <NavLink
              to="/dashboard/subscription"
              data-testid="view-plans-link"
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Compare All 3 Tiers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
```

---

## 2. Component Blueprint: Sidebar & Header Tier Badges

### 2.1 Tier Badge Derivation Logic

The active tier badge text and visual treatment must reflect the clinician's real-time state:

```ts
export function getTierBadgeInfo(status: SubscriptionStatus, tier: SubscriptionTier) {
  if (status === 'trialing') {
    return {
      label: 'TRIAL',
      className: 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold',
      pillClass: 'bg-amber-500 text-slate-950',
    };
  }
  if (status === 'active') {
    switch (tier) {
      case 'starter':
        return {
          label: 'STARTER',
          className: 'bg-sky-100 text-sky-800 border-sky-300 font-extrabold',
          pillClass: 'bg-sky-600 text-white',
        };
      case 'pro':
        return {
          label: 'PRO CLINICIAN',
          className: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold',
          pillClass: 'bg-indigo-600 text-white',
        };
      case 'group':
        return {
          label: 'PRACTICE GROUP',
          className: 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold',
          pillClass: 'bg-purple-600 text-white',
        };
    }
  }
  return {
    label: 'UNSUBSCRIBED',
    className: 'bg-slate-100 text-slate-700 border-slate-300 font-bold',
    pillClass: 'bg-slate-500 text-white',
  };
}
```

### 2.2 Header Modifications (`src/components/layout/Header.tsx`)

In `Header.tsx`:
1. Import `useSubscription` from `@/lib/subscription`.
2. Compute `tierBadge = getTierBadgeInfo(status, tier)`.
3. Add a dedicated active tier badge in the top-right header action bar (between the HIPAA badge and Aura trigger):

```tsx
{/* Active Subscription Tier Badge */}
<NavLink
  to="/dashboard/subscription"
  data-testid="header-tier-badge"
  title={`Subscription: ${tierBadge.label} (Click to manage)`}
  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border shadow-2xs transition-all hover:opacity-90 ${tierBadge.className}`}
>
  <Crown className="h-3.5 w-3.5 text-amber-600 shrink-0" />
  <span>{tierBadge.label}</span>
</NavLink>
```

### 2.3 Sidebar Modifications (`src/components/layout/Sidebar.tsx`)

In `Sidebar.tsx`:
1. **Brand Header Badge**: Display `{tierBadge.label}` next to TheraFlow OS:
   ```tsx
   <div className="flex items-center gap-1.5">
     <span className="font-bold text-slate-900 tracking-tight text-base">TheraFlow</span>
     <span
       data-testid="sidebar-tier-badge"
       className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierBadge.className}`}
     >
       {tierBadge.label}
     </span>
   </div>
   ```

2. **Locked Tool Dynamic "Upgrade" Badge**:
   When on `starter` tier (or unsubscribed), determine if a tool is locked:
   ```ts
   const isToolLocked = (toolPath: string): boolean => {
     if (!isSubscribed) return true; // Unsubscribed: all clinical tools locked
     if (status === 'trialing') return false; // Trial has full access
     if (tier === 'starter') {
       // Starter tier unlocks EHR & PHI Scrubber; locks Aura and full Scribe
       return toolPath === '/dashboard/aura' || toolPath === '/dashboard/scribe';
     }
     return false;
   };
   ```
   When rendering `coreTools.map((tool) => ...)`:
   ```tsx
   {isToolLocked(tool.path) ? (
     <span
       data-testid={`tool-upgrade-badge-${tool.path.replace('/dashboard/', '')}`}
       className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
     >
       <Crown className="h-3 w-3 text-amber-600" />
       Upgrade
     </span>
   ) : (
     <span
       className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${tool.badgeClass}`}
     >
       {tool.pulse && (
         <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
       )}
       {tool.badge}
     </span>
   )}
   ```

3. **Active Subscription Card**:
   Update the subscription card at the bottom of the navigation:
   - Header badge shows `{tierBadge.label}`.
   - If unsubscribed, displays: *"Subscription inactive. Clinical tools are locked."* with an "Activate Plan" button.

---

## 3. Application Route Wiring (`src/App.tsx`)

In `src/App.tsx`, import `SubscriptionGate` and wrap the 4 clinical tool route elements:

```tsx
// Core Clinical Tool Workspaces wrapped with <SubscriptionGate>
<Route
  path="ehr/*"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Clinical EHR & Telehealth"
      headline="Clinical EHR Subscription Required"
    >
      <EhrWorkspace />
    </SubscriptionGate>
  }
/>
<Route
  path="scribe/*"
  element={
    <SubscriptionGate
      requiredTier="pro"
      featureName="Clinical AI Scribe v2"
      headline="Clinician Pro Subscription Required"
    >
      <ScribeWorkspace />
    </SubscriptionGate>
  }
/>
<Route
  path="aura/*"
  element={
    <SubscriptionGate
      requiredTier="pro"
      featureName="Aura Assistant Copilot"
      headline="Clinician Pro Subscription Required"
    >
      <AuraStudio />
    </SubscriptionGate>
  }
/>
<Route
  path="phi-scrubber/*"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="HIPAA PHI Scrubber"
      headline="PHI Scrubber Subscription Required"
    >
      <PhiScrubberView />
    </SubscriptionGate>
  }
/>
```

**Crucial Ungated Route**:
- `/dashboard/subscription` **MUST NOT** be wrapped in `<SubscriptionGate>`. Unsubscribed clinicians must always be able to access the pricing and checkout table to choose and purchase a subscription.

---

## 4. Verification Criteria & Automated Test Blueprint

### 4.1 Verification Strategy

Create a dedicated verification script: `scripts/verify-subscription-gate.mjs` (registered as `npm run test:subscription` or executed via `npx tsx scripts/verify-subscription-gate.mjs`).

The audit operates in a simulated DOM environment (`jsdom` + `tsx`) matching `scripts/verify-auth-redirect.mjs`.

### 4.2 Automated Test Suites

#### Test Suite 1: Unsubscribed Clinician Access Blocking (Zero ePHI Leak)
- **Preconditions**: Clinician is authenticated (valid `clinical_saas_session` for Dr. Sarah Chen, MD), but subscription is set to `status: 'none'`.
- **Target Routes**:
  - `/dashboard/ehr`
  - `/dashboard/scribe`
  - `/dashboard/aura`
  - `/dashboard/phi-scrubber`
- **Assertions**:
  - Lock container `[data-testid="subscription-gate-lock"]` is rendered in DOM.
  - Headline contains `"Subscription Required"` or `"Clinician Pro Subscription Required"`.
  - Buttons `#subscribe-now-btn` and `#activate-trial-btn` are present.
  - Confidential clinical data (`Jane Doe`, `Live Acoustic Transcript`, `18 Safe Harbor Redaction`, `#MC-88219`) is **100% absent** from DOM.

#### Test Suite 2: One-Click Free Trial Activation via Gate
- **Preconditions**: Clinician blocked at `/dashboard/scribe` with `status: 'none'`.
- **Action**: Simulate click on `#activate-trial-btn`.
- **Assertions**:
  - `localStorage.getItem('clinical_saas_subscription')` updates to `status: 'trialing'`.
  - Lock container disappears.
  - Clinical AI Scribe v2 workspace (`ScribeWorkspace`) immediately renders.
  - Header tier badge updates to `TRIAL`.

#### Test Suite 3: Starter Tier Gating vs Pro Gating
- **Preconditions**: Subscription set to `{ status: 'active', tier: 'starter' }`.
- **Assertions**:
  - `/dashboard/ehr`: Access granted (EhrWorkspace renders).
  - `/dashboard/phi-scrubber`: Access granted (PhiScrubberView renders).
  - `/dashboard/aura`: Access blocked; `<SubscriptionGate>` renders with *"Clinician Pro Subscription Required"*.
  - `/dashboard/scribe`: Access blocked; `<SubscriptionGate>` renders with *"Clinician Pro Subscription Required"*.
  - Sidebar renders `"Upgrade"` badge next to Aura and Scribe.
  - Header renders `STARTER` tier badge.

#### Test Suite 4: Header & Sidebar Tier Badge Display
- **Variations Tested**:
  - `status: 'none'` -> Badges render `UNSUBSCRIBED`.
  - `status: 'trialing'` -> Badges render `TRIAL`.
  - `status: 'active', tier: 'starter'` -> Badges render `STARTER`.
  - `status: 'active', tier: 'pro'` -> Badges render `PRO CLINICIAN`.
  - `status: 'active', tier: 'group'` -> Badges render `PRACTICE GROUP`.

#### Test Suite 5: Direct "Subscribe Now" Checkout Session Trigger
- **Action**: User on lock screen clicks `#subscribe-now-btn`.
- **Assertions**:
  - Invokes `POST /api/create-checkout-session` with the appropriate `planId`.
  - Button enters loading state with spinner text.
  - Responds with valid `url` / `sessionId` in test mode.

### 4.3 Test Script Skeleton: `scripts/verify-subscription-gate.mjs`

```js
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.env.__TSX_SUBSCRIPTION_RUNNER) {
  const result = spawnSync('npx', ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __TSX_SUBSCRIPTION_RUNNER: '1' },
  });
  process.exit(result.status ?? 0);
}

// ... Sets up JSDOM, populates DEMO_CLINICIAN_SESSION, and executes Suites 1-5 ...
```

---

## 5. Cross-Explorer Dependency Alignment

| Explorer | Scope | Integration Contract with Explorer 3 |
|---|---|---|
| **Explorer 1** (`server.ts`) | Stripe backend API (`POST /api/create-checkout-session`) | `SubscriptionGate`'s "Subscribe Now" button issues `POST /api/create-checkout-session` with `{ planId, billingCycle }` and redirects to returned `url`. |
| **Explorer 2** (`subscription.tsx` & `Subscription.tsx`) | `SubscriptionContext` & Pricing UI | Provides `useSubscription()` returning `{ status, tier, isSubscribed, startTrial, createCheckoutSession }`. `SubscriptionGate` directly triggers `startTrial` and `createCheckoutSession`. |
| **Explorer 3** (This Blueprint) | Access Gating (`SubscriptionGate`, `Sidebar`, `Header`, `App.tsx`, `scripts/verify-subscription-gate.mjs`) | Enforces route-level access blocks, renders lock overlay, updates UI tier badges, and provides the automated verification test suite. |

---

## 6. Implementation Checklist for Worker

1. [ ] Update `src/components/guards/SubscriptionGate.tsx` with the enhanced lock overlay, direct "Subscribe Now" Stripe checkout trigger, "Activate Free Trial" button, and test IDs.
2. [ ] Update `src/components/layout/Header.tsx` to import `useSubscription` and render the active tier badge (`STARTER`, `PRO CLINICIAN`, `PRACTICE GROUP`, or `TRIAL`).
3. [ ] Update `src/components/layout/Sidebar.tsx` to display active tier badge in brand header and render "Upgrade" badge next to locked tools for Starter tier or unsubscribed clinicians.
4. [ ] Update `src/App.tsx` to wrap the 4 clinical routes with `<SubscriptionGate>`.
5. [ ] Create `scripts/verify-subscription-gate.mjs` implementing the 5 automated verification test suites and add `"test:subscription"` to `package.json`.
6. [ ] Execute `npm run test:subscription` and `npm run test:auth` to verify 100% pass rate.
