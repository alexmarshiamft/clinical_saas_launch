// scripts/verify-css-bleed.mjs
// Automated verification for Feature 18 & Feature 22: Zero CSS Bleed
import fs from 'node:fs';
import path from 'node:path';

const stylesheets = [
  { path: 'src/tools/scribe/scribe-theme.css', name: 'scribe-theme.css' },
  { path: 'src/tools/aura/aura-shadow.css', name: 'aura-shadow.css' },
];

const forbiddenGlobalSelectors = [
  /^\s*\*\s*\{/,
  /^\s*html\b/,
  /^\s*body\b/,
  /^\s*#root\b/,
  /^\s*\.btn\b/,
  /^\s*\.badge\b/,
  /html.*body.*overflow:\s*hidden/i,
];

let totalViolations = 0;

for (const sheet of stylesheets) {
  const cssPath = path.resolve(sheet.path);
  if (!fs.existsSync(cssPath)) {
    console.error(`❌ [FAIL] Missing stylesheet: ${cssPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(cssPath, 'utf-8');
  const lines = content.split('\n');
  let sheetViolations = 0;

  lines.forEach((line, idx) => {
    const cleanLine = line.split('/*')[0].trim();
    if (!cleanLine) return;

    for (const pattern of forbiddenGlobalSelectors) {
      if (pattern.test(cleanLine)) {
        console.error(`[CSS Bleed Violation in ${sheet.name}] Line ${idx + 1}: "${cleanLine}" violates containment.`);
        sheetViolations++;
      }
    }
  });

  if (sheetViolations === 0) {
    console.log(`✓ [PASS] Zero CSS bleed detected in ${sheet.name}. Scoping strictly preserved.`);
  } else {
    console.error(`❌ [FAIL] ${sheetViolations} CSS bleed violations detected in ${sheet.name}.`);
    totalViolations += sheetViolations;
  }
}

if (totalViolations === 0) {
  console.log('✓ [PASS] All stylesheets passed zero CSS bleed verification.');
  process.exit(0);
} else {
  console.error(`❌ [FAIL] Total ${totalViolations} CSS bleed violations detected.`);
  process.exit(1);
}
