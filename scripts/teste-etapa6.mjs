// Etapa 6: jejum, lista de compras e backup num "iPhone" 390×844.
// A tela de compartilhar do iPhone é simulada: o arquivo do backup fica guardado para o teste conferir.
// Rodar depois de `npm run build`. Com URL=https://... testa o site publicado.
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const saida = 'telas';
mkdirSync(saida, { recursive: true });
const servidor = process.env.URL ? null : await preview({ preview: { port: 4176, strictPort: true } });
const url = process.env.URL ?? 'http://localhost:4176/prato-do-dia/';
const nav = await chromium.launch({ channel: 'msedge' });
const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await contexto.addInitScript(() => {
  navigator.canShare = () => true;
  navigator.share = async ({ files }) => { window.__compartilhado = { nome: files[0].name, texto: await files[0].text() }; };
});
const p = await contexto.newPage();
let falhou = false;
const conferir = (ok, msg) => { console.log(`${ok ? 'ok    ' : 'FALHOU'} ${msg}`); if (!ok) falhou = true; };
// A tela atualiza alguns milissegundos depois do banco: tenta de novo por até 3 s antes de dar falha.
const verificar = async (fn) => { let r; for (let i = 0; i < 30; i++) { r = await fn(); if (r[0]) break; await p.waitForTimeout(100); } conferir(r[0], r[1]); };
const foto = async (nome) => { await p.waitForTimeout(400); await p.screenshot({ path: `${saida}/${nome}.png` }); };
const texto = (s) => p.textContent(s).then((t) => t?.trim());
const aba = (nome) => p.locator('.aba', { hasText: nome }).click();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ontem = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d); })();
const hoje = iso(new Date());

await p.goto(url);
await p.waitForSelector('.tela-hoje');
// Espera o app terminar de se instalar (o service worker assumir), para não recarregar no meio do teste.
await p.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 }).catch(() => {});

// ---------- Jejum ----------
await verificar(async () => [(await p.locator('[data-teste=faixa-jejum]').count()) === 0, 'sem jejum ativo, o Hoje não mostra a faixa']);
await aba('Jejum');
await p.locator('.btn-principal', { hasText: 'Começar jejum agora' }).click();
await p.waitForSelector('[data-teste=relogio]');
const r1 = await texto('[data-teste=relogio]');
await p.waitForTimeout(2100);
const r2 = await texto('[data-teste=relogio]');
conferir(r1 !== r2 && r2.startsWith('00:00:0'), `cronômetro andando: ${r1} → ${r2}`);
// Simula que começou há 13h20 (como no mockup)
await p.evaluate(async () => {
  const db = window.pratoDb;
  const j = (await db.jejuns.toArray()).find((x) => x.fim == null);
  await db.jejuns.update(j.id, { inicio: Date.now() - (13 * 3600 + 20 * 60) * 1000 });
});
await p.waitForTimeout(1200);
await verificar(async () => [(await texto('.jejum-anel .f')).startsWith('faltam 2h4') || (await texto('.jejum-anel .f')).startsWith('faltam 2h3'), `16:8 começado há 13h20: ${await texto('.jejum-anel .f')}`]);
await foto('16-jejum');
await aba('Hoje');
await verificar(async () => [(await texto('[data-teste=faixa-jejum]')).includes('Jejum 16:8'), `faixa no Hoje: ${await texto('[data-teste=faixa-jejum] b')}`]);
await foto('17-hoje-faixa-jejum');
await p.locator('[data-teste=faixa-jejum]').click();
await p.locator('.btn-principal', { hasText: 'Encerrar jejum' }).click();
await p.waitForTimeout(300);
const hist = await p.locator('.cartao.bloco').last().locator('.linha').allTextContents();
conferir(hist.length === 1 && /13h2\d/.test(hist[0]), `encerrado vai para o histórico: ${hist[0]}`);
await p.locator('.planos-jejum button', { hasText: 'Personalizado' }).click();
await p.locator('[aria-label="Mais uma hora"]').click();
await verificar(async () => [(await texto('.jejum-anel .h')) === '17h', `plano personalizado: ${await texto('.jejum-anel .h')}`]);
await aba('Hoje');
await verificar(async () => [(await p.locator('[data-teste=faixa-jejum]').count()) === 0, 'depois de encerrar, a faixa some do Hoje']);

// ---------- Lista de compras ----------
await aba('Mais');
await p.locator('.mais-item', { hasText: 'Lista de compras' }).click();
for (const item of ['Ovos (2 dúzias)', 'Queijo minas', 'Flocão de milho', 'Banana']) {
  await p.locator('.compras-add input').fill(item);
  await p.keyboard.press('Enter');
}
await verificar(async () => [(await p.locator('.compras-item').count()) === 4, 'adicionou 4 itens com Enter']);
await p.locator('.compras-item', { hasText: 'Banana' }).click();
await verificar(async () => [(await texto('.compras-sec span')) === 'No carrinho · 1', 'tocar marca o item']);
// Arrastar para a esquerda apaga
const caixa = await p.locator('.compras-item', { hasText: 'Flocão' }).boundingBox();
await p.mouse.move(caixa.x + 300, caixa.y + caixa.height / 2);
await p.mouse.down();
for (let x = 300; x >= 120; x -= 30) await p.mouse.move(caixa.x + x, caixa.y + caixa.height / 2);
await p.mouse.up();
await p.waitForTimeout(300);
await verificar(async () => [(await p.locator('.compras-item', { hasText: 'Flocão' }).count()) === 0, 'arrastar para a esquerda apaga']);
await foto('18-compras');
await p.locator('.compras-sec .link').click();
await p.waitForSelector('.compras-sec', { state: 'detached' });
await p.reload();
await p.locator('.aba', { hasText: 'Mais' }).click();
await p.locator('.mais-item', { hasText: 'Lista de compras' }).click();
const restantes = await p.locator('.compras-txt').allTextContents();
conferir(restantes.join('|') === 'Ovos (2 dúzias)|Queijo minas', `limpar marcados e reabrir: ${restantes.join(', ')}`);

// ---------- Backup ----------
// Um pouco de diário para ir no backup
await p.evaluate(async ({ ontem, hoje }) => {
  const db = window.pratoDb;
  await db.registros.bulkAdd([
    { data: ontem, refeicao: 'cafe', alimentoId: 'taco:53', nome: 'Pão francês', qtd: { gramas: 50, porcao: '1 unidade', vezes: 1 }, criadoEm: 1, valores: { kcal: 150, proteina: 4, carbo: 29.3, gordura: 1.6, fibra: 1.2, sodio: 324 } },
    { data: hoje, refeicao: 'almoco', alimentoId: null, nome: 'salgado', qtd: { gramas: 0 }, criadoEm: 2, valores: { kcal: 300, proteina: null, carbo: null, gordura: null, fibra: null, sodio: null } },
  ]);
  await db.peso.put({ data: hoje, kg: 84.2 });
  await db.alimentos.put({ id: 'proprio:teste', fonte: 'proprio', nome: 'Goma de tapioca', por100: { kcal: 240, proteina: 0, carbo: 60, gordura: 0, fibra: null, sodio: null } });
}, { ontem, hoje });
await p.locator('[aria-label=Voltar]').click();
await p.locator('.mais-item', { hasText: 'Backup' }).click();
await verificar(async () => [(await texto('[data-teste=b-ultimo]')) === 'nunca', 'último backup: nunca']);
await p.locator('.btn-principal', { hasText: 'Exportar backup' }).click();
await p.waitForFunction(() => window.__compartilhado, null, { timeout: 5000 });
const comp = await p.evaluate(() => window.__compartilhado);
const json = JSON.parse(comp.texto);
conferir(/^prato-do-dia-backup-\d{4}-\d{2}-\d{2}\.json$/.test(comp.nome), `arquivo para compartilhar: ${comp.nome}`);
conferir(json.tabelas.registros.length === 2 && json.tabelas.compras.length === 2 && json.tabelas.jejuns.length === 1,
  `backup tem tudo: ${Object.entries(json.tabelas).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
await verificar(async () => [(await texto('[data-teste=b-ultimo]')) === 'hoje', 'último backup: hoje']);
await foto('19-backup');

// Apaga tudo (como num celular novo) e restaura pelo arquivo
await p.evaluate(async () => { const db = window.pratoDb; await Promise.all(db.tables.map((t) => t.clear())); });
await p.reload();
await p.locator('.aba', { hasText: 'Mais' }).click();
await p.locator('.mais-item', { hasText: 'Backup' }).click();
await verificar(async () => [(await texto('[data-teste=b-dias]')) === '0', 'app vazio antes de restaurar']);
await p.locator('input[type=file]').setInputFiles({ name: comp.nome, mimeType: 'application/json', buffer: Buffer.from(comp.texto) });
await p.waitForSelector('.folha-titulo');
await foto('20-restaurar');
await p.locator('.folha .btn-principal', { hasText: 'Restaurar' }).click();
await p.waitForTimeout(500);
const depois = await p.evaluate(async () => {
  const db = window.pratoDb; const t = {};
  for (const tb of db.tables) t[tb.name] = (await tb.toArray()).filter((x) => x.chave !== 'copiaAntesDeRestaurar');
  return t;
});
conferir(JSON.stringify(depois) === JSON.stringify(json.tabelas), 'restaurou exatamente o que foi exportado');
await p.locator('[aria-label=Voltar]').click();
await p.locator('.aba', { hasText: 'Hoje' }).click();
await verificar(async () => [(await texto('[data-teste=consumido]')) === '300', `diário restaurado: hoje = ${await texto('[data-teste=consumido]')} kcal`]);
await p.locator('[aria-label="Dia anterior"]').click();
await p.waitForTimeout(300);
await verificar(async () => [(await texto('[data-teste=consumido]')) === '150', `diário restaurado: ontem = ${await texto('[data-teste=consumido]')} kcal`]);

// Arquivo errado é recusado sem mexer em nada
await p.locator('.aba', { hasText: 'Mais' }).click();
await p.locator('.mais-item', { hasText: 'Backup' }).click();
await p.locator('input[type=file]').setInputFiles({ name: 'foto.json', mimeType: 'application/json', buffer: Buffer.from('{"oi":1}') });
await p.waitForTimeout(300);
await verificar(async () => [(await texto('.aviso span')).includes('não é um backup'), `arquivo errado: "${await texto('.aviso span')}"`]);

// Sem internet
await p.evaluate(() => navigator.serviceWorker.ready);
await contexto.setOffline(true);
await p.reload();
await aba('Jejum');
await verificar(async () => [(await p.locator('.jejum-anel').count()) === 1, 'jejum abre sem internet']);

await nav.close();
servidor?.httpServer.close();
process.exit(falhou ? 1 : 0);
