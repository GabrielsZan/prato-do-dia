import { useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db } from '../lib/db';
import { atualizarConfig, useConfig } from '../lib/config';
import { fmtNum } from '../lib/diario';
import { nomeDoDia } from '../lib/datas';

const TAMANHOS = [200, 250, 300, 500];
const litros = (ml: number) => `${fmtNum(ml / 1000, 2)} L`;

export function mudarAgua(data: string, delta: number) {
  return db.transaction('rw', db.agua, async () => {
    const atual = (await db.agua.get(data))?.copos ?? 0;
    await db.agua.put({ data, copos: Math.max(0, atual + delta) });
  });
}

export function CartaoAgua({ data }: { data: string }) {
  const cfg = useConfig('agua');
  const copos = useLiveQuery(() => db.agua.get(data).then((a) => a?.copos ?? 0), [data]) ?? 0;
  const [aberta, setAberta] = useState(false);
  const meta = cfg.metaCopos;
  const desenhar = Math.max(meta, copos);

  return (
    <>
      <section class="cartao agua" data-teste="agua">
        <button class="agua-info" onClick={() => setAberta(true)} aria-label="Ajustar água">
          <span class="agua-ico"><I.Gota /></span>
          <span class="agua-txt">
            <b>Água <span class="suave">· {litros(copos * cfg.copoMl)} de {litros(meta * cfg.copoMl)}</span></b>
            <span class={`copos ${desenhar > 10 ? 'muitos' : ''}`}>
              {Array.from({ length: desenhar }, (_, i) => <i key={i} class={i < copos ? 'on' : ''} />)}
            </span>
          </span>
        </button>
        <button class="mais-azul" aria-label="Mais um copo" onClick={() => mudarAgua(data, 1)}><I.Mais tam={22} /></button>
      </section>

      {aberta && (
        <Folha onFechar={() => setAberta(false)}>
          <h2 class="folha-titulo">Água · {nomeDoDia(data).toLowerCase()}</h2>
          <div class="agua-big">
            <button aria-label="Menos um copo" onClick={() => mudarAgua(data, -1)}>−</button>
            <b data-teste="copos">{copos}</b><span class="suave">{copos === 1 ? 'copo' : 'copos'}</span>
            <button aria-label="Mais um copo" onClick={() => mudarAgua(data, 1)}>+</button>
          </div>
          <p class="agua-total suave">= {litros(copos * cfg.copoMl)} de {litros(meta * cfg.copoMl)}</p>
          <div class="qtd-porcoes azul">
            {TAMANHOS.map((ml) => (
              <button key={ml} class={cfg.copoMl === ml ? 'on' : ''} onClick={() => atualizarConfig('agua', (c) => ({ ...c, copoMl: ml }))}>{ml} ml</button>
            ))}
          </div>
          <p class="nota">Tamanho do copo</p>
          <div class="agua-meta">
            <span>Meta por dia</span>
            <div>
              <button aria-label="Diminuir meta" onClick={() => atualizarConfig('agua', (c) => ({ ...c, metaCopos: Math.max(1, c.metaCopos - 1) }))}>−</button>
              <b>{meta} copos ({litros(meta * cfg.copoMl)})</b>
              <button aria-label="Aumentar meta" onClick={() => atualizarConfig('agua', (c) => ({ ...c, metaCopos: c.metaCopos + 1 }))}>+</button>
            </div>
          </div>
        </Folha>
      )}
    </>
  );
}
