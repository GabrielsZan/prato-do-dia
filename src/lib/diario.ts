import { db } from './db';
import type { Alimento, Nutrientes, Quantidade, RefeicaoSalva, Registro, Uso } from './tipos';

export const CAMPOS: (keyof Nutrientes)[] = ['kcal', 'proteina', 'carbo', 'gordura', 'fibra', 'sodio'];

// Valores para uma quantidade em gramas. null continua null ("sem dado").
export function calcular(por100: Nutrientes, gramas: number): Nutrientes {
  const r = {} as Nutrientes;
  for (const c of CAMPOS) r[c] = por100[c] == null ? null : (por100[c]! * gramas) / 100;
  return r;
}

// Soma de vários registros. "Sem dado" conta como 0 na soma.
export function somar(regs: Pick<Registro, 'valores'>[]): Record<keyof Nutrientes, number> {
  const t = { kcal: 0, proteina: 0, carbo: 0, gordura: 0, fibra: 0, sodio: 0 };
  for (const r of regs) for (const c of CAMPOS) t[c] += r.valores[c] ?? 0;
  return t;
}

// Texto da quantidade: "2 unidades · 100 g", "150 g"
export function textoQtd(q: Quantidade): string {
  const g = `${fmtNum(q.gramas)} g`;
  if (!q.porcao) return g;
  const vezes = q.vezes ?? 1;
  const nome = vezes === 1 ? q.porcao : plural(q.porcao, vezes);
  return `${nome} · ${g}`;
}

// "1 unidade" × 2 → "2 unidades"; "1 colher de sopa" × 1,5 → "1,5 colher de sopa"
function plural(porcao: string, vezes: number): string {
  const sem1 = porcao.replace(/^1\s+/, '');
  const [primeira, ...resto] = sem1.split(' ');
  const pl = vezes >= 2 ? pluralPalavra(primeira) : primeira;
  return `${fmtNum(vezes)} ${[pl, ...resto].join(' ')}`;
}

function pluralPalavra(p: string): string {
  if (/(ão)$/.test(p)) return p.replace(/ão$/, 'ões');
  if (/[aeiou]$/.test(p)) return p + 's';
  if (/r$|z$/.test(p)) return p + 'es';
  if (/l$/.test(p)) return p.replace(/l$/, 'is');
  return p;
}

export const fmtNum = (v: number, casas = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

async function marcarUso(alimentoId: string, qtd: Quantidade) {
  const u = await db.uso.get(alimentoId);
  await db.uso.put({
    alimentoId,
    favorito: u?.favorito ?? 0,
    ultimaQtd: qtd,
    ultimoUso: Date.now(),
    vezes: (u?.vezes ?? 0) + 1,
  });
}

export async function registrar(data: string, refeicao: string, alimento: Alimento, qtd: Quantidade): Promise<number> {
  const id = await db.registros.add({
    data, refeicao, alimentoId: alimento.id, nome: alimento.nome, qtd,
    valores: calcular(alimento.por100, qtd.gramas), criadoEm: Date.now(),
  });
  await marcarUso(alimento.id, qtd);
  return id as number;
}

export async function registrarSoCalorias(
  data: string, refeicao: string, nome: string, valores: Partial<Nutrientes> & { kcal: number },
): Promise<number> {
  return (await db.registros.add({
    data, refeicao, alimentoId: null, nome: nome.trim() || 'Só calorias', qtd: { gramas: 0 },
    valores: { kcal: valores.kcal, proteina: valores.proteina ?? null, carbo: valores.carbo ?? null,
      gordura: valores.gordura ?? null, fibra: null, sodio: null },
    criadoEm: Date.now(),
  })) as number;
}

// Mudar quantidade e/ou refeição. Recalcula a partir dos valores por 100 g do alimento.
export async function editarRegistro(id: number, mudancas: { qtd?: Quantidade; refeicao?: string }, alimento?: Alimento) {
  const r = await db.registros.get(id);
  if (!r) return;
  const novo: Partial<Registro> = {};
  if (mudancas.refeicao) novo.refeicao = mudancas.refeicao;
  if (mudancas.qtd && alimento) {
    novo.qtd = mudancas.qtd;
    novo.valores = calcular(alimento.por100, mudancas.qtd.gramas);
    await marcarUso(alimento.id, mudancas.qtd);
  }
  await db.registros.update(id, novo);
}

export const apagarRegistro = (id: number) => db.registros.delete(id);

export async function desfazer(ids: number[]) {
  await db.registros.bulkDelete(ids);
}

// Copia os itens de uma refeição de outro dia (mantém os valores gravados na época).
export async function copiarRefeicao(deData: string, deRefeicao: string, paraData: string, paraRefeicao: string): Promise<number[]> {
  const itens = await db.registros.where({ data: deData, refeicao: deRefeicao }).sortBy('criadoEm');
  const agora = Date.now();
  const novos = itens.map(({ id: _, ...r }, i) => ({ ...r, data: paraData, refeicao: paraRefeicao, criadoEm: agora + i }));
  return (await db.registros.bulkAdd(novos, { allKeys: true })) as number[];
}

export async function salvarRefeicao(nome: string, data: string, refeicao: string): Promise<number> {
  const itens = await db.registros.where({ data, refeicao }).sortBy('criadoEm');
  return (await db.refeicoesSalvas.add({
    nome: nome.trim(),
    itens: itens.filter((r) => r.alimentoId).map((r) => ({ alimentoId: r.alimentoId!, qtd: r.qtd })),
  })) as number;
}

export async function registrarRefeicaoSalva(
  salva: RefeicaoSalva, data: string, refeicao: string, buscar: (id: string) => Alimento | undefined,
): Promise<number[]> {
  const ids: number[] = [];
  for (const it of salva.itens) {
    const a = buscar(it.alimentoId);
    if (a) ids.push(await registrar(data, refeicao, a, it.qtd));
  }
  return ids;
}

export async function alternarFavorito(alimentoId: string): Promise<boolean> {
  const u = await db.uso.get(alimentoId);
  const fav: 0 | 1 = u?.favorito ? 0 : 1;
  const base: Uso = u ?? { alimentoId, favorito: 0, ultimoUso: 0, vezes: 0 };
  await db.uso.put({ ...base, favorito: fav });
  return fav === 1;
}

// Quantidade sugerida ao abrir um alimento: a última usada, senão 1 porção, senão 100 g.
export function qtdSugerida(alimento: Alimento, uso?: Uso): Quantidade {
  if (uso?.ultimaQtd) return uso.ultimaQtd;
  const p = alimento.porcoes?.[0];
  if (p) return { gramas: p.gramas, porcao: p.nome, vezes: 1 };
  return { gramas: 100 };
}
