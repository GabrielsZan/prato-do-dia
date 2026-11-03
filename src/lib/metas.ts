import type { Metas, Perfil } from './config';

export const ATIVIDADES = [
  { fator: 1.2, nome: 'Sedentário', desc: 'pouco ou nenhum exercício' },
  { fator: 1.375, nome: 'Leve', desc: 'exercício 1–3 dias/semana' },
  { fator: 1.55, nome: 'Moderado', desc: 'exercício 3–5 dias/semana' },
  { fator: 1.725, nome: 'Alto', desc: 'exercício 6–7 dias/semana' },
  { fator: 1.9, nome: 'Muito alto', desc: 'treino pesado ou trabalho físico' },
];

export const RITMOS = [
  { kg: 0, nome: 'Manter o peso' },
  { kg: 0.25, nome: 'Perder 0,25 kg/semana' },
  { kg: 0.5, nome: 'Perder 0,5 kg/semana' },
  { kg: 0.75, nome: 'Perder 0,75 kg/semana' },
  { kg: 1, nome: 'Perder 1 kg/semana' },
];

// Metabolismo basal (Mifflin-St Jeor), em kcal/dia.
export function tmb(p: Perfil): number {
  return 10 * p.pesoKg + 6.25 * p.alturaCm - 5 * p.idade + (p.sexo === 'm' ? 5 : -161);
}

// ~7.700 kcal por kg de gordura.
export function calcularMeta(p: Perfil) {
  const basal = tmb(p);
  const gasto = basal * p.atividade;
  const meta = gasto - (p.ritmoKgSemana * 7700) / 7;
  return { basal: Math.round(basal), gasto: Math.round(gasto), meta: Math.round(meta / 10) * 10 };
}

// Aviso (sem bloquear) quando a meta fica baixa demais.
export function avisoMeta(kcal: number, perfil: Perfil | null): string | null {
  const minimo = perfil?.sexo === 'f' ? 1200 : 1500;
  if (perfil) {
    const basal = Math.round(tmb(perfil));
    if (kcal < basal) return `A meta está abaixo do seu metabolismo basal (${basal} kcal). Comer menos que isso por muito tempo não é recomendado.`;
  }
  if (kcal < minimo) return `A meta está abaixo de ${minimo} kcal, o que é muito baixo para a maioria das pessoas.`;
  return null;
}

// Distribui o que sobra da proteína: gordura com 25% das calorias, carboidrato com o resto.
export function distribuirMacros(kcal: number, proteina: number): Metas {
  const gordura = Math.round((kcal * 0.25) / 9);
  const carbo = Math.max(0, Math.round((kcal - proteina * 4 - gordura * 9) / 4));
  return { kcal, proteina, carbo, gordura };
}
