import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export interface Metas { kcal: number; proteina: number; carbo: number; gordura: number }

export interface RefeicaoDoDia {
  id: string;
  nome: string;
  hora: string; // "07:00": a partir de quando o + do meio escolhe esta refeição
}

export interface Perfil {
  sexo: 'm' | 'f';
  idade: number;
  alturaCm: number;
  pesoKg: number;
  atividade: number; // fator: 1,2 sedentário … 1,9 muito ativo
  ritmoKgSemana: number; // 0 = manter
}

export const PADRAO = {
  // 1.700 kcal e 120 g de proteína; gordura 25% das calorias; carboidrato o resto.
  metas: { kcal: 1700, proteina: 120, carbo: 199, gordura: 47 } as Metas,
  refeicoes: [
    { id: 'cafe', nome: 'Café da manhã', hora: '05:00' },
    { id: 'lanche-manha', nome: 'Lanche da manhã', hora: '09:30' },
    { id: 'almoco', nome: 'Almoço', hora: '11:30' },
    { id: 'lanche-tarde', nome: 'Lanche da tarde', hora: '15:00' },
    { id: 'jantar', nome: 'Jantar', hora: '19:00' },
  ] as RefeicaoDoDia[],
  perfil: null as Perfil | null,
  agua: { copoMl: 200, metaCopos: 10 } as ConfigAgua,
  metaPeso: null as number | null,
};

export interface ConfigAgua { copoMl: number; metaCopos: number }

export type ChaveConfig = keyof typeof PADRAO;

export async function lerConfig<K extends ChaveConfig>(chave: K): Promise<(typeof PADRAO)[K]> {
  const c = await db.config.get(chave);
  return (c?.valor as (typeof PADRAO)[K]) ?? PADRAO[chave];
}

export function salvarConfig<K extends ChaveConfig>(chave: K, valor: (typeof PADRAO)[K]) {
  return db.config.put({ chave, valor });
}

export function useConfig<K extends ChaveConfig>(chave: K): (typeof PADRAO)[K] {
  return useLiveQuery(() => lerConfig(chave), [chave]) ?? PADRAO[chave];
}

// Refeição que o + do meio abre, pelo horário atual.
export function refeicaoDoHorario(refeicoes: RefeicaoDoDia[], agora = new Date()): RefeicaoDoDia {
  const hm = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const ordenadas = [...refeicoes].sort((a, b) => a.hora.localeCompare(b.hora));
  let escolhida = ordenadas[ordenadas.length - 1]; // de madrugada, ainda é a última do dia
  for (const r of ordenadas) if (r.hora <= hm) escolhida = r;
  return escolhida;
}
