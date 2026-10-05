import React, { useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import {
  useSubscription,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  BillingCycle,
} from '@/lib/subscription';
import {
  Crown,
  Check,
  Zap,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const Subscription: React.FC = () => {
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status');
  const sessionId = searchParams.get('session_id');

  const {
    tier: activeTier,
    status: subStatus,
    billingCycle,
    planName,
    isSubscribed,
    renewsOn,
    trialDaysRemaining,
    subscribe,
    startTrial,
    cancelSubscription,
    resetSubscription,
    setBillingCycle,
    updateTier,
  } = useSubscription();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSelectPlan = async (planId: SubscriptionTier) => {
    setLoadingPlan(planId);
    setCheckoutMessage(null);
    try {
      const res = await subscribe(planId, billingCycle);
      if (res.error) {
        setCheckoutMessage(`Error: ${res.error}`);
      } else if (res.url) {
        setCheckoutMessage(`Redirecting to Stripe Checkout session: ${res.sessionId || ''}`);
        window.location.href = res.url;
      }
    } catch (err: any) {
      setCheckoutMessage(`Checkout error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  const statusLabel =
    subStatus === 'trialing'
      ? `Trial (${trialDaysRemaining}d left)`
      : subStatus === 'active'
      ? 'Active'
      : subStatus === 'canceled'
      ? 'Canceled'
      : 'No Active Subscription';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Return Banner on Stripe Checkout Success */}
      {checkoutStatus === 'success' && !bannerDismissed && (
        <div
          id="stripe-checkout-success-banner"
          data-testid="stripe-checkout-success-banner"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-sm">Subscription Activated Successfully!</div>
              <div className="text-xs text-emerald-700">
                Welcome to {planName}. All 4 clinical tools are unlocked for your practice.
                {sessionId && (
                  <span className="font-mono ml-1.5 opacity-90 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                    ({sessionId.substring(0, 20)}...)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <NavLink
              to="/dashboard/scribe"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Launch AI Scribe →
            </NavLink>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-xs text-emerald-700 hover:text-emerald-900 underline px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Return Banner on Stripe Checkout Canceled */}
      {checkoutStatus === 'canceled' && !bannerDismissed && (
        <div
          data-testid="stripe-checkout-canceled-banner"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Checkout Canceled.</span> No payment was processed. You can review the plans below and activate whenever ready.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-xs text-amber-800 hover:text-amber-950 underline px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {checkoutMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>{checkoutMessage}</span>
        </div>
      )}

      {/* Header & Active Plan Status Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Practice Subscription &amp; Billing
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your plan, clinical licenses, and Stripe test billing integration.
          </p>
        </div>

        {/* Current Status Pill */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>{isSubscribed ? planName : 'No Active Plan'}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isSubscribed
                      ? subStatus === 'trialing'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {isSubscribed && renewsOn
                  ? `Renews on ${new Date(renewsOn).toLocaleDateString()}`
                  : isSubscribed
                  ? 'Active clinical license'
                  : 'Clinical tools locked'}
              </div>
            </div>
          </div>
          {isSubscribed && (
            <button
              type="button"
              id="cancel-subscription-btn"
              data-testid="cancel-subscription-btn"
              onClick={() => cancelSubscription()}
              className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Cancel Subscription</span>
            </button>
          )}
        </div>
      </div>

      {/* Billing Cycle Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            data-testid="billing-cycle-toggle-monthly"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            data-testid="billing-cycle-toggle-annual"
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* 3-Tier Pricing Table (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionTier[]).map((planKey) => {
          const plan = SUBSCRIPTION_PLANS[planKey];
          const isCurrent = activeTier === planKey && isSubscribed;
          const isPro = planKey === 'pro';
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={planKey}
              data-testid={`plan-card-${planKey}`}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                isPro
                  ? 'bg-indigo-900 text-white border-2 border-indigo-500 shadow-xl relative md:-translate-y-2'
                  : 'bg-white border border-slate-200 shadow-sm text-slate-900'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                  Most Popular • All 4 Tools Unlocked
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isPro ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {plan.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      Current Plan
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${price}</span>
                  <span className={`text-sm ${isPro ? 'text-indigo-200' : 'text-slate-500'}`}>
                    / month
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <div className={`text-[11px] mb-3 font-medium ${isPro ? 'text-indigo-300' : 'text-emerald-700'}`}>
                    Billed annually (${price * 12}/yr) — 20% discount applied
                  </div>
                )}

                <p className={`text-xs mb-6 ${isPro ? 'text-indigo-100' : 'text-slate-600'}`}>
                  {plan.description}
                </p>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs font-medium">
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                          isPro ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span className={isPro ? 'text-indigo-50' : 'text-slate-700'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div
                    className={`w-full py-3 text-center rounded-xl font-bold text-xs ${
                      isPro ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Active Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid={`subscribe-btn-${planKey}`}
                    disabled={loadingPlan !== null}
                    onClick={() => handleSelectPlan(planKey)}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 ${
                      isPro
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {loadingPlan === planKey ? 'Connecting Stripe...' : `Upgrade to ${plan.name}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Developer Sandbox & Auditor Mode (Test Mode) */}
      <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-indigo-600" />
            <span>Developer &amp; Auditor Sandbox Mode (Instant Test Bypass)</span>
          </div>
          <p className="text-xs text-slate-600 max-w-xl">
            Evaluating without a live Stripe secret key? Instantly activate a 14-day Pro trial, switch between tiers, or simulate an unsubscribed state to verify access gating:
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="unlock-trial-btn"
            data-testid="unlock-trial-btn"
            onClick={() => startTrial('pro')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Unlock Instant 14-Day Trial (Test Mode)</span>
          </button>
          <button
            type="button"
            id="simulate-unsubscribed-btn"
            data-testid="simulate-unsubscribed-btn"
            onClick={() => resetSubscription()}
            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Lock className="h-3.5 w-3.5 text-rose-600" />
            <span>Simulate Unsubscribed (Lockout Test)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              updateTier('starter');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Set Starter ($49)
          </button>
          <button
            type="button"
            onClick={() => {
              updateTier('pro');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
          >
            Set Pro ($99)
          </button>
          <button
            type="button"
            onClick={() => {
              updateTier('group');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 cursor-pointer"
          >
            Set Group ($249)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
