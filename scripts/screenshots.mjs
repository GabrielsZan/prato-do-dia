// Abre o app já compilado (dist/) num "iPhone" 390×844, tira screenshots em telas/
// e confere se continua abrindo sem internet. Rodar depois de `npm run build`.
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const saida = 'telas';
mkdirSync(saida, { recursive: true });

const servidor = await preview({ preview: { port: 4173, strictPort: true } });
const url = 'http://localhost:4173/prato-do-dia/';
const navegador = await chromium.launch({ channel: 'msedge' });
const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await contexto.newPage();
let falhou = false;
const conferir = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FALHOU'} ${msg}`); if (!ok) falhou = true; };

await p.goto(url);
await p.waitForSelector('.busca-campo input');
conferir(await p.evaluate(() => document.activeElement?.tagName === 'INPUT'), 'campo de busca com foco ao abrir');
await p.screenshot({ path: `${saida}/busca-vazia.png` });

for (const [q, esperado] of [['pao frances', 'Pão francês'], ['frango', 'Peito de frango grelhado'], ['feijão', 'Feijão carioca'], ['ovos', 'Ovo cozido']]) {
  await p.fill('.busca-campo input', q);
  const primeiro = await p.textContent('.busca-linha b');
  conferir(primeiro === esperado, `"${q}" → ${primeiro}`);
}
await p.fill('.busca-campo input', 'frango');
await p.click('.busca-linha');
await p.screenshot({ path: `${saida}/busca-frango.png` });

// Sem internet: espera o service worker guardar o app e recarrega offline.
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload();
await p.evaluate(() => navigator.serviceWorker.ready);
await contexto.setOffline(true);
await p.reload();
await p.fill('.busca-campo input', 'cuscuz');
conferir((await p.textContent('.busca-linha b')) === 'Cuscuz de milho', 'busca funciona sem internet');
await p.screenshot({ path: `${saida}/busca-offline.png` });

await navegador.close();
servidor.httpServer.close();
process.exit(falhou ? 1 : 0);
