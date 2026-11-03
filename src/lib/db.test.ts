import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BancoPrato } from './db';

describe('banco local', () => {
  it('guarda um registro e continua lá depois de reabrir', async () => {
    const a = new BancoPrato();
    await a.registros.add({
      data: '2026-11-03', refeicao: 'cafe', alimentoId: 'taco:53', nome: 'Pão francês',
      qtd: { gramas: 50, porcao: '1 unidade', vezes: 1 },
      valores: { kcal: 150, proteina: 4, carbo: 29.3, gordura: 1.6, fibra: 1.2, sodio: 324 },
      criadoEm: Date.now(),
    });
    await a.uso.put({ alimentoId: 'taco:53', favorito: 1, ultimoUso: Date.now(), vezes: 1 });
    a.close();

    const b = new BancoPrato();
    const doDia = await b.registros.where({ data: '2026-11-03', refeicao: 'cafe' }).toArray();
    expect(doDia).toHaveLength(1);
    expect(doDia[0].valores.kcal).toBe(150);
    expect((await b.uso.get('taco:53'))?.favorito).toBe(1);
  });
});
