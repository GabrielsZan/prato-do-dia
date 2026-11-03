import porcoesJson from '../data/porcoes.json';
import { carregarCatalogo } from './catalogo';
import { Buscador } from './busca';
import { db } from './db';
import type { Alimento, Porcao } from './tipos';

const porcoes = porcoesJson as unknown as Record<string, Porcao[]>;

// Alimentos que vêm com o app, já com as porções caseiras.
const catalogo = carregarCatalogo().map((a) => {
  const p = porcoes[a.id];
  return p ? { ...a, porcoes: [...p, ...(a.porcoes ?? [])] } : a;
});
const porId = new Map(catalogo.map((a) => [a.id, a]));

export const buscador = new Buscador(catalogo);
export const totalCatalogo = catalogo.length;

// Junta os alimentos próprios e escaneados (do banco) aos do app.
export async function atualizarProprios() {
  const proprios = await db.alimentos.toArray();
  for (const a of proprios) porId.set(a.id, a);
  buscador.definir([...catalogo, ...proprios]);
}

// Alimento próprio ou escaneado: grava no banco e já entra na busca.
export async function salvarProprio(a: Alimento) {
  await db.alimentos.put(a);
  await atualizarProprios();
}

// Os registros antigos continuam no diário (eles guardam a própria cópia dos valores).
export async function apagarProprio(id: string) {
  await db.alimentos.delete(id);
  porId.delete(id);
  await atualizarProprios();
}

export const buscarPorCodigo = (codigo: string) => db.alimentos.where('codigoBarras').equals(codigo).first();

export function novoId(): string {
  return `proprio:${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
}

export function alimentoPorId(id: string): Alimento | undefined {
  return porId.get(id);
}
