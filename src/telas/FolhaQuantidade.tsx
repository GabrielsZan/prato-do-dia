import { useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db } from '../lib/db';
import { alternarFavorito, calcular, fmtNum } from '../lib/diario';
import type { RefeicaoDoDia } from '../lib/config';
import type { Alimento, Quantidade } from '../lib/tipos';

interface Props {
  alimento: Alimento;
  qtdInicial: Quantidade;
  refeicao: string;
  refeicoes: RefeicaoDoDia[];
  editando?: boolean;
  onConfirmar: (qtd: Quantidade, refeicao: string) => void;
  onApagar?: () => void;
  onEditar?: () => void; // alimentos próprios e escaneados
  onFechar: () => void;
}

const lerNumero = (s: string) => Number(s.replace(',', '.'));

export function FolhaQuantidade({ alimento, qtdInicial, refeicao: refInicial, refeicoes, editando, onConfirmar, onApagar, onEditar, onFechar }: Props) {
  const porcoes = alimento.porcoes ?? [];
  const achada = porcoes.find((p) => p.nome === qtdInicial.porcao);
  const [unidade, setUnidade] = useState<string>(achada ? achada.nome : 'g');
  const [valor, setValor] = useState(fmtNum(achada ? (qtdInicial.vezes ?? 1) : qtdInicial.gramas));
  const [refeicao, setRefeicao] = useState(refInicial);
  const uso = useLiveQuery(() => db.uso.get(alimento.id), [alimento.id]);

  const porcao = porcoes.find((p) => p.nome === unidade);
  const n = lerNumero(valor);
  const valido = Number.isFinite(n) && n > 0;
  const gramas = valido ? (porcao ? n * porcao.gramas : n) : 0;
  const v = calcular(alimento.por100, gramas);
  const nomeRef = refeicoes.find((r) => r.id === refeicao)?.nome ?? refeicao;

  function trocarUnidade(nova: string) {
    const p = porcoes.find((x) => x.nome === nova);
    if (p) setValor(fmtNum(Math.max(0.5, Math.round((gramas / p.gramas) * 2) / 2) || 1));
    else setValor(fmtNum(Math.round(gramas) || 100, 0));
    setUnidade(nova);
  }

  function passo(sinal: 1 | -1) {
    const atual = valido ? n : 0;
    let novo: number;
    if (porcao) novo = sinal > 0 ? (atual < 1 ? 1 : atual + 1) : (atual > 1 ? atual - 1 : 0.5);
    else novo = Math.max(5, Math.round((atual + sinal * 10) / 5) * 5);
    setValor(fmtNum(novo));
  }

  function confirmar() {
    if (!valido) return;
    const qtd: Quantidade = porcao
      ? { gramas: Math.round(gramas * 10) / 10, porcao: porcao.nome, vezes: n }
      : { gramas: Math.round(n * 10) / 10 };
    onConfirmar(qtd, refeicao);
  }

  const kcal = (x: number | null) => (x == null ? '—' : fmtNum(x, 0));
  const g = (x: number | null) => (x == null ? '—' : `${fmtNum(x, 0)} g`);

  return (
    <Folha onFechar={onFechar}>
      <div class="qtd-titulo">
        <h2>
          {alimento.nome}
          {alimento.nomeOriginal && <small>{alimento.nomeOriginal} · TACO</small>}
          {!alimento.nomeOriginal && alimento.fonte === 'taco' && <small>TACO</small>}
          {alimento.fonte !== 'taco' && <small>{[alimento.marca, alimento.fonte === 'off' ? 'Open Food Facts' : 'meu alimento'].filter(Boolean).join(' · ')}</small>}
          {onEditar && <button class="qtd-editar" onClick={onEditar}>Editar alimento</button>}
        </h2>
        <button class={`qtd-estrela ${uso?.favorito ? 'on' : ''}`} aria-label="Favoritar" onClick={() => alternarFavorito(alimento.id)}>
          <I.Estrela cheia={!!uso?.favorito} />
        </button>
      </div>

      <div class="qtd-porcoes">
        <button class={unidade === 'g' ? 'on' : ''} onClick={() => trocarUnidade('g')}>gramas</button>
        {porcoes.map((p) => (
          <button key={p.nome} class={unidade === p.nome ? 'on' : ''} onClick={() => trocarUnidade(p.nome)}>{p.nome}</button>
        ))}
      </div>

      <div class="qtd-linha">
        <button class="qtd-passo" aria-label="Menos" onClick={() => passo(-1)}>−</button>
        <label class="qtd-valor">
          <input
            inputMode="decimal"
            value={valor}
            aria-label="Quantidade"
            onInput={(e) => setValor(e.currentTarget.value)}
            onFocus={(e) => e.currentTarget.select()}
          />
          <span>{porcao ? porcao.nome.replace(/^1\s+/, '') : 'g'}</span>
        </label>
        <button class="qtd-passo" aria-label="Mais" onClick={() => passo(1)}>+</button>
      </div>
      <div class="qtd-gramas">{porcao && valido ? `= ${fmtNum(gramas, 0)} g` : ' '}</div>

      <div class="qtd-previa">
        <div><b>{kcal(v.kcal)}</b><span>kcal</span></div>
        <div><b class="laranja">{g(v.proteina)}</b><span>proteína</span></div>
        <div><b>{g(v.carbo)}</b><span>carbo</span></div>
        <div><b>{g(v.gordura)}</b><span>gordura</span></div>
      </div>

      <button class="btn-principal" disabled={!valido} onClick={confirmar}>
        {editando ? 'Salvar' : `Adicionar ao ${nomeRef.toLowerCase()}`}
      </button>

      <div class="qtd-rodape">
        <label class="qtd-refeicao">
          Refeição: <b>{nomeRef}</b> · trocar
          <select value={refeicao} onChange={(e) => setRefeicao(e.currentTarget.value)} aria-label="Refeição">
            {refeicoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>
        {onApagar && (
          <button class="qtd-apagar" onClick={onApagar}><I.Lixo /> Apagar</button>
        )}
      </div>
    </Folha>
  );
}
