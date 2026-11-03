// Usa o app já compilado (dist/) num "iPhone" 390×844: registra alimentos, confere as somas,
// conta os toques, fecha e reabre, testa sem internet e salva screenshots em telas/.
// Rodar depois de `npm run build`.
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
const conferir = (ok, msg) => { console.log(`${ok ? 'ok    ' : 'FALHOU'} ${msg}`); if (!ok) falhou = true; };
const foto = (nome) => p.screenshot({ path: `${saida}/${nome}.png` });

let toques = 0;
const tocar = async (seletor) => { toques++; await p.locator(seletor).first().click(); };
const consumido = async () => (await p.textContent('[data-teste=consumido]')).trim();
const esperarConsumido = async (v, msg) => {
  await p.waitForFunction((v) => document.querySelector('[data-teste=consumido]')?.textContent === v, v, { timeout: 3000 }).catch(() => {});
  conferir((await consumido()) === v, `${msg}: ${await consumido()} kcal (esperado ${v})`);
};

await p.goto(url);
await p.waitForSelector('.tela-hoje');
await foto('1-hoje-vazio');

// Alimento novo: + do café → digitar → tocar no resultado → Adicionar
toques = 0;
await tocar('[data-refeicao=cafe] .btn-mais');
conferir(await p.evaluate(() => document.activeElement?.getAttribute('type') === 'search'), 'busca já com foco ao abrir');
await p.keyboard.type('cuscuz');
await tocar('.linha-add .n');
await p.waitForTimeout(400);
await foto('3-quantidade');
await tocar('.btn-principal');
conferir(toques === 3, `alimento novo: ${toques} toques + digitar`);

// Ovo: 2 unidades pelo +
await p.keyboard.type('ovo');
await p.locator('.linha-add .n').first().click();
await p.locator('.qtd-passo[aria-label=Mais]').click();
conferir((await p.textContent('.qtd-gramas')).includes('100 g'), '2 ovos = 100 g');
await p.locator('.btn-principal').click();
await p.waitForTimeout(200);
await foto('2-adicionar-recentes');
await p.locator('.add-pronto').click();
await esperarConsumido('259', 'café: cuscuz 100 g (113) + 2 ovos (146)');

// Recente: + do almoço → + do ovo (registra com a última quantidade)
toques = 0;
await tocar('[data-refeicao=almoco] .btn-mais');
await tocar('[aria-label="Registrar Ovo cozido"]');
conferir(toques === 2, `alimento recente: ${toques} toques`);
await p.locator('.add-pronto').click();
await esperarConsumido('405', 'almoço: + 2 ovos');

// Só calorias no lanche da tarde
await p.locator('[data-refeicao=lanche-tarde] .btn-mais').click();
await p.locator('.atalho', { hasText: 'Só calorias' }).click();
await p.locator('.folha input').first().fill('salgado da cantina');
await p.locator('.campos-4 input').first().fill('300');
await p.locator('.btn-principal').click();
await p.locator('.add-pronto').click();
await esperarConsumido('705', 'lanche: + 300 kcal só calorias');

// Editar: ovo do almoço de 2 para 1 unidade
await p.locator('[data-refeicao=almoco] .item').first().click();
await p.locator('.qtd-passo[aria-label=Menos]').click();
await p.locator('.btn-principal').click();
await esperarConsumido('632', 'editar ovo do almoço para 1 unidade');
const proteina = await p.locator('.macro').first().textContent();
conferir(proteina.includes('22'), `proteína do dia: ${proteina.replace('Proteína', '')} (esperado 22: 2,5 + 13,3 + 6,7 ≈ 22)`);
await foto('4-hoje-com-itens');

// Fechar e reabrir
await p.reload();
await p.waitForSelector('.tela-hoje');
await esperarConsumido('632', 'depois de reabrir');

// Amanhã: sugestão de repetir o café com 1 toque
await p.locator('[aria-label="Próximo dia"]').click();
await p.locator('[data-refeicao=cafe] .sugestao').click();
await esperarConsumido('259', 'amanhã: repetir café de ontem com 1 toque');
await foto('5-amanha-repetido');
await p.locator('.voltar-hoje').click();

// Metas
await p.locator('.aba', { hasText: 'Mais' }).click();
await p.locator('.mais-item', { hasText: 'Metas' }).click();
await p.locator('.bloco-abrir').click();
await foto('6-metas');

// Sem internet
await p.evaluate(() => navigator.serviceWorker.ready);
await contexto.setOffline(true);
await p.reload();
await p.waitForSelector('.tela-hoje');
await esperarConsumido('632', 'abre sem internet com os dados');

await navegador.close();
servidor.httpServer.close();
process.exit(falhou ? 1 : 0);
