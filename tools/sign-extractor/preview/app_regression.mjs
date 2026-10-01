// End-to-end checks of every page's features in the built app (served on http://localhost:5055).
// node preview/app_regression.mjs
import puppeteer from 'puppeteer-core';
const BASE = 'http://localhost:5055/sign-kit';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (page, selector, text) => page.evaluate((s, t) =>
  [...document.querySelectorAll(s)].find((b) => b.textContent.trim().includes(t)).click(), selector, text);

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
page.on('pageerror', (e) => errors.push(e.message));

// Convert: text -> phrase signs, caption and gloss chips
await page.goto(`${BASE}/convert`, { waitUntil: 'networkidle0' });
await sleep(2500);
await page.type('textarea[aria-label="Text to sign"]', 'Hello, how are you? Thank you');
await clickText(page, 'button', 'Sign this text');
await page.waitForFunction(() => document.querySelector('.caption-text').textContent.includes('THANK YOU'), { timeout: 60000 }).catch(() => {});
const caption = await page.$eval('.caption-text', (e) => e.textContent);
const gloss = await page.$$eval('.stage-caption .chip', (c) => c.map((x) => x.textContent).join(' '));
check('Convert signs a sentence', caption.includes('HELLO') && caption.includes('HOW ARE YOU') && caption.includes('THANK YOU'), caption.trim());
check('Convert shows ISL gloss', gloss === 'HELLO HOW-ARE-YOU THANK-YOU', gloss);
const sw = await page.$eval('#use-grammar', (e) => e.checked);
await page.click('#use-grammar');
check('Convert grammar switch toggles', sw !== await page.$eval('#use-grammar', (e) => e.checked));
const speed0 = await page.$eval('#speed-range', (e) => e.value);
await page.$eval('#speed-range', (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, '0.3'); e.dispatchEvent(new Event('input', { bubbles: true })); });
const speedLabel = await page.$eval('label[for="speed-range"] span', (e) => e.textContent);
check('Speed slider updates', speed0 === '0.1' && speedLabel === '0.3', `${speed0} -> ${speedLabel}`);
const engines = await page.$$eval('select[aria-label="Speech recognition engine"] option', (o) => o.map((x) => x.value));
check('Speech engines offered', engines.join() === 'browser,whisper', engines.join());

// Learn: letter + word buttons play
await page.goto(`${BASE}/learn-sign`, { waitUntil: 'networkidle0' });
await sleep(2500);
const keys = await page.$$eval('.sign-key', (b) => b.length);
const chips = await page.$$eval('.sign-chip', (b) => b.map((x) => x.textContent));
check('Learn lists 26 letters and all words', keys === 26 && chips.length === 20, `${keys} letters, ${chips.length} words`);
await clickText(page, '.sign-key', 'A');
await sleep(300);
check('Learn letter plays', (await page.$eval('.caption-text', (e) => e.textContent)) === 'A');
await page.waitForFunction(() => !document.querySelector('.sign-key.active') || true);
await sleep(6000);
await clickText(page, '.sign-chip', 'GOOD MORNING');
await sleep(300);
check('Learn word plays', (await page.$eval('.caption-text', (e) => e.textContent)) === 'GOOD MORNING');

// Videos: open by ID navigates; empty input shows validation
await page.goto(`${BASE}/all-videos`, { waitUntil: 'networkidle0' });
await sleep(1500);
await clickText(page, 'button', 'Open');
check('Videos validates empty ID', await page.$eval('form', (f) => f.classList.contains('was-validated')));
await page.type('#videoId', 'abc123');
await clickText(page, 'button', 'Open');
await sleep(800);
check('Videos opens a video by ID', page.url().endsWith('/sign-kit/video/abc123'), page.url());
const prefilled = await page.$eval('input[aria-label="Video ID"]', (e) => e.value);
check('Video page pre-fills ID from URL', prefilled === 'abc123', prefilled);
await clickText(page, 'button', 'Start video');
await page.waitForSelector('.modal.show', { timeout: 20000 }).catch(() => {});
check('Video shows invalid-ID dialog when lookup fails', !!(await page.$('.modal.show')));

// Create video: tabs and validation
await page.goto(`${BASE}/create-video`, { waitUntil: 'networkidle0' });
await clickText(page, '.mode-tabs button', 'Speak');
check('Create: speech mode shows mic controls', !!(await page.$('#speech-text')));
await clickText(page, '.mode-tabs button', 'Upload');
check('Create: upload mode shows file input', !!(await page.$('input[type=file]')));
await clickText(page, 'button', 'Create video');
check('Create validates required fields', await page.$eval('form', (f) => f.classList.contains('was-validated')));

// Avatar studio: preset + save persists
await page.goto(`${BASE}/avatar`, { waitUntil: 'networkidle0' });
await sleep(1500);
await clickText(page, '.studio-presets button', 'Casual');
await clickText(page, 'button', 'Save look');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('avatar-style')).name);
check('Studio saves a preset', saved === 'Casual', saved);
await clickText(page, 'button', 'Reset');
check('Studio reset clears saved look', await page.evaluate(() => localStorage.getItem('avatar-style')) === null);

// Navbar: active link + theme toggle
check('Navbar highlights current page', (await page.$eval('.nav-link.active', (e) => e.textContent)) === 'Avatar');
const t0 = await page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'));
await page.click('.theme-toggle');
await sleep(300);
const t1 = await page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'));
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('Theme toggle switches theme', t0 !== t1, `${t0} -> ${t1}, body ${bg}`);
await page.click('.theme-toggle');

// Mobile: hamburger menu opens and navigates
const m = await browser.newPage();
m.on('pageerror', (e) => errors.push(e.message));
await m.setViewport({ width: 390, height: 844, isMobile: true });
await m.goto(`${BASE}/home`, { waitUntil: 'networkidle0' });
await m.click('.navbar-toggler');
await sleep(600);
const menuOpen = await m.$eval('#navbarResponsive', (e) => e.classList.contains('show'));
await clickText(m, '.nav-link', 'Learn');
await sleep(800);
check('Mobile menu opens and navigates', menuOpen && m.url().endsWith('/learn-sign'), m.url());
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('Mobile: no horizontal overflow', overflow <= 0, `${overflow}px`);

console.log(results.join('\n'));
console.log(errors.length ? `PAGE ERRORS: ${[...new Set(errors)].join(' | ')}` : 'No page errors');
await browser.close();
