import { useEffect, useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { Folha, avisar } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db, type Jejum as TJejum } from '../lib/db';
import { atualizarConfig, useConfig } from '../lib/config';
import { andamento, duracao, encerrarJejum, horasDoPlano, iniciarJejum, jejumAtivo, nomePlano, PLANOS, relogio } from '../lib/jejum';
import { dataCurta, hojeISO, paraISO, somarDias } from '../lib/datas';

// Relógio que atualiza a cada segundo enquanto a tela está aberta.
function useAgora(ativo = true) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ativo]);
  return agora;
}

// "ontem, 21:30" / "hoje, 13:30" / "seg, 2 nov, 21:30"
function quando(ms: number): string {
  const d = new Date(ms), dia = paraISO(d), hoje = hojeISO();
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (dia === hoje) return `hoje, ${hora}`;
  if (dia === somarDias(hoje, -1)) return `ontem, ${hora}`;
  if (dia === somarDias(hoje, 1)) return `amanhã, ${hora}`;
  return `${dataCurta(dia).toLowerCase()}, ${hora}`;
}

const paraInput = (ms: number) => {
  const d = new Date(ms);
  return `${paraISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const doInput = (s: string) => new Date(s).getTime();

export function useJejumAtivo() {
  return useLiveQuery(() => jejumAtivo(), []);
}

// Faixa discreta no Hoje, só enquanto há jejum ativo.
export function FaixaJejum({ onAbrir }: { onAbrir: () => void }) {
  const ativo = useJejumAtivo();
  const agora = useAgora(!!ativo);
  if (!ativo) return null;
  const a = andamento(ativo, agora);
  return (
    <button class="cartao faixa-jejum" data-teste="faixa-jejum" onClick={onAbrir}>
      <span class="jejum-ico"><I.AbaJejum /></span>
      <span class="faixa-txt">
        <b>Jejum {nomePlano(ativo.plano, ativo.metaHoras)} <span class="suave">· {a.completo ? 'meta alcançada!' : `faltam ${duracao(a.restante)}`}</span></b>
        <span class="faixa-barra"><i style={{ width: `${a.fracao * 100}%` }} /></span>
      </span>
      <I.Avancar tam={16} />
    </button>
  );
}

export function Jejum() {
  const cfg = useConfig('jejum');
  const ativo = useJejumAtivo();
  const historico = useLiveQuery(() => db.jejuns.orderBy('inicio').reverse().filter((j) => j.fim != null).limit(15).toArray(), []) ?? [];
  const agora = useAgora(!!ativo);
  const [editando, setEditando] = useState<TJejum | null>(null);
  const horas = horasDoPlano(cfg);

  const raio = 100, volta = 2 * Math.PI * raio;
  const a = ativo ? andamento(ativo, agora) : null;

  return (
    <div class="tela-simples">
      <h1 class="titulo-tela">Jejum</h1>

      <section class="cartao bloco">
        <div class="jejum-anel">
          <svg width="240" height="240" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r={raio} fill="none" stroke="var(--linha)" stroke-width="16" />
            {a && <circle cx="120" cy="120" r={raio} fill="none" stroke={a.completo ? 'var(--verde)' : 'var(--laranja)'} stroke-width="16"
              stroke-linecap="round" stroke-dasharray={`${a.fracao * volta} ${volta}`} />}
          </svg>
          <div class="meio">
            {a ? (
              <>
                <span class="t">{a.completo ? 'Meta alcançada! Em jejum há' : 'Em jejum há'}</span>
                <span class="h" data-teste="relogio">{relogio(a.decorrido)}</span>
                <span class="f">{a.completo ? `${duracao(a.decorrido - a.meta)} além da meta` : `faltam ${duracao(a.restante)} · ${Math.floor(a.fracao * 100)}%`}</span>
              </>
            ) : (
              <>
                <span class="t">Plano {nomePlano(cfg.plano, horas)}</span>
                <span class="h">{horas}h</span>
                <span class="f">de jejum</span>
              </>
            )}
          </div>
        </div>

        {ativo && a ? (
          <>
            <div class="jejum-horas">
              <label>Começou<b>{quando(ativo.inicio)}</b>
                <input type="datetime-local" value={paraInput(ativo.inicio)} max={paraInput(Date.now())} aria-label="Corrigir início"
                  onChange={(e) => { const v = doInput(e.currentTarget.value); if (v && v <= Date.now()) db.jejuns.update(ativo.id!, { inicio: v }); }} />
              </label>
              <span class="dir">Termina<b>{quando(a.terminaEm)}</b></span>
            </div>
            <button class="btn-principal laranja-bg" onClick={async () => {
              await encerrarJejum(ativo.id!);
              avisar(`Jejum encerrado: ${duracao(a.decorrido)}`, () => db.jejuns.update(ativo.id!, { fim: null }));
            }}>Encerrar jejum</button>
            <p class="nota centro">Para corrigir a hora de início, toque em "Começou".</p>
          </>
        ) : (
          <>
            <button class="btn-principal laranja-bg" onClick={() => iniciarJejum(cfg)}>Começar jejum agora</button>
            <label class="link centro rel">
              Comecei mais cedo…
              <input type="datetime-local" max={paraInput(Date.now())} aria-label="Começou em"
                onChange={(e) => { const v = doInput(e.currentTarget.value); if (v && v <= Date.now()) iniciarJejum(cfg, v); }} />
            </label>
          </>
        )}
      </section>

      <section class="cartao bloco">
        <h2>Plano</h2>
        <div class="qtd-porcoes planos-jejum">
          {PLANOS.map((p) => (
            <button key={p.id} class={cfg.plano === p.id ? 'on' : ''} onClick={() => atualizarConfig('jejum', (c) => ({ ...c, plano: p.id }))}>
              {p.id === 'personalizado' ? 'Personalizado' : p.id}
            </button>
          ))}
        </div>
        {cfg.plano === 'personalizado' && (
          <div class="agua-meta">
            <span>Horas de jejum</span>
            <div>
              <button aria-label="Menos uma hora" onClick={() => atualizarConfig('jejum', (c) => ({ ...c, horasPersonalizado: Math.max(1, c.horasPersonalizado - 1) }))}>−</button>
              <b>{cfg.horasPersonalizado} h</b>
              <button aria-label="Mais uma hora" onClick={() => atualizarConfig('jejum', (c) => ({ ...c, horasPersonalizado: Math.min(72, c.horasPersonalizado + 1) }))}>+</button>
            </div>
          </div>
        )}
        <p class="nota">{horas} h de jejum{horas < 24 ? `, ${24 - horas} h para comer` : ''}.{ativo ? ' Vale para o próximo jejum.' : ''}</p>
      </section>

      <section class="cartao bloco">
        <h2>Últimos jejuns</h2>
        {historico.length ? (
          <ul class="lista">
            {historico.map((j) => {
              const r = andamento(j);
              return (
                <li key={j.id}>
                  <button class="linha" onClick={() => setEditando(j)}>
                    <span class="n"><b>{dataCurta(paraISO(new Date(j.inicio)))} · {nomePlano(j.plano, j.metaHoras)}</b></span>
                    <span class={`k ${r.completo ? 'verde' : 'laranja'}`}>{duracao(r.decorrido)}{r.completo ? ' ✓' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p class="nota">Os jejuns encerrados aparecem aqui.</p>}
      </section>

      {editando && <FolhaEditarJejum jejum={editando} onFechar={() => setEditando(null)} />}
    </div>
  );
}

function FolhaEditarJejum({ jejum, onFechar }: { jejum: TJejum; onFechar: () => void }) {
  const [inicio, setInicio] = useState(paraInput(jejum.inicio));
  const [fim, setFim] = useState(paraInput(jejum.fim!));
  const ok = doInput(inicio) < doInput(fim);
  return (
    <Folha onFechar={onFechar}>
      <h2 class="folha-titulo">Corrigir jejum</h2>
      <label class="campo largo"><span>Começou</span><input type="datetime-local" value={inicio} onInput={(e) => setInicio(e.currentTarget.value)} /></label>
      <label class="campo largo"><span>Terminou</span><input type="datetime-local" value={fim} onInput={(e) => setFim(e.currentTarget.value)} /></label>
      <button class="btn-principal" disabled={!ok} onClick={async () => {
        await db.jejuns.update(jejum.id!, { inicio: doInput(inicio), fim: doInput(fim) });
        onFechar();
      }}>Salvar</button>
      <div class="qtd-rodape"><span /><button class="qtd-apagar" onClick={async () => {
        await db.jejuns.delete(jejum.id!);
        avisar('Jejum apagado', () => db.jejuns.add(jejum));
        onFechar();
      }}><I.Lixo /> Apagar</button></div>
    </Folha>
  );
}
