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

export function alimentoPorId(id: string): Alimento | undefined {
  return porId.get(id);
}
