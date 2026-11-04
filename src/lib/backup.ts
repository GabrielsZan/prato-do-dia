import { db } from './db';

// Formato do arquivo de backup. Ao mudar o banco (db.version), aumentar VERSAO e saber ler as anteriores.
export const VERSAO = 1;
const COPIA = 'copiaAntesDeRestaurar'; // guardada em config; nunca vai para dentro de um backup

export interface Backup {
  app: 'prato-do-dia';
  versao: number;
  exportadoEm: string;
  tabelas: Record<string, unknown[]>;
}

export async function gerarBackup(): Promise<Backup> {
  const tabelas: Record<string, unknown[]> = {};
  await db.transaction('r', db.tables, async () => {
    for (const t of db.tables) {
      const linhas = await t.toArray();
      tabelas[t.name] = t.name === 'config' ? linhas.filter((c: any) => c.chave !== COPIA) : linhas;
    }
  });
  return { app: 'prato-do-dia', versao: VERSAO, exportadoEm: new Date().toISOString(), tabelas };
}

export function lerBackup(texto: string): Backup {
  let j: any;
  try { j = JSON.parse(texto); } catch { throw new Error('Esse arquivo não é um backup do Prato do Dia.'); }
  if (j?.app !== 'prato-do-dia' || typeof j.versao !== 'number' || typeof j.tabelas !== 'object') {
    throw new Error('Esse arquivo não é um backup do Prato do Dia.');
  }
  if (j.versao > VERSAO) throw new Error('Esse backup é de uma versão mais nova do app. Atualize o app e tente de novo.');
  return j as Backup;
}

export function resumoBackup(b: Backup) {
  const regs = (b.tabelas.registros ?? []) as { data: string }[];
  return {
    dias: new Set(regs.map((r) => r.data)).size,
    registros: regs.length,
    alimentos: (b.tabelas.alimentos ?? []).length,
    pesagens: (b.tabelas.peso ?? []).length,
    jejuns: (b.tabelas.jejuns ?? []).length,
  };
}

// Substitui tudo pelo conteúdo do backup. Antes guarda o estado atual para poder desfazer.
export async function restaurar(b: Backup, guardarCopia = true) {
  const copia = guardarCopia ? await gerarBackup() : null;
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear();
      const linhas = b.tabelas[t.name];
      if (Array.isArray(linhas) && linhas.length) await t.bulkAdd(linhas);
    }
    if (copia) await db.config.put({ chave: COPIA, valor: copia });
  });
}

export async function copiaAnterior(): Promise<Backup | null> {
  return ((await db.config.get(COPIA))?.valor as Backup) ?? null;
}

export async function desfazerRestauracao(): Promise<boolean> {
  const c = await copiaAnterior();
  if (!c) return false;
  await restaurar(c, false); // a cópia some junto, porque config é substituída
  return true;
}

export const nomeArquivo = (d = new Date()) =>
  `prato-do-dia-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;

// No iPhone abre a tela de compartilhar (WhatsApp, Drive, Arquivos). No computador, baixa o arquivo.
export async function compartilharBackup(): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const b = await gerarBackup();
  const arquivo = new File([JSON.stringify(b)], nomeArquivo(), { type: 'application/json' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Backup do Prato do Dia' });
      return 'compartilhado';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado';
      throw e;
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = Object.assign(document.createElement('a'), { href: url, download: arquivo.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'baixado';
}
