// Etapa 3: testa o código de barras de ponta a ponta com uma câmera falsa
// (um vídeo MJPEG com um código EAN-13 desenhado), o Open Food Facts de verdade
// e o cadastro de alimento próprio. Rodar depois de `npm run build`.
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const saida = 'telas';
mkdirSync(saida, { recursive: true });
const CODIGO = '7894900011517'; // Coca-Cola 2 L, existe no Open Food Facts

// --- Desenha o EAN-13 e grava como vídeo MJPEG (vários quadros JPEG seguidos) ---
function barrasEAN13(c) {
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const paridade = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'][+c[0]];
  let b = '101';
  for (let i = 1; i <= 6; i++) b += (paridade[i - 1] === 'L' ? L : G)[+c[i]];
  b += '01010';
  for (let i = 7; i <= 12; i++) b += R[+c[i]];
  return b + '101';
}

const navegador = await chromium.launch({ channel: 'msedge' });
{
  const p = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
  const barras = barrasEAN13(CODIGO);
  await p.setContent(`<body style="margin:0;background:#ddd;display:grid;place-items:center;height:100vh">
    <div style="background:#fff;padding:30px 50px;transform:rotate(-3deg)">
    <svg width="${barras.length * 6}" height="160">${[...barras].map((x, i) => x === '1' ? `<rect x="${i * 6}" width="6" height="160"/>` : '').join('')}</svg>
    <div style="font:28px monospace;text-align:center;letter-spacing:6px">${CODIGO}</div></div></body>`);
  const jpg = await p.screenshot({ type: 'jpeg', quality: 85 });
  writeFileSync(`${saida}/camera-falsa.mjpeg`, Buffer.concat(Array(30).fill(jpg)));
  await p.close();
}
await navegador.close();

// --- App ---
const servidor = await preview({ preview: { port: 4174, strictPort: true } });
const url = 'http://localhost:4174/prato-do-dia/';
const nav = await chromium.launch({
  channel: 'msedge',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${resolve(saida, 'camera-falsa.mjpeg')}`],
});
const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['camera'] });
const p = await contexto.newPage();
let falhou = false;
const conferir = (ok, msg) => { console.log(`${ok ? 'ok    ' : 'FALHOU'} ${msg}`); if (!ok) falhou = true; };
const foto = (nome) => p.screenshot({ path: `${saida}/${nome}.png` });
const consumido = () => p.textContent('[data-teste=consumido]');

await p.goto(url);
await p.waitForSelector('.tela-hoje');

// 1) Escanear um produto que existe no Open Food Facts
let toques = 0;
const tocar = async (s) => { toques++; await p.locator(s).first().click(); };
await tocar('[data-refeicao=lanche-manha] .btn-mais');
await tocar('[aria-label="Ler código de barras"]');
await p.waitForSelector('.tela-camera video');
await p.waitForSelector('.qtd-titulo', { timeout: 20000 }).catch(() => {});
const titulo = await p.textContent('.qtd-titulo h2').catch(() => null);
conferir(!!titulo && /coca/i.test(titulo), `escaneou e achou no Open Food Facts: ${titulo}`);
await p.locator('.qtd-porcoes button', { hasText: 'gramas' }).click();
await p.locator('.qtd-valor input').fill('350');
await foto('8-produto-escaneado');
await tocar('.btn-principal');
conferir(toques === 3, `produto novo pelo código: ${toques} toques (+, código, Adicionar), sem contar ajustar a quantidade`);
await p.locator('.add-pronto').click();
await p.waitForTimeout(300);
const kcalCoca = Math.round(42.5 * 3.5);
conferir((await consumido()) === String(kcalCoca), `350 ml de Coca = ${await consumido()} kcal (esperado ${kcalCoca})`);

// 2) Escanear de novo sem internet: acha no que já foi salvo
await contexto.setOffline(true);
await p.locator('[data-refeicao=almoco] .btn-mais').click();
await p.locator('[aria-label="Ler código de barras"]').click();
await p.waitForSelector('.qtd-titulo', { timeout: 20000 }).catch(() => {});
conferir(/coca/i.test((await p.textContent('.qtd-titulo h2').catch(() => '')) ?? ''), 'sem internet: produto já escaneado continua sendo lido');
await p.locator('.folha-fundo').click({ position: { x: 20, y: 20 } });

// 3) Código que não existe → cadastro já com o código → salvar → registrar
const desconhecido = '7890000000017';
await p.locator('[aria-label="Ler código de barras"]').click();
await p.waitForSelector('.tela-camera');
await p.locator('.camera-digitar').click();
await p.locator('.camera-manual input').fill(desconhecido);
await p.waitForTimeout(300);
await foto('7-camera');
await p.locator('.camera-manual .btn-principal').click();
await p.waitForSelector('.tela-form', { timeout: 15000 });
conferir((await p.inputValue('.tela-form input[inputmode=numeric]')) === desconhecido, 'sem achar: cadastro abre com o código preenchido');
await p.locator('.tela-form .campo', { hasText: 'Nome' }).first().locator('input').fill('Goma de tapioca (teste)');
await p.locator('.tela-form .campo', { hasText: 'Nome da porção' }).locator('input').fill('1 tapioca');
await p.locator('.tela-form .campo', { hasText: 'Peso' }).locator('input').fill('50');
await p.locator('.segmentos button', { hasText: 'Por porção' }).click();
await p.locator('.tela-form .campo', { hasText: 'Calorias' }).locator('input').fill('120');
await p.locator('.tela-form .campo', { hasText: 'Carboidrato' }).locator('input').fill('30');
await foto('9-cadastro');
await p.locator('.tela-form .btn-principal').click();
await p.waitForSelector('.qtd-titulo');
const kcal1 = await p.textContent('.qtd-previa div b');
conferir(kcal1 === '120', `1 tapioca de 50 g = ${kcal1} kcal (rótulo por porção convertido para 100 g)`);
await p.locator('.btn-principal').click();

// 4) Aba "Meus" e busca encontram o alimento próprio
await p.locator('.abinhas button', { hasText: 'Meus' }).click();
const meus = await p.locator('.lista-add .linha-add b').allTextContents();
conferir(meus.some((m) => /coca/i.test(m)) && meus.some((m) => /tapioca/i.test(m)), `aba Meus: ${meus.join(' | ')}`);
await foto('10-meus');
await p.locator('.busca-campo input').fill('tapioca');
const primeiro = await p.textContent('.linha-add b');
conferir(/goma/i.test(primeiro), `busca "tapioca" mostra primeiro: ${primeiro}`);
await p.locator('.add-pronto').click();
await p.waitForTimeout(300);
conferir((await consumido()) === String(kcalCoca + 120), `dia: ${await consumido()} kcal (esperado ${kcalCoca + 120})`);

await nav.close();
servidor.httpServer.close();
process.exit(falhou ? 1 : 0);
