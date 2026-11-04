// Etapa 5: água, peso e progresso num "iPhone" 390×844, com dias de exemplo gravados no banco.
// Rodar depois de `npm run build`. Com URL=https://... testa o site publicado.
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const saida = 'telas';
mkdirSync(saida, { recursive: true });
const servidor = process.env.URL ? null : await preview({ preview: { port: 4175, strictPort: true } });
const url = process.env.URL ?? 'http://localhost:4175/prato-do-dia/';
const nav = await chromium.launch({ channel: 'msedge' });
const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await contexto.newPage();
let falhou = false;
const conferir = (ok, msg) => { console.log(`${ok ? 'ok    ' : 'FALHOU'} ${msg}`); if (!ok) falhou = true; };
// A tela atualiza alguns milissegundos depois do banco: tenta de novo por até 3 s antes de dar falha.
const verificar = async (fn) => { let r; for (let i = 0; i < 30; i++) { r = await fn(); if (r[0]) break; await p.waitForTimeout(100); } conferir(r[0], r[1]); };
const foto = (nome, inteira = false) => p.screenshot({ path: `${saida}/${nome}.png`, fullPage: inteira });
const texto = (s) => p.textContent(s).then((t) => t?.trim());

// Datas no fuso local, como o app
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const hoje = dia(0);
const segunda = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();

await p.goto(url);
await p.waitForSelector('.tela-hoje');
// Espera o app terminar de se instalar (o service worker assumir), para não recarregar no meio do teste.
await p.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 }).catch(() => {});

// 9 dias seguidos até ontem (o 10º dia antes está vazio) + pesagens semanais
const kcalDia = [1650, 1720, 1580, 1910, 1690, 1450, 1600, 1500, 2100]; // ontem, anteontem, ...
const pesos = [86.0, 85.6, 85.1, 85.3, 84.7]; // há 4 semanas … há 0
await p.evaluate(async ({ kcalDia, dias, pesos, datasPeso }) => {
  const db = window.pratoDb;
  await db.registros.bulkAdd(kcalDia.map((k, i) => ({
    data: dias[i], refeicao: 'almoco', alimentoId: null, nome: 'exemplo', qtd: { gramas: 0 }, criadoEm: i,
    valores: { kcal: k, proteina: Math.round(k / 15), carbo: null, gordura: null, fibra: null, sodio: null },
  })));
  await db.peso.bulkPut(pesos.map((kg, i) => ({ data: datasPeso[i], kg })));
}, { kcalDia, dias: kcalDia.map((_, i) => dia(-1 - i)), pesos, datasPeso: [-28, -21, -14, -7, -1].map(dia) });

// Água: + no cartão, ajustar na folha, trocar copo
await p.reload();
await p.waitForSelector('[data-teste=agua]');
await p.locator('[data-teste=agua] .mais-azul').click();
await p.locator('[data-teste=agua] .mais-azul').click();
await p.locator('[data-teste=agua] .mais-azul').click();
await verificar(async () => [(await p.locator('[data-teste=agua] .copos i.on').count()) === 3, 'água: 3 toques no + = 3 copos']);
await verificar(async () => [(await texto('[data-teste=agua] .agua-txt b')).includes('0,6 L de 2 L'), `água com copo de 200 ml e meta de 10: ${await texto('[data-teste=agua] .agua-txt b')}`]);
await foto('12-hoje-agua');
await p.locator('[data-teste=agua] .agua-info').click();
await p.waitForTimeout(400);
await p.locator('.agua-big button[aria-label="Menos um copo"]').click();
await verificar(async () => [(await texto('[data-teste=copos]')) === '2', 'água: − na folha volta para 2 copos']);
await p.locator('.qtd-porcoes.azul button', { hasText: '250 ml' }).click();
await verificar(async () => [(await texto('.agua-total')).includes('0,5 L de 2,5 L'), `trocar copo para 250 ml: ${await texto('.agua-total')}`]);
await foto('13-agua-folha');
await p.locator('.agua-big button[aria-label="Mais um copo"]').click();
await p.locator('.folha-fundo').click({ position: { x: 20, y: 20 } });
await p.reload();
await p.waitForSelector('[data-teste=agua]');
await verificar(async () => [(await p.locator('[data-teste=agua] .copos i.on').count()) === 3, 'água continua salva depois de reabrir']);

// Progresso
await p.locator('.aba', { hasText: 'Progresso' }).click();
await p.waitForSelector('[data-teste=sequencia]');
await verificar(async () => [(await texto('[data-teste=sequencia]')) === '9 dias', `sequência: ${await texto('[data-teste=sequencia]')} (esperado 9, hoje ainda vazio)`]);
await verificar(async () => [(await texto('[data-teste=peso-atual]')) === '84,7 kg', `peso atual: ${await texto('[data-teste=peso-atual]')}`]);

// Médias da semana atual: dias fechados desde segunda
const fechados = kcalDia.map((k, i) => ({ k, d: dia(-1 - i) })).filter((x) => x.d >= segunda);
const media = fechados.length ? Math.round(fechados.reduce((s, x) => s + x.k, 0) / fechados.length) : null;
const naMeta = fechados.filter((x) => x.k >= 1360 && x.k <= 1785).length;
const mostrado = await texto('[data-teste=media-kcal]');
conferir(mostrado === (media == null ? '—' : media.toLocaleString('pt-BR')), `média da semana: ${mostrado} kcal (esperado ${media})`);
await verificar(async () => [(await texto('[data-teste=na-meta]')) === (fechados.length ? `${naMeta} de ${fechados.length}` : '—'), `dias na meta: ${await texto('[data-teste=na-meta]')}`]);

// Semana anterior (7 dias completos)
await p.locator('[aria-label="Semana anterior"]').click();
const anterior = kcalDia.map((k, i) => ({ k, d: dia(-1 - i) })).filter((x) => x.d >= dia(-((new Date().getDay() + 6) % 7) - 7) && x.d < segunda);
const mediaAnt = Math.round(anterior.reduce((s, x) => s + x.k, 0) / anterior.length);
await verificar(async () => [(await texto('[data-teste=media-kcal]')) === mediaAnt.toLocaleString('pt-BR'), `semana anterior: ${await texto('[data-teste=media-kcal]')} kcal (esperado ${mediaAnt}, ${anterior.length} dias)`]);
await p.locator('[aria-label="Próxima semana"]').click();
await p.waitForTimeout(500);
await foto('14-progresso', true);

// Registrar peso pela folha + meta
await p.locator('.btn-pilula', { hasText: 'Registrar' }).click();
await p.locator('.peso-valor input').fill('84,2');
await p.locator('input[aria-label="Meta de peso em kg"]').fill('80');
await p.waitForTimeout(400);
await foto('15-peso-folha');
await p.locator('.folha .btn-principal').click();
await p.waitForTimeout(300);
await verificar(async () => [(await texto('[data-teste=peso-atual]')) === '84,2 kg', `peso registrado hoje: ${await texto('[data-teste=peso-atual]')}`]);
await verificar(async () => [(await p.locator('.tela-progresso').textContent()).includes('Faltam 4,2 kg para a meta'), 'mostra quanto falta para a meta de peso']);

// Histórico: tocar num dia abre ele no Hoje
await p.locator('.hist-dia').nth(1).click();
await p.waitForSelector('.tela-hoje');
await verificar(async () => [(await texto('[data-teste=consumido]')) === kcalDia[1].toLocaleString('pt-BR'), `histórico abre o dia certo: ${await texto('[data-teste=consumido]')} kcal`]);

// Sem internet
await p.evaluate(() => navigator.serviceWorker.ready);
await contexto.setOffline(true);
await p.reload();
await p.locator('.aba', { hasText: 'Progresso' }).click();
await p.waitForSelector('.tela-progresso canvas');
await p.waitForTimeout(500);
await verificar(async () => [(await p.locator('.tela-progresso canvas').count()) === 2, 'gráficos aparecem sem internet']);

await nav.close();
servidor?.httpServer.close();
process.exit(falhou ? 1 : 0);
