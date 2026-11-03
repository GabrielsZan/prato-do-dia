import type { Alimento, Uso } from './tipos';

// Minúsculas, sem acentos, só letras e números separados por um espaço.
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LIGACOES = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'em', 'no', 'na']);
const PRONTO = /\b(cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|frit[oa]s?|refogad[oa]s?)\b/;
const CRU = /\b(cru|crua|crus|cruas)\b/;

// "ovos" → "ovo", "pães" → "pao", "limões" → "limao"
function singular(t: string): string {
  if (t.length <= 3) return t;
  if (/(oes|aes)$/.test(t)) return t.slice(0, -3) + 'ao';
  if (t.endsWith('s')) return t.slice(0, -1);
  return t;
}

// "assada" acha "assado", "cozido" acha "cozida"
function raiz(t: string): string {
  return t.length > 4 ? t.replace(/[ao]$/, '') : t;
}

interface Indexado {
  alimento: Alimento;
  nomeN: string; // nome do dia a dia normalizado
  apelidosN: string[]; // nome do dia a dia + outros nomes
  palavras: string[]; // todas as palavras de todos os nomes
  palavrasApelido: Set<string>;
  pronto: number; // +1 pronto para comer, -1 cru, 0 neutro
}

export class Buscador {
  private itens: Indexado[] = [];

  constructor(alimentos: Alimento[]) {
    this.definir(alimentos);
  }

  definir(alimentos: Alimento[]) {
    this.itens = alimentos.map((a) => {
      const apelidosN = [a.nome, ...(a.outrosNomes ?? [])].map(normalizar);
      const todos = [...apelidosN, normalizar(a.nomeOriginal ?? ''), normalizar(a.marca ?? '')];
      const palavras = [...new Set(todos.join(' ').split(' ').filter(Boolean))];
      const original = normalizar(a.nomeOriginal ?? a.nome);
      return {
        alimento: a,
        nomeN: apelidosN[0],
        apelidosN,
        palavras,
        palavrasApelido: new Set(apelidosN.join(' ').split(' ')),
        pronto: PRONTO.test(original) ? 1 : CRU.test(original) ? -1 : 0,
      };
    });
  }

  buscar(texto: string, uso: Map<string, Uso> = new Map(), limite = 40): Alimento[] {
    const q = normalizar(texto);
    if (!q) return [];
    let termos = q.split(' ');
    const semLigacao = termos.filter((t) => !LIGACOES.has(t));
    if (semLigacao.length) termos = semLigacao;
    const termosSing = termos.map((t) => raiz(singular(t)));
    const qSing = q.split(' ').map(singular).join(' ');

    const resultado: { a: Alimento; pontos: number }[] = [];
    for (const it of this.itens) {
      // Cada termo precisa ser começo de alguma palavra, em qualquer ordem.
      let todosNoApelido = true;
      let ok = true;
      for (let i = 0; i < termos.length; i++) {
        const t = termos[i], ts = termosSing[i];
        const casa = (p: string) => p.startsWith(t) || p.startsWith(ts);
        if (!it.palavras.some(casa)) { ok = false; break; }
        if (![...it.palavrasApelido].some(casa)) todosNoApelido = false;
      }
      if (!ok) continue;

      let pontos = 0;
      if (it.apelidosN.includes(q) || it.apelidosN.includes(qSing)) pontos += 100;
      else if (it.apelidosN.some((n) => n.startsWith(q) || n.startsWith(qSing))) pontos += 40;
      if (todosNoApelido && it.alimento.nomeOriginal) pontos += 30;
      if (it.alimento.fonte !== 'taco') pontos += 15; // próprios, escaneados e extras são os que ele usa de fato
      pontos += it.pronto * 8;
      if (it.alimento.padrao) pontos += 5;
      const u = uso.get(it.alimento.id);
      if (u) {
        if (u.favorito) pontos += 60;
        if (u.ultimoUso) pontos += 50 + Math.min(u.vezes, 20);
      }
      pontos -= it.nomeN.length * 0.1; // nomes curtos primeiro em caso de empate
      resultado.push({ a: it.alimento, pontos });
    }
    resultado.sort((x, y) => y.pontos - x.pontos);
    return resultado.slice(0, limite).map((r) => r.a);
  }
}
