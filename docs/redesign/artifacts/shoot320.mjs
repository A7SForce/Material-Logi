import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:\\Users\\user\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(dir, '..', '..', '..', 'tests', 'fixtures', 'Qwen_markdown_20260910_k171vvnlq.md');

const browser = await chromium.launch({ executablePath: CHROME });
try {
  const m = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await m.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await m.setInputFiles('input[type="file"]', fixture);
  await m.getByText('SURAU DARUL DAKWAH', { exact: false }).first().waitFor({ timeout: 15000 });
  await m.waitForTimeout(800);
  await m.screenshot({ path: path.join(dir, 'after-320-dashboard.png') });
  await m.locator('.tab-bar').getByRole('button', { name: /Confirm/ }).click();
  await m.getByText('Questions from the agent').waitFor({ timeout: 10000 });
  await m.waitForTimeout(400);
  await m.screenshot({ path: path.join(dir, 'after-320-confirm.png') });
  await m.close();
  console.log('320 shots done');
} finally {
  await browser.close();
}
