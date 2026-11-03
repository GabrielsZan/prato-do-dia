// Datas como texto "AAAA-MM-DD" no fuso do celular (não usar toISOString, que é UTC).
export function paraISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function deISO(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const hojeISO = () => paraISO(new Date());

export function somarDias(s: string, n: number): string {
  const d = deISO(s);
  d.setDate(d.getDate() + n);
  return paraISO(d);
}

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "Ter, 3 nov"
export function dataCurta(s: string): string {
  const d = deISO(s);
  return `${SEMANA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

// "Hoje", "Ontem", "Amanhã" ou "Ter, 3 nov"
export function nomeDoDia(s: string, hoje = hojeISO()): string {
  if (s === hoje) return 'Hoje';
  if (s === somarDias(hoje, -1)) return 'Ontem';
  if (s === somarDias(hoje, 1)) return 'Amanhã';
  return dataCurta(s);
}
