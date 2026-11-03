// Open Food Facts: produtos pelo código de barras. Dados sob licença ODbL.
import type { Alimento, Nutrientes } from './tipos';

const API = 'https://world.openfoodfacts.org/api/v2/product/';
const CAMPOS = 'product_name,product_name_pt,generic_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit';

export type ResultadoOFF =
  | { tipo: 'achou'; alimento: Alimento }
  | { tipo: 'incompleto'; nome?: string; marca?: string } // existe, mas sem calorias
  | { tipo: 'nao-existe' }
  | { tipo: 'sem-internet' };

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

// Transforma a resposta da API num alimento do app.
export function lerProdutoOFF(codigo: string, json: any): ResultadoOFF {
  const p = json?.status === 1 ? json.product : null;
  if (!p) return { tipo: 'nao-existe' };
  const nome = (p.product_name_pt || p.product_name || p.generic_name || '').trim() || undefined;
  const marca = (p.brands || '').split(',')[0]?.trim() || undefined;
  const n = p.nutriments ?? {};
  // Sem kcal, mas com kJ: converte (1 kcal = 4,184 kJ).
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? num(n['energy_100g'])! / 4.184 : null);
  if (kcal == null || !nome) return { tipo: 'incompleto', nome, marca };
  const sodio = num(n['sodium_100g']); // vem em gramas
  const por100: Nutrientes = {
    kcal: Math.round(kcal * 10) / 10,
    proteina: num(n['proteins_100g']),
    carbo: num(n['carbohydrates_100g']),
    gordura: num(n['fat_100g']),
    fibra: num(n['fiber_100g']),
    sodio: sodio == null ? null : Math.round(sodio * 1000),
  };
  const porcaoG = num(p.serving_quantity);
  const unidade = (p.serving_quantity_unit || 'g').toLowerCase();
  const porcoes = porcaoG && porcaoG > 0 && (unidade === 'g' || unidade === 'ml')
    ? [{ nome: '1 porção', gramas: porcaoG }]
    : undefined;
  return {
    tipo: 'achou',
    alimento: { id: `off:${codigo}`, fonte: 'off', nome, marca, codigoBarras: codigo, por100, porcoes },
  };
}

export async function buscarOFF(codigo: string, tempoMs = 8000): Promise<ResultadoOFF> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), tempoMs);
  try {
    const r = await fetch(`${API}${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`, { signal: ctrl.signal });
    if (r.status === 404) return { tipo: 'nao-existe' };
    if (!r.ok) return { tipo: 'sem-internet' };
    return lerProdutoOFF(codigo, await r.json());
  } catch {
    return { tipo: 'sem-internet' };
  } finally {
    clearTimeout(t);
  }
}

// Confere o dígito verificador de EAN-8, UPC-A (12) e EAN-13.
export function codigoValido(c: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(c)) return false;
  const d = c.split('').map(Number);
  const verif = d.pop()!;
  const soma = d.reverse().reduce((s, x, i) => s + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === verif;
}
