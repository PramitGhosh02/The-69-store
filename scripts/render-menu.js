import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function render() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  const executablePath = possiblePaths.find((p) => fs.existsSync(p));
  if (!executablePath) {
    throw new Error('Neither Chrome nor Edge was found at standard locations.');
  }

  console.log('Using browser binary:', executablePath);

  const customUserDataDir = path.join(os.tmpdir(), `menu_card_profile_${Date.now()}`);
  fs.mkdirSync(customUserDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir: customUserDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 1750,
    deviceScaleFactor: 2, // 2x high-resolution crisp output for printing (2400 x 3500 px)
  });

  const htmlPath = path.resolve(__dirname, 'menu-card.html');
  const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
  console.log('Loading file:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait 1.5 seconds to guarantee all Google Fonts and SVG assets finish rendering
  await new Promise((res) => setTimeout(res, 1500));

  const workspaceRoot = path.resolve(__dirname, '..');
  const publicDir = path.resolve(workspaceRoot, 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const rootPng = path.resolve(workspaceRoot, 'The_69_Store_Diwali_Menu.png');
  const rootPdf = path.resolve(workspaceRoot, 'The_69_Store_Diwali_Menu.pdf');
  const publicPng = path.resolve(publicDir, 'The_69_Store_Diwali_Menu.png');
  const publicPdf = path.resolve(publicDir, 'The_69_Store_Diwali_Menu.pdf');

  console.log('Exporting PNG...');
  await page.screenshot({
    path: rootPng,
    fullPage: true,
    type: 'png',
  });
  fs.copyFileSync(rootPng, publicPng);
  console.log('Saved PNG to:', rootPng);

  console.log('Exporting PDF...');
  await page.pdf({
    path: rootPdf,
    width: '1200px',
    height: '1750px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  fs.copyFileSync(rootPdf, publicPdf);
  console.log('Saved PDF to:', rootPdf);

  await browser.close();

  // Clean up temp profile directory
  try {
    fs.rmSync(customUserDataDir, { recursive: true, force: true });
  } catch {}

  console.log('✅ Done! Both PNG and PDF successfully created.');
}

render().catch((err) => {
  console.error('Render error:', err);
  process.exit(1);
});
