import { describe, expect, it } from 'vitest';
import { dentroDaMeta, resumirDias, resumoPeso, resumoSemana, segundaDaSemana, sequencia } from './progresso';
import type { Registro } from './tipos';

const reg = (data: string, kcal: number, proteina = 0): Registro => ({
  data, refeicao: 'almoco', alimentoId: null, nome: 'x', qtd: { gramas: 0 }, criadoEm: 0,
  valores: { kcal, proteina, carbo: null, gordura: null, fibra: null, sodio: null },
});

describe('progresso', () => {
  it('dentro da meta = até a meta, sem passar', () => {
    expect(dentroDaMeta(900, 1700)).toBe(true);
    expect(dentroDaMeta(1700, 1700)).toBe(true);
    expect(dentroDaMeta(1701, 1700)).toBe(false);
    expect(dentroDaMeta(1786, 1700)).toBe(false);
  });

  it('soma por dia', () => {
    const d = resumirDias([reg('2026-11-02', 500, 30), reg('2026-11-02', 700, 40), reg('2026-11-03', 100)]);
    expect(d.get('2026-11-02')).toEqual({ data: '2026-11-02', kcal: 1200, proteina: 70, itens: 2 });
  });

  it('sequência de dias registrados', () => {
    const d = resumirDias(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-10-28'].map((x) => reg(x, 1)));
    expect(sequencia(d, '2026-11-03')).toBe(4); // hoje vazio: conta até ontem
    d.set('2026-11-03', { data: '2026-11-03', kcal: 1, proteina: 0, itens: 1 });
    expect(sequencia(d, '2026-11-03')).toBe(5);
    expect(sequencia(d, '2026-11-05')).toBe(0);
  });

  it('semana começa na segunda', () => {
    expect(segundaDaSemana('2026-11-04')).toBe('2026-11-02'); // quarta → segunda
    expect(segundaDaSemana('2026-11-08')).toBe('2026-11-02'); // domingo → segunda anterior
    expect(segundaDaSemana('2026-11-02')).toBe('2026-11-02');
  });

  it('médias da semana só com dias completos', () => {
    const d = resumirDias([
      reg('2026-11-02', 1600, 110), reg('2026-11-03', 2000, 130), // seg e ter
      reg('2026-11-04', 500, 30), // quarta = hoje, não entra
    ]);
    const s = resumoSemana('2026-11-02', d, '2026-11-04', 1700);
    expect(s.completos).toBe(2);
    expect(s.mediaKcal).toBe(1800);
    expect(s.mediaProteina).toBe(120);
    expect(s.naMeta).toBe(1); // 1600 sim, 2000 não
    expect(s.dias.filter((x) => x.futuro)).toHaveLength(4);
  });

  it('variação do peso', () => {
    const r = resumoPeso([{ data: '2026-10-06', kg: 86 }, { data: '2026-11-03', kg: 84.2 }, { data: '2026-10-20', kg: 85.3 }]);
    expect(r?.atual.kg).toBe(84.2);
    expect(r?.variacao).toBe(-1.8);
    expect(r?.semanas).toBe(4);
  });
});
