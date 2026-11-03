import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { alimentoPorId } from './alimentos';
import {
  calcular, copiarRefeicao, editarRegistro, qtdSugerida, registrar, registrarRefeicaoSalva,
  registrarSoCalorias, salvarRefeicao, somar, textoQtd,
} from './diario';
import { avisoMeta, calcularMeta, distribuirMacros } from './metas';
import { refeicaoDoHorario, PADRAO } from './config';

const pao = alimentoPorId('taco:53')!; // 300 kcal, 8 g proteína por 100 g
const ovo = alimentoPorId('taco:488')!; // 146 kcal, 13,3 g proteína por 100 g
const doDia = (data: string) => db.registros.where('data').equals(data).toArray();

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('contas', () => {
  it('calcula a partir das gramas', () => {
    expect(calcular(pao.por100, 50).kcal).toBe(150);
    expect(calcular(pao.por100, 50).proteina).toBe(4);
  });

  it('"sem dado" fica null e conta 0 na soma', () => {
    const leite = alimentoPorId('taco:458')!; // leite integral, sem kcal na TACO
    expect(calcular(leite.por100, 200).kcal).toBeNull();
    expect(somar([{ valores: calcular(leite.por100, 200) }, { valores: calcular(pao.por100, 50) }]).kcal).toBe(150);
  });

  it('escreve a quantidade com porção', () => {
    expect(textoQtd({ gramas: 100, porcao: '1 unidade', vezes: 2 })).toBe('2 unidades · 100 g');
    expect(textoQtd({ gramas: 50, porcao: '1 unidade', vezes: 1 })).toBe('1 unidade · 50 g');
    expect(textoQtd({ gramas: 150 })).toBe('150 g');
  });
});

describe('diário', () => {
  it('soma do dia bate com as gramas', async () => {
    await registrar('2026-11-03', 'cafe', pao, { gramas: 50, porcao: '1 unidade', vezes: 1 });
    await registrar('2026-11-03', 'cafe', ovo, { gramas: 100, porcao: '1 unidade', vezes: 2 });
    await registrarSoCalorias('2026-11-03', 'lanche-tarde', 'salgado da cantina', { kcal: 300 });
    const t = somar(await doDia('2026-11-03'));
    expect(t.kcal).toBe(150 + 146 + 300);
    expect(t.proteina).toBeCloseTo(4 + 13.3, 5);
  });

  it('lembra a última quantidade usada', async () => {
    await registrar('2026-11-03', 'cafe', ovo, { gramas: 100, porcao: '1 unidade', vezes: 2 });
    expect(qtdSugerida(ovo, await db.uso.get(ovo.id))).toEqual({ gramas: 100, porcao: '1 unidade', vezes: 2 });
    expect(qtdSugerida(pao)).toEqual({ gramas: 50, porcao: '1 unidade', vezes: 1 });
  });

  it('editar recalcula e troca de refeição', async () => {
    const id = await registrar('2026-11-03', 'cafe', pao, { gramas: 50 });
    await editarRegistro(id, { qtd: { gramas: 100 }, refeicao: 'almoco' }, pao);
    const r = await db.registros.get(id);
    expect(r?.valores.kcal).toBe(300);
    expect(r?.refeicao).toBe('almoco');
  });

  it('copia a refeição de ontem', async () => {
    await registrar('2026-11-02', 'almoco', pao, { gramas: 50 });
    await registrar('2026-11-02', 'almoco', ovo, { gramas: 50 });
    await copiarRefeicao('2026-11-02', 'almoco', '2026-11-03', 'jantar');
    const hoje = await doDia('2026-11-03');
    expect(hoje.map((r) => r.refeicao)).toEqual(['jantar', 'jantar']);
    expect(somar(hoje).kcal).toBe(150 + 73);
    expect(await doDia('2026-11-02')).toHaveLength(2);
  });

  it('refeição salva registra tudo de uma vez', async () => {
    await registrar('2026-11-02', 'cafe', pao, { gramas: 50 });
    await registrar('2026-11-02', 'cafe', ovo, { gramas: 100 });
    const id = await salvarRefeicao('Meu café de sempre', '2026-11-02', 'cafe');
    const salva = (await db.refeicoesSalvas.get(id))!;
    await registrarRefeicaoSalva(salva, '2026-11-03', 'cafe', alimentoPorId);
    expect(somar(await doDia('2026-11-03')).kcal).toBe(150 + 146);
  });

  it('o histórico não muda se o alimento mudar depois', async () => {
    const meu = { ...pao, id: 'proprio:x', por100: { ...pao.por100 } };
    const id = await registrar('2026-11-03', 'cafe', meu, { gramas: 100 });
    meu.por100.kcal = 999;
    expect((await db.registros.get(id))?.valores.kcal).toBe(300);
  });
});

describe('metas', () => {
  it('Mifflin-St Jeor', () => {
    const r = calcularMeta({ sexo: 'm', idade: 30, alturaCm: 175, pesoKg: 85, atividade: 1.2, ritmoKgSemana: 0.5 });
    // 10×85 + 6,25×175 − 5×30 + 5 = 1798,75
    expect(r.basal).toBe(1799);
    expect(r.gasto).toBe(2159);
    expect(r.meta).toBe(1610);
  });

  it('avisa sem bloquear quando a meta é baixa', () => {
    const perfil = { sexo: 'm' as const, idade: 30, alturaCm: 175, pesoKg: 85, atividade: 1.2, ritmoKgSemana: 0.5 };
    expect(avisoMeta(1700, perfil)).toMatch(/metabolismo basal/);
    expect(avisoMeta(1900, perfil)).toBeNull();
    expect(avisoMeta(1300, null)).toMatch(/1500/);
  });

  it('a meta padrão fecha a conta', () => {
    expect(distribuirMacros(1700, 120)).toEqual(PADRAO.metas);
  });

  it('escolhe a refeição pelo horário', () => {
    const r = PADRAO.refeicoes;
    expect(refeicaoDoHorario(r, new Date(2026, 10, 3, 7, 0)).id).toBe('cafe');
    expect(refeicaoDoHorario(r, new Date(2026, 10, 3, 12, 30)).id).toBe('almoco');
    expect(refeicaoDoHorario(r, new Date(2026, 10, 3, 21, 0)).id).toBe('jantar');
    expect(refeicaoDoHorario(r, new Date(2026, 10, 3, 2, 0)).id).toBe('jantar');
  });
});
