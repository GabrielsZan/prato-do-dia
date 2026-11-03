// Valores nutricionais por 100 g. null = a fonte não tem o dado (mostrar "—", somar como 0).
export interface Nutrientes {
  kcal: number | null;
  proteina: number | null;
  carbo: number | null;
  gordura: number | null;
  fibra: number | null;
  sodio: number | null; // mg
}

export type Fonte = 'taco' | 'extra' | 'proprio' | 'off';

export interface Porcao {
  nome: string; // "1 unidade", "1 fatia", "1 colher de sopa"
  gramas: number;
}

export interface Alimento {
  id: string; // "taco:53", "extra:goma-tapioca", "proprio:<uuid>", "off:<código de barras>"
  fonte: Fonte;
  nome: string; // nome do dia a dia, mostrado em destaque
  nomeOriginal?: string; // nome na TACO, mostrado em letra menor
  outrosNomes?: string[]; // outros apelidos que também encontram este alimento
  padrao?: boolean; // versão mais comum quando a busca é genérica ("frango")
  marca?: string;
  codigoBarras?: string;
  por100: Nutrientes;
  porcoes?: Porcao[];
}

export interface Quantidade {
  gramas: number;
  porcao?: string; // nome da porção usada, se foi por porção
  vezes?: number; // quantas porções
}

// Como o Gabriel usa cada alimento (vale para TACO e para os próprios).
export interface Uso {
  alimentoId: string;
  favorito: 0 | 1;
  ultimaQtd?: Quantidade;
  ultimoUso: number; // timestamp; 0 = nunca usado
  vezes: number;
}

export interface Registro {
  id?: number;
  data: string; // "2026-11-03"
  refeicao: string; // id da refeição, ex.: "cafe"
  alimentoId: string | null; // null = "só calorias"
  nome: string;
  qtd: Quantidade;
  // Cópia dos valores já calculados para a quantidade, no momento do registro.
  valores: Nutrientes;
  criadoEm: number;
}

export interface ItemRefeicaoSalva {
  alimentoId: string;
  qtd: Quantidade;
}

export interface RefeicaoSalva {
  id?: number;
  nome: string;
  itens: ItemRefeicaoSalva[];
}
