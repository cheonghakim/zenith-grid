import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });
await page.goto('http://localhost:5174/minimal.html');
await page.waitForTimeout(2500);

// root background
const rootBg = await page.$eval('#grid-dark .ck-high-grid-root', el => {
  const s = window.getComputedStyle(el);
  return { bg: s.backgroundColor, bgImage: s.backgroundImage };
});

// pagination footer
const footer = await page.$eval('#grid-light .ck-high-grid-footer', el => {
  const s = window.getComputedStyle(el);
  return { visible: el.offsetHeight > 0, bg: s.backgroundColor, text: el.textContent.replace(/\s+/g,' ').trim().slice(0,80) };
}).catch(() => 'no footer found');

// dark theme — get the ck-high-grid-root actual class list  
const rootClass = await page.$eval('#grid-dark .ck-high-grid-root', el => el.className);

console.log('dark root bg:', JSON.stringify(rootBg));
console.log('root classList:', rootClass);
console.log('light footer:', JSON.stringify(footer));

// Take a zoomed screenshot of just the dark grid
await page.screenshot({ path: '/tmp/dark-grid-zoom.png', clip: { x: 0, y: 530, width: 1180, height: 370 } });
console.log('screenshot saved');
await browser.close();
