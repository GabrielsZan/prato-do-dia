import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarOFFPorNome, codigoValido, lerProdutoOFF } from './off';

describe('Open Food Facts', () => {
  it('lê um produto completo', () => {
    const r = lerProdutoOFF('7891000100103', {
      status: 1,
      product: {
        product_name: 'Leite em pó integral', brands: 'Marca X, Outra',
        serving_quantity: 26, serving_quantity_unit: 'g',
        nutriments: { 'energy-kcal_100g': 496, proteins_100g: 25, carbohydrates_100g: 38, fat_100g: 27, sodium_100g: 0.35 },
      },
    });
    expect(r.tipo).toBe('achou');
    if (r.tipo !== 'achou') return;
    expect(r.alimento).toMatchObject({
      id: 'off:7891000100103', fonte: 'off', nome: 'Leite em pó integral', marca: 'Marca X',
      por100: { kcal: 496, proteina: 25, carbo: 38, gordura: 27, fibra: null, sodio: 350 },
      porcoes: [{ nome: '1 porção', gramas: 26 }],
    });
  });

  it('prefere o nome em português e converte kJ', () => {
    const r = lerProdutoOFF('1', { status: 1, product: { product_name: 'Milk', product_name_pt: 'Leite', nutriments: { energy_100g: 418.4 } } });
    expect(r.tipo === 'achou' && r.alimento.nome).toBe('Leite');
    expect(r.tipo === 'achou' && r.alimento.por100.kcal).toBe(100);
  });

  it('sem calorias vira cadastro, já com nome e marca', () => {
    expect(lerProdutoOFF('1', { status: 1, product: { product_name: 'Goma', brands: 'Y', nutriments: {} } }))
      .toEqual({ tipo: 'incompleto', nome: 'Goma', marca: 'Y' });
  });

  it('produto que não existe', () => {
    expect(lerProdutoOFF('1', { status: 0 })).toEqual({ tipo: 'nao-existe' });
  });

  it('confere o dígito do código', () => {
    expect(codigoValido('7894900011517')).toBe(true);
    expect(codigoValido('7894900011518')).toBe(false);
    expect(codigoValido('96385074')).toBe(true);
    expect(codigoValido('123')).toBe(false);
  });
});

describe('busca por nome no Open Food Facts', () => {
  afterEach(() => vi.unstubAllGlobals());
  const resposta = (corpo: unknown, ok = true, status = 200) =>
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status, json: async () => { if (typeof corpo === 'string') throw new Error('html'); return corpo; } })));

  it('traz só produtos com calorias, sem repetidos', async () => {
    resposta({ products: [
      { code: '1', product_name: 'Iogurte A', brands: 'Itambé', nutriments: { 'energy-kcal_100g': 75 } },
      { code: '1', product_name: 'Iogurte A', brands: 'Itambé', nutriments: { 'energy-kcal_100g': 75 } },
      { code: '2', product_name: 'Iogurte B', nutriments: {} },
      { code: '3', product_name: 'Iogurte C', brands: 'Danone', nutriments: { 'energy-kcal_100g': 52 } },
    ] });
    const r = await buscarOFFPorNome('iogurte');
    expect(r.tipo === 'ok' && r.alimentos.map((a) => [a.id, a.marca])).toEqual([['off:1', 'Itambé'], ['off:3', 'Danone']]);
  });

  it('página de limite vira "ocupado"', async () => {
    resposta('<!DOCTYPE html>');
    expect((await buscarOFFPorNome('x')).tipo).toBe('ocupado');
  });

  it('falha de rede: sem internet só se o celular estiver desconectado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    vi.stubGlobal('navigator', { onLine: false });
    expect((await buscarOFFPorNome('x')).tipo).toBe('sem-internet');
    vi.stubGlobal('navigator', { onLine: true });
    expect((await buscarOFFPorNome('x')).tipo).toBe('ocupado');
  });
});
