// node render.mjs <sign.json> <outDir> [frame ...]  -> outDir/avatar_<frame>.png
// Expects a static server for the repo root on http://localhost:5077.
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const [jsonPath, outDir, ...frameArgs] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const frames = frameArgs.length ? frameArgs.map(Number) : data.keyframes;
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.setViewport({ width: 480, height: 540 });
await page.goto('http://localhost:5077/tools/sign-extractor/preview/preview.html');
await page.waitForFunction('window.ready === true', { timeout: 60000 });
for (const f of frames) {
  const values = Object.fromEntries(data.channels.map((ch, i) => [ch, data.frames[f][i]]));
  await page.evaluate((v) => window.setPose(v), values);
  await (await page.$('canvas')).screenshot({ path: `${outDir}/avatar_${f}.png` });
}
await browser.close();
console.log(`rendered ${frames.length} frames`);
