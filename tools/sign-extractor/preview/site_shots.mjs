// Full-page screenshots of every route, in dark/light and desktop/mobile.
// node preview/site_shots.mjs outDir   (app served on http://localhost:5055)
import fs from 'fs';
import puppeteer from 'puppeteer-core';
const outDir = process.argv[2]; fs.mkdirSync(outDir, { recursive: true });
const routes = ['home', 'convert', 'learn-sign', 'all-videos', 'create-video', 'avatar', 'video/demo'];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const errors = {};
for (const theme of ['dark', 'light']) {
  for (const [label, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 }]]) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    page.on('pageerror', (e) => { (errors[label] ??= new Set()).add(e.message.slice(0, 120)); });
    await page.goto('http://localhost:5055/sign-kit/home');
    await page.evaluate((t) => localStorage.setItem('theme', t), theme);
    for (const r of routes) {
      await page.goto(`http://localhost:5055/sign-kit/${r}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise((res) => setTimeout(res, 1800));
      await page.screenshot({ path: `${outDir}/${theme}_${label}_${r.replace('/', '-')}.png`, fullPage: true });
    }
    await page.close();
  }
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [...v]]))));
await browser.close();
