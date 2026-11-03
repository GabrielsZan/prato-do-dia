// Gera os PNGs do ícone a partir de public/icone.svg (usa o Edge instalado no Windows).
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icone.svg', import.meta.url), 'utf8');
const b = await chromium.launch({ channel: 'msedge' });
for (const [nome, lado] of [['icone-192.png', 192], ['icone-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const p = await b.newPage({ viewport: { width: lado, height: lado } });
  await p.setContent(`<style>*{margin:0}svg{width:${lado}px;height:${lado}px;display:block}</style>${svg}`);
  await p.screenshot({ path: new URL(`../public/${nome}`, import.meta.url).pathname.slice(1) });
  await p.close();
}
await b.close();
console.log('ícones gerados');
