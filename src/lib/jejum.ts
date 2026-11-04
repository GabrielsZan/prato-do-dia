import { db, type Jejum } from './db';
import type { ConfigJejum } from './config';

export const PLANOS = [
  { id: '12:12', horas: 12 },
  { id: '14:10', horas: 14 },
  { id: '16:8', horas: 16 },
  { id: '18:6', horas: 18 },
  { id: '20:4', horas: 20 },
  { id: 'personalizado', horas: 0 },
];

export const HORA = 3600_000;

export function horasDoPlano(cfg: ConfigJejum): number {
  return cfg.plano === 'personalizado' ? cfg.horasPersonalizado : PLANOS.find((p) => p.id === cfg.plano)?.horas ?? 16;
}

export const nomePlano = (plano: string, horas: number) => (plano === 'personalizado' ? `${horas} h` : plano);

// O jejum ativo é o que ainda não tem fim. Só pode haver um.
export async function jejumAtivo(): Promise<Jejum | undefined> {
  return (await db.jejuns.orderBy('inicio').reverse().toArray()).find((j) => j.fim == null);
}

export async function iniciarJejum(cfg: ConfigJejum, inicio = Date.now()): Promise<number> {
  const ativo = await jejumAtivo();
  if (ativo) return ativo.id!;
  return (await db.jejuns.add({ inicio, fim: null, plano: cfg.plano, metaHoras: horasDoPlano(cfg) })) as number;
}

export const encerrarJejum = (id: number, fim = Date.now()) => db.jejuns.update(id, { fim });

export interface Andamento { decorrido: number; meta: number; fracao: number; restante: number; terminaEm: number; completo: boolean }

export function andamento(j: Jejum, agora = Date.now()): Andamento {
  const fim = j.fim ?? agora;
  const decorrido = Math.max(0, fim - j.inicio);
  const meta = j.metaHoras * HORA;
  return {
    decorrido, meta,
    fracao: meta ? Math.min(1, decorrido / meta) : 0,
    restante: Math.max(0, meta - decorrido),
    terminaEm: j.inicio + meta,
    completo: decorrido >= meta,
  };
}

// "13:20:05"
export function relogio(ms: number): string {
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

// "2h40", "16h05", "35 min"
export function duracao(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}
