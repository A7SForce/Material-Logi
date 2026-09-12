/**
 * shoot.mjs — redesign screenshot evidence (Phase 0 before / Phase 3 after).
 * Usage: node docs/redesign/artifacts/shoot.mjs [before|after]
 * Serves dist/ via `npx vite preview` separately; drives the REAL import flow
 * (fixture file through the file input) so every shot shows true store state.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] === 'after' ? 'after' : 'before';
const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(dir, '..', '..', '..', 'tests', 'fixtures', 'Qwen_markdown_20260910_k171vvnlq.md');
const shot = (p) => path.join(dir, `${mode}-${p}.png`);

const CHROME = 'C:\\Users\\user\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME });
try {
  // Mobile journey
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await m.screenshot({ path: shot('mobile-projects-empty') });
  await m.setInputFiles('input[type="file"]', fixture);
  await m.getByText('SURAU DARUL DAKWAH', { exact: false }).first().waitFor({ timeout: 15000 });
  await m.waitForTimeout(800);
  await m.screenshot({ path: shot('mobile-dashboard') });
  await m.getByRole('button', { name: /BOM/ }).click();
  await m.getByText('Gypsum Board 9mm').waitFor({ timeout: 10000 });
  await m.waitForTimeout(500);
  await m.screenshot({ path: shot('mobile-bom'), fullPage: true });
  await m.getByRole('button', { name: /Confirm/ }).click();
  await m.getByText('LED strip roll length').waitFor({ timeout: 10000 });
  await m.screenshot({ path: shot('mobile-confirm'), fullPage: true });
  await m.getByRole('button', { name: /Suppliers/ }).click();
  await m.getByText('New Eastern Trading', { exact: true }).waitFor({ timeout: 10000 });
  await m.screenshot({ path: shot('mobile-suppliers'), fullPage: true });
  await m.getByRole('button', { name: /PO/ }).click();
  await m.getByText(/PO blocked/).waitFor({ timeout: 10000 });
  await m.screenshot({ path: shot('mobile-po-blocked') });
  await m.close();

  // Desktop spot checks (fresh profile -> import again through the real flow)
  const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await d.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await d.setInputFiles('input[type="file"]', fixture);
  await d.getByText('SURAU DARUL DAKWAH', { exact: false }).first().waitFor({ timeout: 15000 });
  await d.waitForTimeout(800);
  await d.screenshot({ path: shot('desktop-dashboard') });
  await d.getByRole('button', { name: /BOM/ }).click();
  await d.getByText('Gypsum Board 9mm').waitFor({ timeout: 10000 });
  await d.screenshot({ path: shot('desktop-bom') });
  await d.close();

  console.log(`shots done (${mode})`);
} finally {
  await browser.close();
}
