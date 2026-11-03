import { useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha, avisar } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db } from '../lib/db';
import { useConfig, type RefeicaoDoDia } from '../lib/config';
import { alimentoPorId } from '../lib/alimentos';
import {
  apagarRegistro, copiarRefeicao, desfazer, editarRegistro, fmtNum, salvarRefeicao, somar, textoQtd,
} from '../lib/diario';
import { dataCurta, hojeISO, nomeDoDia, somarDias } from '../lib/datas';
import type { Registro } from '../lib/tipos';
import { FolhaQuantidade } from './FolhaQuantidade';
import { FolhaSoCalorias } from './FolhaSoCalorias';
import { FolhaCopiar } from './FolhaCopiar';

interface Props {
  data: string;
  onData: (d: string) => void;
  onAdicionar: (refeicao: string) => void;
}

const OUTRAS: RefeicaoDoDia = { id: '_outras', nome: 'Outras refeições', hora: '23:59' };

export function Hoje({ data, onData, onAdicionar }: Props) {
  const metas = useConfig('metas');
  const refeicoes = useConfig('refeicoes');
  const regs = useLiveQuery(() => db.registros.where('data').equals(data).sortBy('criadoEm'), [data]);
  const ontem = useLiveQuery(() => db.registros.where('data').equals(somarDias(data, -1)).sortBy('criadoEm'), [data]) ?? [];
  const [editando, setEditando] = useState<Registro | null>(null);
  const [menu, setMenu] = useState<RefeicaoDoDia | null>(null);
  const [salvando, setSalvando] = useState<RefeicaoDoDia | null>(null);
  const [copiando, setCopiando] = useState<RefeicaoDoDia | null>(null);

  const lista = regs ?? [];
  const total = somar(lista);
  const restam = metas.kcal - total.kcal;
  const ids = new Set(refeicoes.map((r) => r.id));
  const orfaos = lista.filter((r) => !ids.has(r.refeicao)); // de refeições que foram removidas
  const cartoes = orfaos.length ? [...refeicoes, OUTRAS] : refeicoes;
  const itensDe = (r: RefeicaoDoDia) => (r === OUTRAS ? orfaos : lista.filter((x) => x.refeicao === r.id));

  const titulo = nomeDoDia(data);
  const ehHoje = data === hojeISO();

  // Anel: comprimento da volta = 2π·54
  const volta = 339.3;
  const fracao = Math.min(1, total.kcal / metas.kcal);
  const passou = restam < 0;

  async function repetirOntem(r: RefeicaoDoDia) {
    const novos = await copiarRefeicao(somarDias(data, -1), r.id, data, r.id);
    avisar(`${r.nome} de ontem repetido`, () => desfazer(novos));
  }

  return (
    <div class="tela-hoje">
      <header class="hoje-topo">
        <h1>{titulo === dataCurta(data) ? 'Diário' : titulo}</h1>
        <div class="dia">
          <button aria-label="Dia anterior" onClick={() => onData(somarDias(data, -1))}><I.Voltar tam={18} /></button>
          <label class="data">
            {dataCurta(data)}
            <input type="date" value={data} aria-label="Escolher data"
              onChange={(e) => e.currentTarget.value && onData(e.currentTarget.value)} />
          </label>
          <button aria-label="Próximo dia" onClick={() => onData(somarDias(data, 1))}><I.Avancar /></button>
        </div>
      </header>
      {!ehHoje && <button class="voltar-hoje" onClick={() => onData(hojeISO())}>Voltar para hoje</button>}

      <section class="cartao resumo">
        <div class="anel">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="54" fill="none" stroke="var(--linha)" stroke-width="12" />
            <circle cx="64" cy="64" r="54" fill="none" stroke={passou ? 'var(--laranja)' : 'var(--verde)'} stroke-width="12"
              stroke-linecap="round" stroke-dasharray={`${fracao * volta} ${volta}`} />
          </svg>
          <div class="meio">
            <span class="num" data-teste="restam">{fmtNum(Math.abs(restam), 0)}</span>
            <span class="rot">{passou ? 'kcal acima' : 'kcal restantes'}</span>
          </div>
        </div>
        <div class="macros">
          <div class="consumo"><b data-teste="consumido">{fmtNum(total.kcal, 0)}</b> de {fmtNum(metas.kcal, 0)} kcal</div>
          {([
            ['Proteína', total.proteina, metas.proteina, 'var(--laranja)'],
            ['Carboidrato', total.carbo, metas.carbo, 'var(--amarelo)'],
            ['Gordura', total.gordura, metas.gordura, 'var(--azul)'],
          ] as const).map(([nome, v, meta, cor]) => (
            <div class="macro" key={nome}>
              <div class="linha1"><span>{nome}</span><span><b>{fmtNum(v, 0)}</b> / {meta} g</span></div>
              <div class="barra"><i style={{ width: `${Math.min(100, (v / meta) * 100)}%`, background: cor }} /></div>
            </div>
          ))}
        </div>
      </section>

      <div class="refeicoes">
        {cartoes.map((r) => {
          const itens = itensDe(r);
          const doOntem = r === OUTRAS ? [] : ontem.filter((x) => x.refeicao === r.id);
          return (
            <section class="cartao ref" key={r.id} data-refeicao={r.id}>
              <div class="ref-cab">
                <div class="info">
                  <div class="nome">{r.nome}</div>
                  <div class="kcal">{itens.length ? `${fmtNum(somar(itens).kcal, 0)} kcal` : '—'}</div>
                </div>
                {itens.length > 0 && r !== OUTRAS && (
                  <button class="btn-icone" aria-label={`Opções do ${r.nome}`} onClick={() => setMenu(r)}><I.Reticencias /></button>
                )}
                {r !== OUTRAS && (
                  <button class="btn-mais" aria-label={`Adicionar no ${r.nome}`} onClick={() => onAdicionar(r.id)}><I.Mais /></button>
                )}
              </div>
              {itens.map((it) => (
                <button class="item" key={it.id} onClick={() => setEditando(it)}>
                  <span class="n">{it.nome}<span class="q">{it.alimentoId ? textoQtd(it.qtd) : 'só calorias'}</span></span>
                  <span class="k">{it.valores.kcal == null ? '—' : fmtNum(it.valores.kcal, 0)}</span>
                </button>
              ))}
              {!itens.length && doOntem.length > 0 && (
                <button class="sugestao" onClick={() => repetirOntem(r)}>
                  <I.Relogio />
                  <span>Repetir de ontem: <b>{doOntem.map((x) => x.nome.toLowerCase()).join(' + ')}</b> · {fmtNum(somar(doOntem).kcal, 0)} kcal</span>
                </button>
              )}
              {!itens.length && !doOntem.length && <div class="vazio">Nada registrado ainda</div>}
            </section>
          );
        })}
      </div>

      {editando && editando.alimentoId && alimentoPorId(editando.alimentoId) && (
        <FolhaQuantidade
          alimento={alimentoPorId(editando.alimentoId)!}
          qtdInicial={editando.qtd}
          refeicao={editando.refeicao}
          refeicoes={refeicoes}
          editando
          onFechar={() => setEditando(null)}
          onConfirmar={async (qtd, refeicao) => {
            await editarRegistro(editando.id!, { qtd, refeicao }, alimentoPorId(editando.alimentoId!));
            setEditando(null);
          }}
          onApagar={async () => {
            const { id, ...copia } = editando;
            await apagarRegistro(id!);
            setEditando(null);
            avisar(`${editando.nome} apagado`, () => db.registros.add(copia));
          }}
        />
      )}
      {editando && !editando.alimentoId && (
        <FolhaSoCalorias
          registro={editando}
          nomeRefeicao={refeicoes.find((r) => r.id === editando.refeicao)?.nome ?? ''}
          onFechar={() => setEditando(null)}
          onConfirmar={async (v) => {
            await db.registros.update(editando.id!, {
              nome: v.nome.trim() || 'Só calorias',
              valores: { ...editando.valores, kcal: v.kcal, proteina: v.proteina ?? null, carbo: v.carbo ?? null, gordura: v.gordura ?? null },
            });
            setEditando(null);
          }}
          onApagar={async () => {
            const { id, ...copia } = editando;
            await apagarRegistro(id!);
            setEditando(null);
            avisar(`${editando.nome} apagado`, () => db.registros.add(copia));
          }}
        />
      )}

      {menu && (
        <Folha onFechar={() => setMenu(null)}>
          <h2 class="folha-titulo">{menu.nome}</h2>
          <div class="menu">
            <button onClick={() => { setSalvando(menu); setMenu(null); }}>Salvar como refeição pronta</button>
            <button onClick={() => { setCopiando(menu); setMenu(null); }}>Copiar de outro dia</button>
            <button class="perigo" onClick={async () => {
              const itens = itensDe(menu);
              await db.registros.bulkDelete(itens.map((i) => i.id!));
              setMenu(null);
              avisar(`${menu.nome} apagado`, () => db.registros.bulkAdd(itens));
            }}>Apagar tudo do {menu.nome.toLowerCase()}</button>
          </div>
        </Folha>
      )}

      {salvando && <FolhaSalvar refeicao={salvando} data={data} onFechar={() => setSalvando(null)} />}

      {copiando && (
        <FolhaCopiar
          data={data}
          nomeRefeicao={copiando.nome}
          refeicoes={refeicoes}
          onFechar={() => setCopiando(null)}
          onCopiar={async (de, deRef) => {
            const novos = await copiarRefeicao(de, deRef, data, copiando.id);
            setCopiando(null);
            avisar('Refeição copiada', () => desfazer(novos));
          }}
        />
      )}
    </div>
  );
}

function FolhaSalvar({ refeicao, data, onFechar }: { refeicao: RefeicaoDoDia; data: string; onFechar: () => void }) {
  const [nome, setNome] = useState(`Meu ${refeicao.nome.toLowerCase()}`);
  return (
    <Folha onFechar={onFechar}>
      <h2 class="folha-titulo">Salvar refeição pronta</h2>
      <p class="folha-sub">Depois é só tocar no + em "Refeições salvas" para registrar tudo de uma vez.</p>
      <label class="campo largo">
        <span>Nome</span>
        <input value={nome} autoFocus onInput={(e) => setNome(e.currentTarget.value)} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <button class="btn-principal" disabled={!nome.trim()} onClick={async () => {
        await salvarRefeicao(nome, data, refeicao.id);
        onFechar();
        avisar(`"${nome.trim()}" salva`);
      }}>Salvar</button>
    </Folha>
  );
}

