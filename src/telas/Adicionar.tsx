import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha, avisar } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db } from '../lib/db';
import { useConfig } from '../lib/config';
import { alimentoPorId, buscador, buscarPorCodigo, salvarProprio } from '../lib/alimentos';
import { buscarOFF } from '../lib/off';
import {
  calcular, copiarRefeicao, desfazer, fmtNum, qtdSugerida, registrar, registrarRefeicaoSalva, registrarSoCalorias, textoQtd,
} from '../lib/diario';
import type { Alimento, RefeicaoSalva, Uso } from '../lib/tipos';
import { FolhaQuantidade } from './FolhaQuantidade';
import { FolhaSoCalorias } from './FolhaSoCalorias';
import { FolhaCopiar } from './FolhaCopiar';
import { Escanear } from './Escanear';
import { FormAlimento, type Rascunho } from './FormAlimento';

interface Props {
  data: string;
  refeicao: string;
  onFechar: () => void;
}

type Aba = 'recentes' | 'favoritos' | 'salvas' | 'meus';

export function Adicionar({ data, refeicao: refInicial, onFechar }: Props) {
  const refeicoes = useConfig('refeicoes');
  const [refeicao, setRefeicao] = useState(refInicial);
  const [texto, setTexto] = useState('');
  const [aba, setAba] = useState<Aba>('recentes');
  const [aberto, setAberto] = useState<Alimento | null>(null);
  const [soCalorias, setSoCalorias] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [salvaAberta, setSalvaAberta] = useState<RefeicaoSalva | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [form, setForm] = useState<{ alimento?: Alimento; rascunho?: Rascunho } | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  const usos = useLiveQuery(() => db.uso.toArray(), []) ?? [];
  const salvas = useLiveQuery(() => db.refeicoesSalvas.orderBy('nome').toArray(), []) ?? [];
  const meus = useLiveQuery(() => db.alimentos.toArray(), [])?.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) ?? [];
  const usoMap = useMemo(() => new Map(usos.map((u) => [u.alimentoId, u])), [usos]);
  const resultados = useMemo(() => buscador.buscar(texto, usoMap), [texto, usoMap]);
  const nomeRef = refeicoes.find((r) => r.id === refeicao)?.nome ?? '';

  // O foco já veio da "ponte" (ver app.tsx); aqui só passa para o campo de verdade,
  // para o teclado do iPhone continuar aberto.
  useLayoutEffect(() => campo.current?.focus(), []);

  const recentes = usos.filter((u) => u.ultimoUso > 0).sort((a, b) => b.ultimoUso - a.ultimoUso).slice(0, 30);
  const favoritos = usos.filter((u) => u.favorito);

  // Código lido: primeiro procura nos salvos (funciona sem internet), depois no Open Food Facts.
  async function aoLerCodigo(codigo: string) {
    setEscaneando(false);
    const salvo = await buscarPorCodigo(codigo);
    if (salvo) return setAberto(alimentoPorId(salvo.id) ?? salvo);
    avisar('Buscando o produto…');
    const r = await buscarOFF(codigo);
    if (r.tipo === 'achou') {
      await salvarProprio(r.alimento);
      avisar(`${r.alimento.nome} encontrado`);
      return setAberto(r.alimento);
    }
    avisar(r.tipo === 'sem-internet' ? 'Sem internet. Cadastre pelo rótulo.' : r.tipo === 'incompleto' ? 'Produto sem calorias no Open Food Facts. Complete pelo rótulo.' : 'Produto não encontrado. Cadastre pelo rótulo.');
    setForm({ rascunho: { codigoBarras: codigo, ...(r.tipo === 'incompleto' ? { nome: r.nome, marca: r.marca } : {}) } });
  }

  async function rapido(a: Alimento) {
    if (texto) { setTexto(''); campo.current?.focus(); }
    const qtd = qtdSugerida(a, usoMap.get(a.id));
    const id = await registrar(data, refeicao, a, qtd);
    avisar(`${a.nome} · ${textoQtd(qtd)}`, () => desfazer([id]));
  }

  const linhaAlimento = (a: Alimento, u?: Uso) => {
    const qtd = qtdSugerida(a, u);
    const kcal = calcular(a.por100, qtd.gramas).kcal;
    return (
      <li key={a.id} class="linha-add">
        <button class="n" onClick={() => setAberto(a)}>
          <b>{a.nome}{u?.favorito ? <span class="estrela"> ★</span> : null}</b>
          <span>
            {texto && a.nomeOriginal ? `${a.nomeOriginal} · ` : ''}
            {u?.ultimaQtd ? `${textoQtd(qtd)} · ${kcal == null ? '—' : fmtNum(kcal, 0)} kcal` : `${a.por100.kcal == null ? '—' : fmtNum(a.por100.kcal, 0)} kcal/100 g`}
          </span>
        </button>
        <button class="btn-mais" aria-label={`Registrar ${a.nome}`} onClick={() => rapido(a)}><I.Mais /></button>
      </li>
    );
  };

  const lista = (us: Uso[]) => us.map((u) => {
    const a = alimentoPorId(u.alimentoId);
    return a ? linhaAlimento(a, u) : null;
  });

  return (
    <div class="tela-add">
      <header class="add-cab">
        <button class="btn-icone" aria-label="Fechar" onClick={onFechar}><I.Fechar /></button>
        <label class="add-ref">
          {nomeRef} <I.Abaixo />
          <select value={refeicao} onChange={(e) => setRefeicao(e.currentTarget.value)} aria-label="Refeição">
            {refeicoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>
        <button class="add-pronto" onClick={onFechar}>Pronto</button>
      </header>

      <label class="busca-campo">
        <I.Lupa />
        <input
          ref={campo}
          type="search"
          placeholder="Buscar alimento"
          autocomplete="off"
          autocorrect="off"
          enterkeyhint="search"
          value={texto}
          onInput={(e) => setTexto(e.currentTarget.value)}
        />
        {!texto && <button class="cod" aria-label="Ler código de barras" onClick={() => setEscaneando(true)}><I.Codigo /></button>}
        {texto && <button class="limpar" aria-label="Limpar" onClick={() => { setTexto(''); campo.current?.focus(); }}><I.Fechar tam={16} /></button>}
      </label>

      {!texto && (
        <>
          <div class="atalhos">
            <button class="atalho" onClick={() => setSoCalorias(true)}><I.Raio />Só calorias</button>
            <button class="atalho" onClick={() => setCopiando(true)}><I.Copiar />Copiar de outro dia</button>
            <button class="atalho" onClick={() => setForm({})}><I.Mais tam={16} />Criar alimento</button>
          </div>
          <div class="abinhas">
            <button class={aba === 'recentes' ? 'on' : ''} onClick={() => setAba('recentes')}>Recentes</button>
            <button class={aba === 'favoritos' ? 'on' : ''} onClick={() => setAba('favoritos')}>Favoritos</button>
            <button class={aba === 'salvas' ? 'on' : ''} onClick={() => setAba('salvas')}>Refeições salvas</button>
            <button class={aba === 'meus' ? 'on' : ''} onClick={() => setAba('meus')}>Meus</button>
          </div>
          <ul class="lista-add">
            {aba === 'recentes' && lista(recentes)}
            {aba === 'favoritos' && lista(favoritos)}
            {aba === 'meus' && meus.map((a) => linhaAlimento(a, usoMap.get(a.id)))}
            {aba === 'salvas' && salvas.map((s) => (
              <li key={s.id} class="linha-add">
                <button class="n" onClick={() => setSalvaAberta(s)}>
                  <b>{s.nome} <span class="selo-salva">SALVA</span></b>
                  <span>{resumoSalva(s)}</span>
                </button>
                <button class="btn-mais" aria-label={`Registrar ${s.nome}`} onClick={async () => {
                  const ids = await registrarRefeicaoSalva(s, data, refeicao, alimentoPorId);
                  avisar(`${s.nome} adicionada`, () => desfazer(ids));
                }}><I.Mais /></button>
              </li>
            ))}
          </ul>
          {aba === 'recentes' && !recentes.length && <p class="lista-vazia">Os alimentos que você registrar aparecem aqui. Toque no + para registrar de novo com a mesma quantidade.</p>}
          {aba === 'favoritos' && !favoritos.length && <p class="lista-vazia">Toque na estrela de um alimento para ele aparecer aqui.</p>}
          {aba === 'meus' && !meus.length && <p class="lista-vazia">Alimentos que você cadastrar ou escanear aparecem aqui.</p>}
          {aba === 'salvas' && !salvas.length && <p class="lista-vazia">Na tela Hoje, toque nos ⋯ de uma refeição e escolha "Salvar como refeição pronta".</p>}
        </>
      )}

      {texto && (
        <>
          <ul class="lista-add">{resultados.map((a) => linhaAlimento(a, usoMap.get(a.id)))}</ul>
          {!resultados.length && (
            <div class="lista-vazia">
              Nada encontrado para “{texto}”.
              <button class="atalho centro" onClick={() => setForm({ rascunho: { nome: texto } })}><I.Mais tam={16} />Cadastrar “{texto}”</button>
              <button class="atalho centro" onClick={() => setSoCalorias(true)}><I.Raio />Registrar só as calorias</button>
            </div>
          )}
        </>
      )}

      {aberto && (
        <FolhaQuantidade
          alimento={aberto}
          qtdInicial={qtdSugerida(aberto, usoMap.get(aberto.id))}
          refeicao={refeicao}
          refeicoes={refeicoes}
          onFechar={() => setAberto(null)}
          onEditar={aberto.fonte !== 'taco' && aberto.fonte !== 'extra' ? () => { setForm({ alimento: aberto }); setAberto(null); } : undefined}
          onConfirmar={async (qtd, ref) => {
            campo.current?.focus(); // ainda dentro do toque, para o teclado continuar aberto
            setAberto(null);
            setTexto('');
            const id = await registrar(data, ref, aberto, qtd);
            avisar(`${aberto.nome} · ${textoQtd(qtd)}`, () => desfazer([id]));
          }}
        />
      )}

      {escaneando && <Escanear onCodigo={aoLerCodigo} onFechar={() => setEscaneando(false)} />}

      {form && (
        <FormAlimento
          alimento={form.alimento}
          rascunho={form.rascunho}
          onFechar={() => setForm(null)}
          onApagado={() => setForm(null)}
          onSalvo={(a) => { setForm(null); setTexto(''); setAberto(a); }}
        />
      )}

      {soCalorias && (
        <FolhaSoCalorias
          nomeRefeicao={nomeRef}
          onFechar={() => setSoCalorias(false)}
          onConfirmar={async (v) => {
            const id = await registrarSoCalorias(data, refeicao, v.nome || texto, v);
            setSoCalorias(false);
            setTexto('');
            avisar(`${fmtNum(v.kcal, 0)} kcal adicionadas`, () => desfazer([id]));
          }}
        />
      )}

      {copiando && (
        <FolhaCopiar
          data={data}
          nomeRefeicao={nomeRef}
          refeicoes={refeicoes}
          onFechar={() => setCopiando(false)}
          onCopiar={async (de, deRef) => {
            const novos = await copiarRefeicao(de, deRef, data, refeicao);
            setCopiando(false);
            avisar(`${novos.length} ${novos.length === 1 ? 'item copiado' : 'itens copiados'}`, () => desfazer(novos));
          }}
        />
      )}

      {salvaAberta && (
        <Folha onFechar={() => setSalvaAberta(null)}>
          <h2 class="folha-titulo">{salvaAberta.nome}</h2>
          <ul class="lista">
            {salvaAberta.itens.map((it, i) => {
              const a = alimentoPorId(it.alimentoId);
              const k = a ? calcular(a.por100, it.qtd.gramas).kcal : null;
              return (
                <li key={i} class="linha estatica">
                  <span class="n"><b>{a?.nome ?? 'Alimento removido'}</b><span>{textoQtd(it.qtd)}</span></span>
                  <span class="k">{k == null ? '—' : fmtNum(k, 0)}</span>
                </li>
              );
            })}
          </ul>
          <button class="btn-principal" onClick={async () => {
            const ids = await registrarRefeicaoSalva(salvaAberta, data, refeicao, alimentoPorId);
            setSalvaAberta(null);
            avisar(`${salvaAberta.nome} adicionada`, () => desfazer(ids));
          }}>Adicionar ao {nomeRef.toLowerCase()}</button>
          <div class="qtd-rodape"><span /><button class="qtd-apagar" onClick={async () => {
            await db.refeicoesSalvas.delete(salvaAberta.id!);
            setSalvaAberta(null);
          }}><I.Lixo /> Apagar refeição salva</button></div>
        </Folha>
      )}
    </div>
  );
}

function resumoSalva(s: RefeicaoSalva): string {
  let kcal = 0;
  const nomes: string[] = [];
  for (const it of s.itens) {
    const a = alimentoPorId(it.alimentoId);
    if (!a) continue;
    nomes.push(a.nome.toLowerCase());
    kcal += calcular(a.por100, it.qtd.gramas).kcal ?? 0;
  }
  return `${nomes.join(', ')} · ${fmtNum(kcal, 0)} kcal`;
}
