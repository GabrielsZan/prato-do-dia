import Dexie, { type EntityTable } from 'dexie';
import type { Alimento, RefeicaoSalva, Registro, Uso } from './tipos';

export interface Agua { data: string; copos: number }
export interface Peso { data: string; kg: number }
export interface Jejum { id?: number; inicio: number; fim: number | null; plano: string }
export interface ItemCompra { id?: number; texto: string; feito: 0 | 1; criadoEm: number }
export interface Config { chave: string; valor: unknown }

// Nunca mudar o nome do banco: os dados do celular ficam presos a ele.
// Para mudar o formato, criar db.version(2) com a migração e manter a version(1).
export class BancoPrato extends Dexie {
  alimentos!: EntityTable<Alimento, 'id'>; // só próprios e escaneados; TACO e extras vêm do app
  uso!: EntityTable<Uso, 'alimentoId'>;
  registros!: EntityTable<Registro, 'id'>;
  refeicoesSalvas!: EntityTable<RefeicaoSalva, 'id'>;
  agua!: EntityTable<Agua, 'data'>;
  peso!: EntityTable<Peso, 'data'>;
  jejuns!: EntityTable<Jejum, 'id'>;
  compras!: EntityTable<ItemCompra, 'id'>;
  config!: EntityTable<Config, 'chave'>;

  constructor() {
    super('prato-do-dia');
    this.version(1).stores({
      alimentos: '&id, fonte, codigoBarras',
      uso: '&alimentoId, favorito, ultimoUso',
      registros: '++id, data, [data+refeicao], alimentoId',
      refeicoesSalvas: '++id, nome',
      agua: '&data',
      peso: '&data',
      jejuns: '++id, inicio',
      compras: '++id, feito',
      config: '&chave',
    });
  }
}

export const db = new BancoPrato();

// Pede ao navegador para não apagar os dados quando faltar espaço.
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
