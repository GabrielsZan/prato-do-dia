import { db, type Peso } from './db';
import { somar } from './diario';
import { deISO, paraISO, somarDias } from './datas';
import type { Registro } from './tipos';

// Dentro da meta: entre 80% e 105% das calorias da meta.
export const dentroDaMeta = (kcal: number, meta: number) => kcal >= meta * 0.8 && kcal <= meta * 1.05;

export interface ResumoDia { data: string; kcal: number; proteina: number; itens: number }

export function resumirDias(regs: Registro[]): Map<string, ResumoDia> {
  const porDia = new Map<string, Registro[]>();
  for (const r of regs) {
    const l = porDia.get(r.data);
    if (l) l.push(r); else porDia.set(r.data, [r]);
  }
  const res = new Map<string, ResumoDia>();
  for (const [data, l] of porDia) {
    const t = somar(l);
    res.set(data, { data, kcal: t.kcal, proteina: t.proteina, itens: l.length });
  }
  return res;
}

// Dias seguidos com algo registrado. Se hoje ainda está vazio, a sequência continua viva desde ontem.
export function sequencia(dias: Map<string, ResumoDia>, hoje: string): number {
  let d = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (dias.has(d)) { n++; d = somarDias(d, -1); }
  return n;
}

export const segundaDaSemana = (s: string) => {
  const d = deISO(s);
  return somarDias(s, -((d.getDay() + 6) % 7));
};

export interface Semana {
  inicio: string;
  dias: { data: string; resumo?: ResumoDia; futuro: boolean; hoje: boolean }[];
  completos: number; // dias já fechados (antes de hoje) com registro
  mediaKcal: number | null;
  mediaProteina: number | null;
  naMeta: number;
}

// Médias só dos dias completos: antes de hoje e com algo registrado.
export function resumoSemana(inicio: string, dias: Map<string, ResumoDia>, hoje: string, metaKcal: number): Semana {
  const lista = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(inicio, i);
    return { data, resumo: dias.get(data), futuro: data > hoje, hoje: data === hoje };
  });
  const fechados = lista.filter((d) => d.data < hoje && d.resumo).map((d) => d.resumo!);
  const media = (f: (r: ResumoDia) => number) => (fechados.length ? fechados.reduce((s, r) => s + f(r), 0) / fechados.length : null);
  return {
    inicio,
    dias: lista,
    completos: fechados.length,
    mediaKcal: media((r) => r.kcal),
    mediaProteina: media((r) => r.proteina),
    naMeta: fechados.filter((r) => dentroDaMeta(r.kcal, metaKcal)).length,
  };
}

export async function carregarDias(desde: string): Promise<Map<string, ResumoDia>> {
  return resumirDias(await db.registros.where('data').aboveOrEqual(desde).toArray());
}

export interface ResumoPeso { atual: Peso; primeiro: Peso; variacao: number; semanas: number }

export function resumoPeso(pesos: Peso[]): ResumoPeso | null {
  if (!pesos.length) return null;
  const ord = [...pesos].sort((a, b) => a.data.localeCompare(b.data));
  const primeiro = ord[0], atual = ord[ord.length - 1];
  const dias = (deISO(atual.data).getTime() - deISO(primeiro.data).getTime()) / 86400000;
  return { atual, primeiro, variacao: Math.round((atual.kg - primeiro.kg) * 10) / 10, semanas: Math.round(dias / 7) };
}

export const hojeMenos = (dias: number) => paraISO(new Date(Date.now() - dias * 86400000));
