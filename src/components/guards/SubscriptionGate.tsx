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
    trialDaysRemaining,
    renewsOn,
    startTrial,
    subscribe,
    createCheckoutSession,
  } = useSubscription();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const tierWeight: Record<SubscriptionTier, number> = {
    starter: 1,
    pro: 2,
    group: 3,
  };

  const isTrialExpired =
    status === 'trialing' &&
    ((typeof trialDaysRemaining === 'number' && trialDaysRemaining <= 0) ||
      Boolean(renewsOn && new Date(renewsOn).getTime() <= Date.now()));

  // Access evaluation: active or trialing, with sufficient tier hierarchy
  const hasAccess =
    isSubscribed &&
    !isTrialExpired &&
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
      const checkoutFn = subscribe || createCheckoutSession;
      const res = await checkoutFn(requiredTier, 'monthly');
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
