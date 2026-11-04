// Tira screenshots 390×844 dos mockups estáticos: node scripts/mockup-shots.mjs progresso agua peso
import { chromium } from 'playwright-core';

const dir = new URL('../mockups/', import.meta.url).pathname.slice(1);
const nomes = process.argv.slice(2);
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const n of nomes) {
  await p.goto(`file:///${dir}${n}.html`);
  await p.screenshot({ path: `${dir}${n}.png`, fullPage: true });
}
await b.close();
