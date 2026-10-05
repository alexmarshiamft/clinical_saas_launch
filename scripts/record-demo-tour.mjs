import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const VERCEL_URL = process.env.TARGET_URL || 'https://clinicalsaaslaunch.vercel.app';
const OUTPUT_DIR = path.resolve(process.cwd(), 'videos');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('====================================================================');
console.log('  Clinical SaaS Platform — Automated Full-Feature Video Tour');
console.log(`  Target URL: ${VERCEL_URL}`);
console.log(`  Video Output Directory: ${OUTPUT_DIR}`);
console.log('====================================================================\n');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTour() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ========================================================================
    // 1. LANDING PAGE
    // ========================================================================
    console.log('[1/7] Navigating to Landing Page...');
    await page.goto(VERCEL_URL, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Scroll down to showcase hero and disclaimers
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(1500);

    // Open Feature Guide modal from Landing navbar
    console.log('  -> Opening Feature Guide Modal from navbar...');
    const guideBtn = page.locator('button:has-text("Feature Guide")').first();
    if (await guideBtn.isVisible()) {
      await guideBtn.click();
      await sleep(1500);

      // Walk through Tab 1: Interactive Clinical Journey
      console.log('  -> Walking through Interactive Clinical Journey steps...');
      for (let step = 1; step <= 6; step++) {
        const stepBtn = page.locator(`button:has-text("Step ${step}")`).first();
        if (await stepBtn.isVisible()) {
          await stepBtn.click();
          await sleep(1000);
        }
      }

      // Switch to Tab 2: Feature Catalog
      console.log('  -> Viewing Feature Catalog tab...');
      const catalogTab = page.locator('button:has-text("Feature Catalog")').first();
      if (await catalogTab.isVisible()) {
        await catalogTab.click();
        await sleep(1500);
      }

      // Switch to Tab 3: Live Sandbox & Tiers
      console.log('  -> Viewing Sandbox & Tiers tab...');
      const sandboxTab = page.locator('button:has-text("Live Sandbox")').first();
      if (await sandboxTab.isVisible()) {
        await sandboxTab.click();
        await sleep(1000);
        const proBtn = page.locator('text=Clinician Pro (Flagship)').first();
        if (await proBtn.isVisible()) await proBtn.click();
        await sleep(800);
      }

      // Switch to Tab 4: Compliance Spec
      console.log('  -> Viewing HIPAA 18 Safe Harbor tab...');
      const complianceTab = page.locator('button:has-text("HIPAA 18 Safe Harbor")').first();
      if (await complianceTab.isVisible()) {
        await complianceTab.click();
        await sleep(1500);
      }

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close guide"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await sleep(1000);
      }
    }

    // Toggle Landing Page tool preview tabs
    console.log('  -> Interacting with landing page tool preview tabs...');
    for (const tabName of ['Clinical AI Scribe v2', 'Aura Assistant', 'HIPAA PHI Scrubber', 'Clinical EHR & Telehealth']) {
      const tab = page.locator(`button:has-text("${tabName}")`).first();
      if (await tab.isVisible()) {
        await tab.click();
        await sleep(1000);
      }
    }

    // Scroll to footer to highlight legal disclaimer
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(1000);

    // Click Instant Demo to enter Dashboard
    console.log('  -> Launching Instant Demo Clinician session...');
    const instantDemoBtn = page.locator('button:has-text("Launch Demo Clinician")').first();
    if (await instantDemoBtn.isVisible()) {
      await instantDemoBtn.click();
    } else {
      const topDemoBtn = page.locator('button:has-text("Instant Demo")').first();
      if (await topDemoBtn.isVisible()) await topDemoBtn.click();
    }
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await sleep(2500);

    // ========================================================================
    // 2. COMMAND CENTER DASHBOARD
    // ========================================================================
    console.log('[2/7] Exploring Command Center Dashboard (/dashboard)...');
    // Hover on Demo banner
    await page.evaluate(() => window.scrollBy({ top: 150, behavior: 'smooth' }));
    await sleep(1500);

    // Header interaction: Practice switcher
    console.log('  -> Interacting with Header Practice menu...');
    const practiceBtn = page.locator('header button:has-text("Bay Area")').first();
    if (await practiceBtn.isVisible()) {
      await practiceBtn.click();
      await sleep(1000);
      await practiceBtn.click();
      await sleep(500);
    }

    // Header interaction: Active Patient switcher
    console.log('  -> Interacting with Header Active Patient menu...');
    const patientBar = page.locator('header').getByText('Jane Doe').first();
    if (await patientBar.isVisible()) {
      await patientBar.click();
      await sleep(1200);
      const marcusBtn = page.getByText('Marcus Vance').first();
      if (await marcusBtn.isVisible()) {
        await marcusBtn.click();
        await sleep(1200);
      }
    }

    // Header interaction: Demo Guide button
    console.log('  -> Triggering Header Demo Guide button...');
    const headerGuideBtn = page.locator('[data-testid="header-demo-guide-btn"]').first();
    if (await headerGuideBtn.isVisible()) {
      await headerGuideBtn.click();
      await sleep(1500);
      const closeGuideModal = page.locator('button[aria-label="Close guide"]').first();
      if (await closeGuideModal.isVisible()) await closeGuideModal.click();
      await sleep(1000);
    }

    // ========================================================================
    // 3. THERAPIST EHR & TELEHEALTH (/dashboard/ehr)
    // ========================================================================
    console.log('[3/7] Exploring TheraFlow Clinical EHR Suite (/dashboard/ehr)...');
    await page.goto(`${VERCEL_URL}/dashboard/ehr`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Search client
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Jane');
      await sleep(1000);
      await searchInput.fill('');
      await sleep(800);
    }

    // Open Jane Doe profile
    const janeCard = page.locator('text=Jane Doe').first();
    if (await janeCard.isVisible()) {
      await janeCard.click();
      await sleep(2000);
      // Return to roster
      const backBtn = page.locator('button:has-text("Back")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await sleep(1000);
      }
    }

    // Switch to Calendar tab
    console.log('  -> Visiting Calendar tab...');
    await page.goto(`${VERCEL_URL}/dashboard/calendar`, { waitUntil: 'networkidle' });
    await sleep(2000);
    const weekBtn = page.locator('button:has-text("Week")').first();
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await sleep(1500);
    }
    const monthBtn = page.locator('button:has-text("Month")').first();
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
      await sleep(1200);
    }

    // Switch to Telehealth Room
    console.log('  -> Visiting Telehealth Room (/dashboard/telehealth)...');
    await page.goto(`${VERCEL_URL}/dashboard/telehealth`, { waitUntil: 'networkidle' });
    await sleep(2500);
    const muteBtn = page.locator('button[title*="Mute"], button[aria-label*="Mute"]').first();
    if (await muteBtn.isVisible()) {
      await muteBtn.click();
      await sleep(800);
      await muteBtn.click();
      await sleep(800);
    }

    // Switch to Billing & Claims
    console.log('  -> Visiting Billing & Claims (/dashboard/billing)...');
    await page.goto(`${VERCEL_URL}/dashboard/billing`, { waitUntil: 'networkidle' });
    await sleep(2000);
    const superbillBtn = page.locator('button:has-text("Superbill"), button:has-text("CMS-1500")').first();
    if (await superbillBtn.isVisible()) {
      await superbillBtn.click();
      await sleep(2000);
      const closeSuperbill = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeSuperbill.isVisible()) {
        await closeSuperbill.click();
        await sleep(1000);
      }
    }

    // Switch to HIPAA Audit Logs
    console.log('  -> Visiting HIPAA Audit Logs (/dashboard/audit-logs)...');
    await page.goto(`${VERCEL_URL}/dashboard/audit-logs`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await sleep(1500);

    // ========================================================================
    // 4. CLINICAL AI SCRIBE V2 (/dashboard/scribe)
    // ========================================================================
    console.log('[4/7] Exploring Clinical AI Scribe v2 (/dashboard/scribe)...');
    await page.goto(`${VERCEL_URL}/dashboard/scribe`, { waitUntil: 'networkidle' });
    await sleep(2500);

    // Toggle template selector
    console.log('  -> Testing Scribe templates...');
    for (const template of ['SOAP Note', 'Intake H&P', 'Specialist Referral']) {
      const tmplBtn = page.locator(`button:has-text("${template}")`).first();
      if (await tmplBtn.isVisible()) {
        await tmplBtn.click();
        await sleep(1000);
      }
    }

    // Click Template Studio
    const studioTab = page.locator('button:has-text("Template Studio")').first();
    if (await studioTab.isVisible()) {
      await studioTab.click();
      await sleep(2000);
      const liveScribeTab = page.locator('button:has-text("Live Scribe")').first();
      if (await liveScribeTab.isVisible()) {
        await liveScribeTab.click();
        await sleep(1200);
      }
    }

    // Test EHR Export options
    const epicBtn = page.locator('button:has-text("Epic")').first();
    if (await epicBtn.isVisible()) {
      await epicBtn.click();
      await sleep(800);
    }
    const cernerBtn = page.locator('button:has-text("Cerner")').first();
    if (await cernerBtn.isVisible()) {
      await cernerBtn.click();
      await sleep(800);
    }

    // ========================================================================
    // 5. AURA ASSISTANT COPILOT (/dashboard/aura)
    // ========================================================================
    console.log('[5/7] Exploring Aura Assistant Copilot (/dashboard/aura)...');
    await page.goto(`${VERCEL_URL}/dashboard/aura`, { waitUntil: 'networkidle' });
    await sleep(2500);

    // Search DSM-5 database
    const dsmSearch = page.locator('input[placeholder*="DSM-5"], input[placeholder*="diagnosis"]').first();
    if (await dsmSearch.isVisible()) {
      await dsmSearch.fill('Anxiety');
      await sleep(1500);
    }

    // Typewriter SOAP generation simulation
    const generateBtn = page.locator('button:has-text("Generate SOAP"), button:has-text("Formulate Note")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await sleep(3000);
    }

    // Toggle floating action orb
    console.log('  -> Interacting with Floating Aura Orb...');
    const floatingOrb = page.locator('button[title*="Aura"], div[class*="orb"]').last();
    if (await floatingOrb.isVisible()) {
      await floatingOrb.click();
      await sleep(1500);
      await floatingOrb.click();
      await sleep(800);
    }

    // ========================================================================
    // 6. HIPAA PHI SCRUBBER (/dashboard/phi-scrubber)
    // ========================================================================
    console.log('[6/7] Exploring HIPAA PHI Scrubber (/dashboard/phi-scrubber)...');
    await page.goto(`${VERCEL_URL}/dashboard/phi-scrubber`, { waitUntil: 'networkidle' });
    await sleep(2500);

    // Toggle masking styles
    console.log('  -> Toggling masking styles (Tags, Block, Asterisks)...');
    const tagMask = page.locator('button:has-text("Tag"), button:has-text("[TAG]")').first();
    if (await tagMask.isVisible()) {
      await tagMask.click();
      await sleep(1000);
    }
    const blockMask = page.locator('button:has-text("Block"), button:has-text("████")').first();
    if (await blockMask.isVisible()) {
      await blockMask.click();
      await sleep(1000);
    }
    const asteriskMask = page.locator('button:has-text("Asterisk"), button:has-text("***")').first();
    if (await asteriskMask.isVisible()) {
      await asteriskMask.click();
      await sleep(1000);
    }

    // Scroll to Forensic Audit Table
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(2000);

    // ========================================================================
    // 7. SUBSCRIPTION & BILLING (/dashboard/subscription)
    // ========================================================================
    console.log('[7/7] Exploring Subscription & Commercial Billing (/dashboard/subscription)...');
    await page.goto(`${VERCEL_URL}/dashboard/subscription`, { waitUntil: 'networkidle' });
    await sleep(2500);

    // Toggle annual billing
    console.log('  -> Toggling Monthly / Annual billing switch...');
    const annualToggle = page.locator('button:has-text("Annual")').first();
    if (await annualToggle.isVisible()) {
      await annualToggle.click();
      await sleep(1500);
      await annualToggle.click();
      await sleep(1000);
    }

    // Conclude back at Dashboard
    console.log('  -> Returning to Command Center to conclude tour...');
    await page.goto(`${VERCEL_URL}/dashboard`, { waitUntil: 'networkidle' });
    await sleep(3000);

    console.log('\n✓ Interactive demonstration tour completed successfully!');
  } catch (error) {
    console.error('Error during demo tour recording:', error);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      console.log(`\nRaw video recorded at: ${videoPath}`);

      const finalWebm = path.join(OUTPUT_DIR, 'vercel_clinical_saas_demo.webm');
      const finalMp4 = path.join(OUTPUT_DIR, 'vercel_clinical_saas_demo.mp4');

      fs.copyFileSync(videoPath, finalWebm);
      console.log(`Saved WebM video to: ${finalWebm}`);

      try {
        console.log('Converting to MP4 format with ffmpeg...');
        execSync(`ffmpeg -y -i "${finalWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast "${finalMp4}"`, {
          stdio: 'inherit',
        });
        console.log(`✓ High-compatibility MP4 video created at: ${finalMp4}`);
      } catch (err) {
        console.warn('ffmpeg conversion warning:', err.message);
      }
    }
  }
}

runTour();
