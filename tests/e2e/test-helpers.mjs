/**
 * Shared Test Helpers & Harness for Clinical SaaS Platform E2E Tests
 */
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';

export const DEFAULT_TEST_PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 3899;
export const BASE_URL = `http://127.0.0.1:${DEFAULT_TEST_PORT}`;

// Intercept relative fetch calls in Node.js test environment
const _originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = `${BASE_URL}${input}`;
  }
  return _originalFetch(input, init);
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deterministic condition poller for asynchronous JSDOM state & route settlement.
 * Eliminates fixed-sleep race conditions by polling predicate every intervalMs up to timeoutMs.
 *
 * @param {() => boolean | Promise<boolean>} predicate - Function returning true when settled
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function waitFor(predicate, { timeoutMs = 2000, intervalMs = 30 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await predicate();
      if (res) return true;
    } catch {}
    await sleep(intervalMs);
  }
  try {
    return Boolean(await predicate());
  } catch {
    return false;
  }
}

let activeServerProcess = null;

let _fixtures = null;
export async function getFixtures() {
  if (_fixtures) return _fixtures;
  const React = (await import('react')).default;
  const ReactDOM = (await import('react-dom/client')).default;
  const { App } = await import('../../src/App');
  const {
    DEMO_CLINICIAN_USER,
    DEMO_CLINICIAN_SESSION,
    STORAGE_KEY_DEMO_SESSION,
  } = await import('../../src/lib/auth');
  const { SUBSCRIPTION_PLANS } = await import('../../src/lib/subscription');
  const { DEFAULT_PATIENT } = await import('../../src/lib/clinical-context');

  _fixtures = {
    React,
    ReactDOM,
    App,
    DEMO_CLINICIAN_USER,
    DEMO_CLINICIAN_SESSION,
    STORAGE_KEY_DEMO_SESSION,
    SUBSCRIPTION_PLANS,
    DEFAULT_PATIENT,
  };
  return _fixtures;
}

/**
 * Start Express test server on ephemeral port
 */
export async function startTestServer(port = DEFAULT_TEST_PORT) {
  if (activeServerProcess) {
    return { process: activeServerProcess, url: BASE_URL };
  }

  // Check if server is already running on this port
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(500) });
    if (res.ok) {
      return { process: null, url: `http://127.0.0.1:${port}` };
    }
  } catch {}

  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      APP_URL: `http://127.0.0.1:${port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverReady = false;
  let serverLogs = '';

  serverProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    serverLogs += text;
    if (text.includes(`running on http://localhost:${port}`) || text.includes(`running on http://0.0.0.0:${port}`)) {
      serverReady = true;
    }
  });

  serverProcess.stderr?.on('data', (chunk) => {
    serverLogs += chunk.toString();
  });

  const start = Date.now();
  while (!serverReady && Date.now() - start < 10000) {
    await sleep(100);
    if (serverProcess.exitCode !== null) {
      throw new Error(`Server exited with code ${serverProcess.exitCode}:\n${serverLogs}`);
    }
  }

  if (!serverReady) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start within 10s:\n${serverLogs}`);
  }

  activeServerProcess = serverProcess;
  return { process: serverProcess, url: `http://127.0.0.1:${port}` };
}

/**
 * Terminate active server
 */
export async function stopTestServer() {
  if (activeServerProcess) {
    activeServerProcess.kill('SIGTERM');
    await sleep(300);
    if (activeServerProcess.exitCode === null) {
      activeServerProcess.kill('SIGKILL');
    }
    activeServerProcess = null;
  }
}

/**
 * Configure global JSDOM environment
 */
export function setupGlobals(dom) {
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.location = dom.window.location;
  global.HTMLElement = dom.window.HTMLElement;
  if (!dom.window.requestAnimationFrame) {
    dom.window.requestAnimationFrame = (cb) => {
      const t = setTimeout(() => cb(Date.now()), 16);
      if (t && typeof t.unref === 'function') t.unref();
      return t;
    };
    dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  global.requestAnimationFrame = dom.window.requestAnimationFrame;
  global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
}

/**
 * Render App into JSDOM with specified route and session
 */
export async function renderApp({
  route = '/',
  authenticated = false,
  extraStorage = {},
  settleMs = 100,
} = {}) {
  const { React, ReactDOM, App, DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } =
    await getFixtures();

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: `http://localhost:3000${route}`,
    runScripts: 'dangerously',
  });

  setupGlobals(dom);
  dom.window.localStorage.clear();

  if (authenticated) {
    dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: DEMO_CLINICIAN_SESSION,
      })
    );
  }

  for (const [key, value] of Object.entries(extraStorage)) {
    dom.window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  const rootElement = dom.window.document.getElementById('root');
  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(App));

  await sleep(settleMs);

  return {
    dom,
    rootElement,
    root,
    getHtml: () => rootElement.innerHTML,
    getPathname: () => dom.window.location.pathname,
    getSearch: () => dom.window.location.search,
    getFullPath: () => `${dom.window.location.pathname}${dom.window.location.search}`,
    unmount: () => {
      try {
        root.unmount();
      } catch {}
    },
  };
}

/**
 * Test result accumulator and formatter
 */
export class TestReporter {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  record({ name, passed, details = '', error = null }) {
    this.results.push({ name, passed, details, error });
    const icon = passed ? '✓ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${name}`);
    if (details) {
      console.log(`    ↳ ${details}`);
    }
    if (error) {
      console.error(`    ↳ Error: ${error.message || String(error)}`);
    }
  }

  summary() {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n--------------------------------------------------------------------');
    console.log(`  ${this.suiteName} Summary`);
    console.log(`  Passed: ${passed} | Failed: ${failed} | Total: ${this.results.length} (${duration}s)`);
    console.log('--------------------------------------------------------------------\n');

    return { passed, failed, total: this.results.length, duration };
  }
}
