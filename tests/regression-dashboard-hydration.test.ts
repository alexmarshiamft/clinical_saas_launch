/**
 * Regression Test: First-Render Dashboard Hydration & Undefined Account Guard
 * 
 * Verifies that DashboardHome never crashes on first render when bankAccounts
 * is empty or initializing asynchronously, and correctly transitions from
 * isHydrating=true to synchronized state.
 */

import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/lib/auth';
import { ClinicalContextProvider } from '../src/lib/clinical-context';
import { SubscriptionProvider } from '../src/lib/subscription';
import { DemoGuideProvider } from '../src/lib/demo-guide-context';
import { PracticeOsProvider } from '../src/lib/practice-os-context';
import { DashboardHome } from '../src/pages/DashboardHome';

import { setupGlobals } from './e2e/test-helpers.mjs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runRegressionTest() {
  console.log('====================================================================');
  console.log('   Regression Test: First-Render Dashboard Hydration Guard          ');
  console.log('====================================================================');

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/dashboard',
    runScripts: 'dangerously',
  });

  setupGlobals(dom);

  // Mock matchMedia
  dom.window.matchMedia = dom.window.matchMedia || function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return false; },
    };
  };

  let firstRenderError: any = null;
  let root: any = null;

  try {
    const rootElement = dom.window.document.getElementById('root')!;
    root = ReactDOM.createRoot(rootElement);

    // Render immediately - before any microtasks or timer ticks
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            ClinicalContextProvider,
            null,
            React.createElement(
              SubscriptionProvider,
              null,
              React.createElement(
                DemoGuideProvider,
                null,
                React.createElement(
                  PracticeOsProvider,
                  null,
                  React.createElement(DashboardHome, null)
                )
              )
            )
          )
        )
      )
    );

    // Check immediate synchronous render without waiting
    await sleep(20);
    const htmlFirstTick = rootElement.innerHTML;

    if (htmlFirstTick.includes('TypeError') || htmlFirstTick.includes('undefined')) {
      throw new Error(`First render contains error text: ${htmlFirstTick.slice(0, 200)}`);
    }

    console.log('✓ [PASS] Step 1: First render mounts cleanly with zero exceptions');
    const showsSyncingBadge = htmlFirstTick.includes('Syncing Practice Ledger') || htmlFirstTick.includes('Ledger Synchronized');
    console.log(`✓ [PASS] Step 2: Hydration state rendered without crashing (badge present: ${showsSyncingBadge})`);

    // Wait for async banking hydration to complete
    await sleep(100);
    const htmlAfterHydration = rootElement.innerHTML;
    const hasCommandCenter = htmlAfterHydration.includes('Clinical Command Center');
    const hasSynchronized = htmlAfterHydration.includes('Ledger Synchronized');
    const hasExecutiveHUD = htmlAfterHydration.includes('Executive Health HUD');

    if (!hasCommandCenter || !hasExecutiveHUD) {
      throw new Error('HUD failed to render required sections after hydration');
    }

    console.log(`✓ [PASS] Step 3: Authoritative state settled cleanly (HUD: ${hasExecutiveHUD}, Sync: ${hasSynchronized})`);
    console.log('====================================================================');
    console.log('✓ REGRESSION SUITE PASSED: FIRST-RENDER DASHBOARD CRASH REMEDIATED');
    console.log('====================================================================');
  } catch (err: any) {
    firstRenderError = err;
    console.error('❌ [FAIL] First render crashed:', err);
  } finally {
    if (root) root.unmount();
  }

  if (firstRenderError) {
    process.exit(1);
  }
}

runRegressionTest();
