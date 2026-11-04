import { useMemo, useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ChartConfiguration } from 'chart.js';
import { Folha, avisar } from '../componentes/Folha';
import { Grafico } from '../componentes/Grafico';
import * as I from '../componentes/Icones';
import { db, type Peso } from '../lib/db';
import { salvarConfig, useConfig } from '../lib/config';
import { fmtNum } from '../lib/diario';
import { dataCurta, deISO, hojeISO, nomeDoDia, somarDias } from '../lib/datas';
import { carregarDias, dentroDaMeta, resumoPeso, resumoSemana, segundaDaSemana, sequencia } from '../lib/progresso';

const VERDE = '#2F9E5B', LARANJA = '#F08A24', CINZA = '#D9DCD3', TEXTO = '#1E2420';
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const kg = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
const diaMes = (s: string) => { const d = deISO(s); return `${d.getDate()}/${d.getMonth() + 1}`; };

export function Progresso({ onAbrirDia }: { onAbrirDia: (data: string) => void }) {
  const hoje = hojeISO();
  const metas = useConfig('metas');
  const metaPeso = useConfig('metaPeso');
  const dias = useLiveQuery(() => carregarDias(somarDias(hoje, -400)), [hoje]);
  const pesos = useLiveQuery(() => db.peso.orderBy('data').toArray(), []) ?? [];
  const [inicioSemana, setInicioSemana] = useState(segundaDaSemana(hoje));
  const [pesoAberto, setPesoAberto] = useState(false);

  if (!dias) return <div class="tela-simples"><h1 class="titulo-tela">Progresso</h1></div>;

  const seq = sequencia(dias, hoje);
  const semanaAtual = resumoSemana(segundaDaSemana(hoje), dias, hoje, metas.kcal);
  const semana = resumoSemana(inicioSemana, dias, hoje, metas.kcal);
  const historico = [...dias.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);

  return (
    <div class="tela-simples tela-progresso">
      <h1 class="titulo-tela">Progresso</h1>

      <section class="cartao bloco">
        <div class="seq">
          <span class="seq-fogo"><I.Fogo /></span>
          <div>
            <div class="grande" data-teste="sequencia">{seq} {seq === 1 ? 'dia' : 'dias'}</div>
            <div class="suave">{seq ? 'seguidos registrando o que comeu' : 'Registre algo hoje para começar uma sequência'}</div>
          </div>
        </div>
        <div class="seq-semana">
          {semanaAtual.dias.map((d, i) => (
            <span key={d.data}><i class={d.resumo ? 'on' : d.hoje ? 'hoje' : ''} />{LETRAS[i]}</span>
          ))}
        </div>
      </section>

      <CartaoPeso pesos={pesos} metaPeso={metaPeso} onRegistrar={() => setPesoAberto(true)} />

      <section class="cartao bloco">
        <div class="bloco-cab">
          <h2>Semana</h2>
          <div class="nav-semana">
            <button aria-label="Semana anterior" onClick={() => setInicioSemana(somarDias(inicioSemana, -7))}><I.Voltar tam={16} /></button>
            <span>{dataCurta(inicioSemana).split(', ')[1]} – {dataCurta(somarDias(inicioSemana, 6)).split(', ')[1]}</span>
            <button aria-label="Próxima semana" disabled={inicioSemana >= segundaDaSemana(hoje)} onClick={() => setInicioSemana(somarDias(inicioSemana, 7))}><I.Avancar tam={16} /></button>
          </div>
        </div>
        <Grafico altura={150} config={configSemana(semana, metas.kcal)} />
        <div class="medias">
          <div><b data-teste="media-kcal">{semana.mediaKcal == null ? '—' : fmtNum(semana.mediaKcal, 0)}</b><span>kcal/dia</span></div>
          <div><b class="laranja">{semana.mediaProteina == null ? '—' : `${fmtNum(semana.mediaProteina, 0)} g`}</b><span>proteína/dia</span></div>
          <div><b data-teste="na-meta">{semana.completos ? `${semana.naMeta} de ${semana.completos}` : '—'}</b><span>dias na meta</span></div>
        </div>
        <p class="nota">Médias dos dias já fechados com registro (hoje não entra). Verde = dentro da meta (80% a 105% de {fmtNum(metas.kcal, 0)} kcal).</p>
      </section>

      <h3 class="secao">Histórico</h3>
      {historico.length ? (
        <div class="cartao historico">
          {historico.map((r) => {
            const cor = r.data === hoje ? CINZA : dentroDaMeta(r.kcal, metas.kcal) ? VERDE : LARANJA;
            return (
              <button class="hist-dia" key={r.data} onClick={() => onAbrirDia(r.data)}>
                <span class="d">{r.data === hoje ? 'Hoje' : nomeDoDia(r.data) === 'Ontem' ? 'Ontem' : dataCurta(r.data).replace(/ \w+$/, '')}</span>
                <span class="b"><i style={{ width: `${Math.min(100, (r.kcal / metas.kcal) * 100)}%`, background: cor }} /></span>
                <span class="k"><b>{fmtNum(r.kcal, 0)}</b> kcal<small>{fmtNum(r.proteina, 0)} g prot.</small></span>
              </button>
            );
          })}
        </div>
      ) : <p class="lista-vazia">Os dias que você registrar aparecem aqui.</p>}

      {pesoAberto && <FolhaPeso pesos={pesos} metaPeso={metaPeso} onFechar={() => setPesoAberto(false)} />}
    </div>
  );
}

function configSemana(semana: ReturnType<typeof resumoSemana>, meta: number): ChartConfiguration {
  const valores = semana.dias.map((d) => (d.resumo ? Math.round(d.resumo.kcal) : 0));
  const cores = semana.dias.map((d) => (d.hoje || !d.resumo ? CINZA : dentroDaMeta(d.resumo.kcal, meta) ? VERDE : LARANJA));
  const topo = Math.max(meta * 1.2, ...valores);
  return {
    type: 'bar',
    data: {
      labels: LETRAS,
      datasets: [
        { type: 'line', data: LETRAS.map(() => meta), borderColor: TEXTO, borderDash: [3, 4], borderWidth: 1, pointRadius: 0, order: 0 } as any,
        { type: 'bar', data: valores, backgroundColor: cores, borderRadius: 7, borderSkipped: false, barPercentage: 0.62, order: 1 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      events: [],
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { display: false, min: 0, max: topo },
      },
    },
  };
}

function CartaoPeso({ pesos, metaPeso, onRegistrar }: { pesos: Peso[]; metaPeso: number | null; onRegistrar: () => void }) {
  const r = resumoPeso(pesos);
  const ultimos = pesos.slice(-16);
  const config = useMemo((): ChartConfiguration | null => {
    if (ultimos.length < 2) return null;
    const vals = ultimos.map((p) => p.kg);
    const min = Math.floor(Math.min(...vals, metaPeso ?? Infinity) - 1);
    const max = Math.ceil(Math.max(...vals) + 1);
    return {
      type: 'line',
      data: {
        labels: ultimos.map((p) => diaMes(p.data)),
        datasets: [
          {
            data: vals, borderColor: TEXTO, borderWidth: 2.5, tension: 0,
            pointRadius: vals.map((_, i) => (i === vals.length - 1 ? 5 : 3.5)),
            pointBackgroundColor: vals.map((_, i) => (i === vals.length - 1 ? VERDE : '#fff')),
            pointBorderColor: vals.map((_, i) => (i === vals.length - 1 ? VERDE : TEXTO)),
            pointBorderWidth: 2,
          },
          ...(metaPeso ? [{ data: vals.map(() => metaPeso), borderColor: VERDE, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 }] : []),
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        events: [],
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkipPadding: 8 } },
          y: { min, max, grid: { color: '#E8E9E2' }, border: { display: false }, ticks: { font: { size: 10 }, stepSize: Math.max(1, Math.round((max - min) / 4)) } },
        },
      },
    };
  }, [JSON.stringify(ultimos), metaPeso]);

  return (
    <section class="cartao bloco">
      <div class="bloco-cab">
        <h2>Peso</h2>
        <button class="btn-pilula" onClick={onRegistrar}><I.Mais tam={14} /> Registrar</button>
      </div>
      {r ? (
        <>
          <div class="peso-linha">
            <span class="grande" data-teste="peso-atual">{kg(r.atual.kg)}</span>
            {r.semanas > 0 && (
              <>
                <span class={`peso-var ${r.variacao <= 0 ? 'verde' : 'laranja'}`}>{r.variacao > 0 ? '+' : r.variacao < 0 ? '−' : ''}{kg(Math.abs(r.variacao))}</span>
                <span class="suave">em {r.semanas} {r.semanas === 1 ? 'semana' : 'semanas'}</span>
              </>
            )}
          </div>
          {metaPeso != null && (
            <p class="suave">{r.atual.kg > metaPeso ? `Faltam ${kg(r.atual.kg - metaPeso)} para a meta de ${kg(metaPeso)}` : `Meta de ${kg(metaPeso)} alcançada!`}</p>
          )}
          {config ? <Grafico altura={160} config={config} /> : <p class="nota">Com mais uma pesagem aparece o gráfico.</p>}
        </>
      ) : (
        <p class="nota">Registre seu peso (1 vez por semana, de manhã, já ajuda) para ver a evolução aqui.</p>
      )}
    </section>
  );
}

function FolhaPeso({ pesos, metaPeso, onFechar }: { pesos: Peso[]; metaPeso: number | null; onFechar: () => void }) {
  const ultimo = pesos[pesos.length - 1];
  const [editando, setEditando] = useState<Peso | null>(null);
  const [valor, setValor] = useState(ultimo ? fmtNum(ultimo.kg, 1) : '');
  const [data, setData] = useState(hojeISO());
  const [meta, setMeta] = useState(metaPeso != null ? fmtNum(metaPeso, 1) : '');
  const n = Number(valor.replace(',', '.'));
  const valido = Number.isFinite(n) && n >= 20 && n <= 400;
  const nMeta = meta.trim() ? Number(meta.replace(',', '.')) : null;
  const metaValida = nMeta == null || (Number.isFinite(nMeta) && nMeta >= 20 && nMeta <= 400);

  async function salvar() {
    if (!valido || !metaValida) return;
    await db.transaction('rw', db.peso, async () => {
      if (editando && editando.data !== data) await db.peso.delete(editando.data);
      await db.peso.put({ data, kg: Math.round(n * 10) / 10 });
    });
    if (nMeta !== metaPeso) await salvarConfig('metaPeso', nMeta == null ? null : Math.round(nMeta * 10) / 10);
    avisar(`Peso salvo: ${kg(n)}`);
    onFechar();
  }

  return (
    <Folha onFechar={onFechar}>
      <h2 class="folha-titulo">{editando ? 'Corrigir pesagem' : 'Registrar peso'}</h2>
      <label class="peso-valor">
        <input inputMode="decimal" value={valor} autoFocus aria-label="Peso em kg" onInput={(e) => setValor(e.currentTarget.value)} onFocus={(e) => e.currentTarget.select()} />
        <span>kg</span>
      </label>
      <label class="linha-campo">
        <span>Data</span>
        <b>{nomeDoDia(data) === dataCurta(data) ? dataCurta(data) : `${nomeDoDia(data)} (${dataCurta(data).toLowerCase()})`} ›</b>
        <input type="date" value={data} max={hojeISO()} aria-label="Data da pesagem" onChange={(e) => e.currentTarget.value && setData(e.currentTarget.value)} />
      </label>
      <label class="linha-campo">
        <span>Meta de peso</span>
        <input class="visivel" inputMode="decimal" placeholder="—" value={meta} aria-label="Meta de peso em kg" onInput={(e) => setMeta(e.currentTarget.value)} />
        <b>kg</b>
      </label>
      <button class="btn-principal" disabled={!valido || !metaValida} onClick={salvar}>Salvar</button>
      {editando && (
        <div class="qtd-rodape"><span /><button class="qtd-apagar" onClick={async () => {
          await db.peso.delete(editando.data);
          avisar('Pesagem apagada', () => db.peso.put(editando));
          onFechar();
        }}><I.Lixo /> Apagar pesagem</button></div>
      )}
      {pesos.length > 0 && (
        <>
          <p class="nota" style="margin-top:16px">Últimas pesagens · toque para corrigir ou apagar</p>
          <ul class="lista">
            {[...pesos].reverse().slice(0, 8).map((p) => (
              <li key={p.data}>
                <button class={`linha ${editando?.data === p.data ? 'sel' : ''}`} onClick={() => { setEditando(p); setValor(fmtNum(p.kg, 1)); setData(p.data); }}>
                  <span class="n"><b>{dataCurta(p.data)}</b></span><span class="k">{kg(p.kg)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Folha>
  );
}
