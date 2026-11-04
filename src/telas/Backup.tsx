import { useRef, useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha, avisar } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db } from '../lib/db';
import { salvarConfig, useConfig } from '../lib/config';
import { atualizarProprios } from '../lib/alimentos';
import { compartilharBackup, copiaAnterior, desfazerRestauracao, lerBackup, restaurar, resumoBackup, type Backup as TBackup } from '../lib/backup';

function haQuanto(ms: number | null): string {
  if (!ms) return 'nunca';
  const dias = Math.floor((Date.now() - ms) / 86400000);
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
}

export function Backup({ onVoltar }: { onVoltar: () => void }) {
  const ultimo = useConfig('ultimoBackup');
  const contagem = useLiveQuery(async () => ({
    dias: new Set((await db.registros.toArray()).map((r) => r.data)).size,
    alimentos: await db.alimentos.count(),
    pesagens: await db.peso.count(),
  }), []);
  const temCopia = useLiveQuery(() => copiaAnterior().then(Boolean), []);
  const [arquivo, setArquivo] = useState<TBackup | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function exportar() {
    setOcupado(true);
    try {
      const r = await compartilharBackup();
      if (r !== 'cancelado') {
        await salvarConfig('ultimoBackup', Date.now());
        avisar(r === 'baixado' ? 'Backup baixado' : 'Backup pronto');
      }
    } catch {
      avisar('Não consegui gerar o backup. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function escolher(f: File | undefined) {
    if (!f) return;
    try {
      setArquivo(lerBackup(await f.text()));
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      if (entrada.current) entrada.current.value = '';
    }
  }

  const resumo = arquivo ? resumoBackup(arquivo) : null;

  return (
    <div class="tela-simples">
      <header class="sub-cab">
        <button class="btn-icone" aria-label="Voltar" onClick={onVoltar}><I.Voltar /></button>
        <h1>Backup</h1>
      </header>

      <section class="cartao bloco">
        <h2>Seus dados ficam só neste iPhone</h2>
        <p class="nota">Faça um backup de vez em quando e guarde no WhatsApp (mande para você mesmo), no Drive ou em Arquivos. Se o app for apagado, é com ele que você recupera tudo.</p>
        <div class="info-linhas">
          <div><span>Dias registrados</span><b data-teste="b-dias">{contagem?.dias ?? '—'}</b></div>
          <div><span>Alimentos próprios</span><b>{contagem?.alimentos ?? '—'}</b></div>
          <div><span>Pesagens</span><b>{contagem?.pesagens ?? '—'}</b></div>
          <div><span>Último backup</span><b data-teste="b-ultimo">{haQuanto(ultimo)}</b></div>
        </div>
        <button class="btn-principal" disabled={ocupado} onClick={exportar}>Exportar backup</button>
        <p class="nota centro">Abre a tela de compartilhar do iPhone</p>
      </section>

      <section class="cartao bloco">
        <h2>Restaurar um backup</h2>
        <p class="alerta">Restaurar substitui tudo o que está no app agora pelo conteúdo do arquivo. Antes, o app guarda uma cópia do estado atual para você poder desfazer.</p>
        <label class="btn-secundario rel">
          Escolher arquivo…
          <input ref={entrada} type="file" accept=".json,application/json" aria-label="Arquivo de backup"
            onChange={(e) => escolher(e.currentTarget.files?.[0])} />
        </label>
        {temCopia && (
          <button class="link centro" onClick={async () => {
            await desfazerRestauracao();
            await atualizarProprios();
            avisar('Restauração desfeita');
          }}>Desfazer a última restauração</button>
        )}
      </section>

      {arquivo && resumo && (
        <Folha onFechar={() => setArquivo(null)}>
          <h2 class="folha-titulo">Restaurar este backup?</h2>
          <p class="folha-sub">Feito em {new Date(arquivo.exportadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>
          <div class="info-linhas">
            <div><span>Dias registrados</span><b>{resumo.dias}</b></div>
            <div><span>Registros</span><b>{resumo.registros}</b></div>
            <div><span>Alimentos próprios</span><b>{resumo.alimentos}</b></div>
            <div><span>Pesagens</span><b>{resumo.pesagens}</b></div>
            <div><span>Jejuns</span><b>{resumo.jejuns}</b></div>
          </div>
          <p class="alerta">O que está no app agora será substituído (dá para desfazer depois).</p>
          <button class="btn-principal" disabled={ocupado} onClick={async () => {
            setOcupado(true);
            try {
              await restaurar(arquivo);
              await atualizarProprios();
              setArquivo(null);
              avisar('Backup restaurado');
            } catch {
              avisar('Não consegui restaurar. Nada foi mudado.');
            } finally {
              setOcupado(false);
            }
          }}>Restaurar</button>
        </Folha>
      )}
    </div>
  );
}
