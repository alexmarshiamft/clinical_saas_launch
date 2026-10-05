import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const VERCEL_URL = process.env.TARGET_URL || 'https://clinicalsaaslaunch.vercel.app';
const SCREENSHOT_DIR = path.resolve('screenshots');
const ARTIFACT_DIR = '/Users/alexandermarshi/.gemini/antigravity-ide/brain/a81f747e-6c5b-4196-8698-c13ba9726836';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureScreenshots() {
  console.log(`Starting automated screenshot capture on ${VERCEL_URL}...`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Crisp Retina resolution
  });

  const page = await context.newPage();

  const take = async (name, fullPage = false) => {
    const filename = `${name}.png`;
    const localPath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: localPath, fullPage });
    console.log(`✓ Saved screenshot: ${filename}`);

    if (fs.existsSync(ARTIFACT_DIR)) {
      const artifactPath = path.join(ARTIFACT_DIR, filename);
      fs.copyFileSync(localPath, artifactPath);
    }
  };

  try {
    // 1. Landing Page
    console.log('Capturing Landing Page...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    await take('01_landing_page');

    // 2. Demo Guide Modal
    console.log('Capturing Demo Guide Modal...');
    const guideBtn = page.getByRole('button', { name: /feature guide/i }).or(page.getByText('Demo Guide')).first();
    if (await guideBtn.isVisible()) {
      await guideBtn.click();
      await sleep(1500);
      await take('02_demo_guide_modal');
      await page.keyboard.press('Escape');
      await sleep(1000);
    }

    // Enter Demo Mode
    console.log('Entering demo clinician session...');
    const instantDemoBtn = page.locator('button:has-text("Launch Demo Clinician")').or(page.locator('button:has-text("Instant Demo")')).first();
    if (await instantDemoBtn.isVisible()) {
      await instantDemoBtn.click();
    }
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await sleep(2500);

    // 3. Command Center Dashboard
    console.log('Capturing Command Center Dashboard...');
    await take('03_dashboard_command_center');

    // 4. TheraFlow EHR Client Roster
    console.log('Capturing TheraFlow EHR Client Roster...');
    await page.goto(`${VERCEL_URL}/dashboard/ehr`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await take('04_theraflow_ehr_clients');

    // 5. TheraFlow EHR Client Detail (Jane Doe)
    console.log('Capturing TheraFlow Client Detail Chart...');
    const janeCard = page.getByText('Jane Doe').first();
    if (await janeCard.isVisible()) {
      await janeCard.click();
      await sleep(2000);
      await take('05_theraflow_client_chart');
    }

    // 6. Calendar & Scheduling
    console.log('Capturing Clinical Scheduling Calendar...');
    await page.goto(`${VERCEL_URL}/dashboard/calendar`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await take('06_clinical_calendar');

    // 7. Telehealth Video Room
    console.log('Capturing Telehealth Video Room...');
    await page.goto(`${VERCEL_URL}/dashboard/telehealth`, { waitUntil: 'networkidle' });
    await sleep(2500);
    await take('07_telehealth_room');

    // 8. Billing & CMS-1500 Superbill
    console.log('Capturing Billing & Superbills...');
    await page.goto(`${VERCEL_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await take('08_billing_and_claims');

    const superbillBtn = page.locator('button:has-text("Superbill"), button:has-text("CMS-1500")').first();
    if (await superbillBtn.isVisible()) {
      await superbillBtn.click();
      await sleep(1500);
      await take('09_cms1500_superbill_modal');
      const closeSuperbill = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeSuperbill.isVisible()) {
        await closeSuperbill.click({ force: true }).catch(() => page.keyboard.press('Escape'));
      } else {
        await page.keyboard.press('Escape');
      }
      await sleep(1000);
    }

    // 9. HIPAA Audit Logs
    console.log('Capturing HIPAA Audit Logs...');
    await page.goto(`${VERCEL_URL}/dashboard/audit-logs`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await take('10_hipaa_audit_logs');

    // 10. Clinical AI Scribe v2 Live
    console.log('Capturing Clinical AI Scribe v2 Live...');
    await page.goto(`${VERCEL_URL}/dashboard/scribe`, { waitUntil: 'networkidle' });
    await sleep(2500);
    await take('11_clinical_ai_scribe_live');

    // 11. Clinical AI Scribe Template Studio
    console.log('Capturing Clinical AI Scribe Template Studio...');
    const studioTab = page.locator('button:has-text("Template Studio")').first();
    if (await studioTab.isVisible()) {
      await studioTab.click();
      await sleep(1500);
      await take('12_clinical_ai_scribe_studio');
    }

    // 12. Aura Assistant Copilot
    console.log('Capturing Aura Assistant Copilot...');
    await page.goto(`${VERCEL_URL}/dashboard/aura`, { waitUntil: 'networkidle' });
    await sleep(2500);
    const dsmSearch = page.locator('input[placeholder*="DSM-5"], input[placeholder*="diagnosis"]').first();
    if (await dsmSearch.isVisible()) {
      await dsmSearch.fill('Anxiety');
      await sleep(1000);
    }
    await take('13_aura_assistant_copilot');

    // 13. HIPAA PHI Scrubber
    console.log('Capturing HIPAA PHI Scrubber...');
    await page.goto(`${VERCEL_URL}/dashboard/phi-scrubber`, { waitUntil: 'networkidle' });
    await sleep(2500);
    await take('14_hipaa_phi_scrubber');

    // 14. Subscription & Pricing
    console.log('Capturing Subscription & Commercial Billing...');
    await page.goto(`${VERCEL_URL}/dashboard/subscription`, { waitUntil: 'networkidle' });
    await sleep(2500);
    await take('15_subscription_pricing');

    console.log('\n✓ All 15 platform screenshots captured successfully in Retina quality!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await context.close();
    await browser.close();
  }
}

captureScreenshots();
