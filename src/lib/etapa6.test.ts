import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { andamento, duracao, encerrarJejum, HORA, horasDoPlano, iniciarJejum, jejumAtivo, relogio } from './jejum';
import { desfazerRestauracao, gerarBackup, lerBackup, restaurar, resumoBackup } from './backup';
import { salvarConfig } from './config';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('jejum', () => {
  it('horas do plano', () => {
    expect(horasDoPlano({ plano: '16:8', horasPersonalizado: 10 })).toBe(16);
    expect(horasDoPlano({ plano: 'personalizado', horasPersonalizado: 10 })).toBe(10);
  });

  it('andamento e textos', () => {
    const j = { inicio: 0, fim: null, plano: '16:8', metaHoras: 16 };
    const a = andamento(j, 13 * HORA + 20 * 60000 + 5000);
    expect(relogio(a.decorrido)).toBe('13:20:05');
    expect(duracao(a.restante)).toBe('2h40');
    expect(Math.round(a.fracao * 100)).toBe(83);
    expect(a.completo).toBe(false);
    expect(andamento(j, 17 * HORA).completo).toBe(true);
  });

  it('só um jejum ativo por vez', async () => {
    const cfg = { plano: '16:8', horasPersonalizado: 16 };
    const id = await iniciarJejum(cfg, 1000);
    expect(await iniciarJejum(cfg, 2000)).toBe(id);
    await encerrarJejum(id, 5000);
    expect(await jejumAtivo()).toBeUndefined();
    expect((await db.jejuns.get(id))?.fim).toBe(5000);
  });
});

describe('backup', () => {
  async function encher() {
    await db.registros.bulkAdd([
      { data: '2026-11-03', refeicao: 'cafe', alimentoId: 'taco:53', nome: 'Pão francês', qtd: { gramas: 50 }, criadoEm: 1,
        valores: { kcal: 150, proteina: 4, carbo: 29, gordura: 1.6, fibra: null, sodio: null } },
      { data: '2026-11-04', refeicao: 'almoco', alimentoId: null, nome: 'Só calorias', qtd: { gramas: 0 }, criadoEm: 2,
        valores: { kcal: 300, proteina: null, carbo: null, gordura: null, fibra: null, sodio: null } },
    ]);
    await db.alimentos.put({ id: 'proprio:1', fonte: 'proprio', nome: 'Goma', por100: { kcal: 240, proteina: 0, carbo: 60, gordura: 0, fibra: null, sodio: null } });
    await db.peso.put({ data: '2026-11-04', kg: 84.2 });
    await db.agua.put({ data: '2026-11-04', copos: 6 });
    await db.uso.put({ alimentoId: 'taco:53', favorito: 1, ultimoUso: 5, vezes: 3 });
    await db.compras.add({ texto: 'Ovos', feito: 0, criadoEm: 1 });
    await db.jejuns.add({ inicio: 1, fim: 2, plano: '16:8', metaHoras: 16 });
    await salvarConfig('metas', { kcal: 1800, proteina: 130, carbo: 200, gordura: 50 });
  }

  it('exportar e importar não perde nada', async () => {
    await encher();
    const antes = await gerarBackup();
    const texto = JSON.stringify(antes);
    await Promise.all(db.tables.map((t) => t.clear()));
    await restaurar(lerBackup(texto));
    const depois = await gerarBackup();
    expect(depois.tabelas).toEqual(antes.tabelas);
    expect(resumoBackup(depois)).toEqual({ dias: 2, registros: 2, alimentos: 1, pesagens: 1, jejuns: 1 });
  });

  it('restaurar substitui tudo e dá para desfazer', async () => {
    await encher();
    const original = await gerarBackup();
    const vazio = { ...original, tabelas: { registros: [{ ...(original.tabelas.registros[0] as object) }] } };
    await restaurar(vazio);
    expect(await db.registros.count()).toBe(1);
    expect(await db.peso.count()).toBe(0);
    expect(await desfazerRestauracao()).toBe(true);
    expect((await gerarBackup()).tabelas).toEqual(original.tabelas);
  });

  it('o backup não carrega a cópia de segurança dentro', async () => {
    await encher();
    await restaurar(await gerarBackup());
    const b = await gerarBackup();
    expect((b.tabelas.config as { chave: string }[]).some((c) => c.chave === 'copiaAntesDeRestaurar')).toBe(false);
  });

  it('recusa arquivos errados', () => {
    expect(() => lerBackup('oi')).toThrow(/não é um backup/);
    expect(() => lerBackup('{"app":"outro"}')).toThrow(/não é um backup/);
    expect(() => lerBackup('{"app":"prato-do-dia","versao":99,"tabelas":{}}')).toThrow(/versão mais nova/);
  });
});
