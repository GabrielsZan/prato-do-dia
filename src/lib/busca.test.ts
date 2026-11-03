import { describe, expect, it } from 'vitest';
import { Buscador, normalizar } from './busca';
import { carregarCatalogo } from './catalogo';
import type { Uso } from './tipos';

const buscador = new Buscador(carregarCatalogo());
const primeiro = (q: string, uso?: Map<string, Uso>) => buscador.buscar(q, uso)[0]?.id;

describe('normalizar', () => {
  it('tira acentos, maiúsculas e pontuação', () => {
    expect(normalizar('Pão, trigo, FRANCÊS')).toBe('pao trigo frances');
  });
});

describe('busca', () => {
  it('encontra pelo nome do dia a dia', () => {
    expect(primeiro('pão francês')).toBe('taco:53');
    expect(primeiro('arroz branco')).toBe('taco:3');
    expect(primeiro('peito de frango')).toBe('taco:410');
    expect(primeiro('cuscuz')).toBe('taco:533');
    expect(primeiro('queijo minas')).toBe('taco:461');
    expect(primeiro('frango')).toBe('taco:410');
  });

  it('ignora acentos e maiúsculas', () => {
    expect(primeiro('PAO FRANCES')).toBe('taco:53');
    expect(primeiro('feijao')).toBe('taco:561');
  });

  it('casa as palavras em qualquer ordem', () => {
    expect(primeiro('francês pão')).toBe('taco:53');
    expect(primeiro('frango peito grelhado')).toBe('taco:410');
  });

  it('acha enquanto digita (começo da palavra)', () => {
    expect(buscador.buscar('banan').map((a) => a.id)).toContain('taco:182');
    expect(primeiro('ovo')).toBe('taco:488');
  });

  it('aceita plural', () => {
    expect(primeiro('ovos')).toBe('taco:488');
  });

  it('prefere o pronto para comer ao cru', () => {
    const ids = buscador.buscar('feijão carioca').map((a) => a.id);
    expect(ids.indexOf('taco:561')).toBeLessThan(ids.indexOf('taco:562'));
    const frango = buscador.buscar('frango coxa').map((a) => a.id);
    expect(frango.indexOf('taco:396')).toBeLessThan(frango.indexOf('taco:397'));
  });

  it('acha itens sem apelido pelo nome da TACO', () => {
    expect(primeiro('merluza assada')).toBe('taco:301');
  });

  it('recentes e favoritos vêm primeiro', () => {
    const uso = new Map<string, Uso>([
      ['taco:179', { alimentoId: 'taco:179', favorito: 1, ultimoUso: Date.now(), vezes: 5 }],
    ]);
    expect(primeiro('banana', uso)).toBe('taco:179');
  });
});
