import { useState } from 'preact/hooks';
import { Folha } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import type { Registro } from '../lib/tipos';

export interface ValoresSoCalorias { nome: string; kcal: number; proteina?: number; carbo?: number; gordura?: number }

interface Props {
  registro?: Registro; // ao editar
  nomeRefeicao: string;
  onConfirmar: (v: ValoresSoCalorias) => void;
  onApagar?: () => void;
  onFechar: () => void;
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));
const txt = (v: number | null | undefined) => (v == null ? '' : String(Math.round(v * 10) / 10).replace('.', ','));

// Para quando não sabe o alimento exato: "salgado da cantina, ~300 kcal".
export function FolhaSoCalorias({ registro, nomeRefeicao, onConfirmar, onApagar, onFechar }: Props) {
  const [nome, setNome] = useState(registro?.nome ?? '');
  const [kcal, setKcal] = useState(txt(registro?.valores.kcal));
  const [p, setP] = useState(txt(registro?.valores.proteina));
  const [c, setC] = useState(txt(registro?.valores.carbo));
  const [g, setG] = useState(txt(registro?.valores.gordura));
  const k = num(kcal);
  const valido = k != null && Number.isFinite(k) && k > 0;

  const campo = (rotulo: string, valor: string, set: (s: string) => void, foco = false) => (
    <label class="campo">
      <span>{rotulo}</span>
      <input inputMode="decimal" value={valor} autoFocus={foco} onInput={(e) => set(e.currentTarget.value)} placeholder="—" />
    </label>
  );

  return (
    <Folha onFechar={onFechar}>
      <h2 class="folha-titulo">Só calorias</h2>
      <p class="folha-sub">Para quando não souber o alimento exato. Entra no {nomeRefeicao.toLowerCase()}.</p>
      <label class="campo largo">
        <span>O que foi (opcional)</span>
        <input value={nome} placeholder="ex.: salgado da cantina" onInput={(e) => setNome(e.currentTarget.value)} />
      </label>
      <div class="campos-4">
        {campo('kcal', kcal, setKcal, !registro)}
        {campo('Proteína g', p, setP)}
        {campo('Carbo g', c, setC)}
        {campo('Gordura g', g, setG)}
      </div>
      <button class="btn-principal" disabled={!valido}
        onClick={() => onConfirmar({ nome, kcal: k!, proteina: num(p), carbo: num(c), gordura: num(g) })}>
        {registro ? 'Salvar' : 'Adicionar'}
      </button>
      {onApagar && <div class="qtd-rodape"><span /><button class="qtd-apagar" onClick={onApagar}><I.Lixo /> Apagar</button></div>}
    </Folha>
  );
}
