import { useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha } from '../componentes/Folha';
import { db } from '../lib/db';
import { fmtNum, somar } from '../lib/diario';
import { dataCurta, nomeDoDia, somarDias } from '../lib/datas';
import type { RefeicaoDoDia } from '../lib/config';

interface Props {
  data: string; // dia para onde vai a cópia
  nomeRefeicao: string;
  refeicoes: RefeicaoDoDia[];
  onCopiar: (deData: string, deRefeicao: string) => void;
  onFechar: () => void;
}

export function FolhaCopiar({ data, nomeRefeicao, refeicoes, onCopiar, onFechar }: Props) {
  const [de, setDe] = useState(somarDias(data, -1));
  const regs = useLiveQuery(() => db.registros.where('data').equals(de).sortBy('criadoEm'), [de]) ?? [];
  const comItens = refeicoes
    .map((r) => ({ r, itens: regs.filter((x) => x.refeicao === r.id) }))
    .filter((x) => x.itens.length);

  return (
    <Folha onFechar={onFechar}>
      <h2 class="folha-titulo">Copiar de outro dia</h2>
      <p class="folha-sub">Escolha a refeição para repetir no {nomeRefeicao.toLowerCase()}.</p>
      <div class="copiar-dia">
        <button onClick={() => setDe(somarDias(de, -1))} aria-label="Dia anterior">‹</button>
        <label>
          {nomeDoDia(de)}{nomeDoDia(de) !== dataCurta(de) ? ` · ${dataCurta(de)}` : ''}
          <input type="date" value={de} onChange={(e) => e.currentTarget.value && setDe(e.currentTarget.value)} aria-label="Escolher data" />
        </label>
        <button onClick={() => setDe(somarDias(de, 1))} aria-label="Próximo dia">›</button>
      </div>
      {comItens.length === 0 && <p class="lista-vazia">Nada registrado nesse dia.</p>}
      <ul class="lista">
        {comItens.map(({ r, itens }) => (
          <li key={r.id}>
            <button class="linha" onClick={() => onCopiar(de, r.id)}>
              <span class="n"><b>{r.nome}</b><span>{itens.map((i) => i.nome).join(', ')}</span></span>
              <span class="k">{fmtNum(somar(itens).kcal, 0)} kcal</span>
            </button>
          </li>
        ))}
      </ul>
    </Folha>
  );
}
