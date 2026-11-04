import { useState } from 'preact/hooks';
import * as I from '../componentes/Icones';
import { avisar } from '../componentes/Folha';
import { PADRAO, salvarConfig, useConfig, type Metas as TMetas, type Perfil, type RefeicaoDoDia } from '../lib/config';
import { ATIVIDADES, RITMOS, avisoMeta, calcularMeta, distribuirMacros } from '../lib/metas';
import { fmtNum } from '../lib/diario';
import { totalCatalogo } from '../lib/alimentos';

export type SubTela = 'metas' | 'refeicoes' | 'creditos';

export function Mais({ onAbrir }: { onAbrir: (t: SubTela) => void }) {
  const metas = useConfig('metas');
  const item = (titulo: string, sub: string, acao?: () => void) => (
    <button class="mais-item" disabled={!acao} onClick={acao}>
      <span><b>{titulo}</b><span>{sub}</span></span>
      {acao && <I.Avancar />}
    </button>
  );
  return (
    <div class="tela-simples">
      <h1 class="titulo-tela">Mais</h1>
      <div class="cartao mais-grupo">
        {item('Metas', `${fmtNum(metas.kcal, 0)} kcal · ${metas.proteina} g de proteína`, () => onAbrir('metas'))}
        {item('Refeições do dia', 'Nomes e horários', () => onAbrir('refeicoes'))}
      </div>
      <div class="cartao mais-grupo">
        {item('Lista de compras', 'Chega na Etapa 6')}
        {item('Backup', 'Chega na Etapa 6')}
      </div>
      <div class="cartao mais-grupo">
        {item('Créditos das fontes de dados', 'TACO e Open Food Facts', () => onAbrir('creditos'))}
      </div>
    </div>
  );
}

function Cabecalho({ titulo, onVoltar }: { titulo: string; onVoltar: () => void }) {
  return (
    <header class="sub-cab">
      <button class="btn-icone" aria-label="Voltar" onClick={onVoltar}><I.Voltar /></button>
      <h1>{titulo}</h1>
    </header>
  );
}

const num = (s: string) => Number(s.replace(',', '.'));

export function Metas({ onVoltar }: { onVoltar: () => void }) {
  const salvas = useConfig('metas');
  const perfilSalvo = useConfig('perfil');
  const [m, setM] = useState<Record<keyof TMetas, string> | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [calcAberta, setCalcAberta] = useState(false);

  const atual = m ?? { kcal: String(salvas.kcal), proteina: String(salvas.proteina), carbo: String(salvas.carbo), gordura: String(salvas.gordura) };
  const p = perfil ?? perfilSalvo ?? { sexo: 'm', idade: 30, alturaCm: 170, pesoKg: 80, atividade: 1.375, ritmoKgSemana: 0.5 };
  const kcal = num(atual.kcal);
  const aviso = Number.isFinite(kcal) && kcal > 0 ? avisoMeta(kcal, perfilSalvo ?? (calcAberta ? p : null)) : null;
  const somaMacros = num(atual.proteina) * 4 + num(atual.carbo) * 4 + num(atual.gordura) * 9;
  const calc = calcularMeta(p);

  const mudar = (k: keyof TMetas, v: string) => setM({ ...atual, [k]: v });
  const campo = (k: keyof TMetas, rotulo: string) => (
    <label class="campo">
      <span>{rotulo}</span>
      <input inputMode="decimal" value={atual[k]} onInput={(e) => mudar(k, e.currentTarget.value)} />
    </label>
  );
  const campoP = (k: 'idade' | 'alturaCm' | 'pesoKg', rotulo: string) => (
    <label class="campo">
      <span>{rotulo}</span>
      <input inputMode="decimal" value={String(p[k]).replace('.', ',')} onInput={(e) => setPerfil({ ...p, [k]: num(e.currentTarget.value) || 0 })} />
    </label>
  );

  async function salvar() {
    const novo = { kcal: Math.round(num(atual.kcal)), proteina: Math.round(num(atual.proteina)), carbo: Math.round(num(atual.carbo)), gordura: Math.round(num(atual.gordura)) };
    if (Object.values(novo).some((v) => !Number.isFinite(v) || v < 0) || novo.kcal <= 0) return avisar('Confira os números');
    await salvarConfig('metas', novo);
    if (perfil) await salvarConfig('perfil', perfil);
    setM(null);
    avisar('Metas salvas');
  }

  return (
    <div class="tela-simples">
      <Cabecalho titulo="Metas" onVoltar={onVoltar} />

      <section class="cartao bloco">
        <h2>Meta por dia</h2>
        <div class="campos-2">
          {campo('kcal', 'Calorias (kcal)')}
          {campo('proteina', 'Proteína (g)')}
          {campo('carbo', 'Carboidrato (g)')}
          {campo('gordura', 'Gordura (g)')}
        </div>
        <p class="nota">
          Os macros somam {fmtNum(somaMacros, 0)} kcal.{' '}
          <button class="link" onClick={() => setM({ ...atual, ...strMetas(distribuirMacros(Math.round(kcal), Math.round(num(atual.proteina))) ) })}>
            Distribuir pelo total
          </button>{' '}(gordura 25%, carboidrato o resto)
        </p>
        {aviso && <p class="alerta">{aviso}</p>}
        <button class="btn-principal" onClick={salvar}>Salvar metas</button>
      </section>

      <section class="cartao bloco">
        <button class="bloco-abrir" onClick={() => setCalcAberta(!calcAberta)}>
          <h2>Calcular pela fórmula</h2><span class="suave">{calcAberta ? 'fechar' : 'abrir'}</span>
        </button>
        {calcAberta && (
          <>
            <div class="segmentos">
              <button class={p.sexo === 'm' ? 'on' : ''} onClick={() => setPerfil({ ...p, sexo: 'm' })}>Homem</button>
              <button class={p.sexo === 'f' ? 'on' : ''} onClick={() => setPerfil({ ...p, sexo: 'f' })}>Mulher</button>
            </div>
            <div class="campos-3">
              {campoP('pesoKg', 'Peso (kg)')}
              {campoP('alturaCm', 'Altura (cm)')}
              {campoP('idade', 'Idade')}
            </div>
            <label class="campo largo">
              <span>Atividade</span>
              <select value={p.atividade} onChange={(e) => setPerfil({ ...p, atividade: Number(e.currentTarget.value) })}>
                {ATIVIDADES.map((a) => <option key={a.fator} value={a.fator}>{a.nome} ({a.desc})</option>)}
              </select>
            </label>
            <label class="campo largo">
              <span>Ritmo</span>
              <select value={p.ritmoKgSemana} onChange={(e) => setPerfil({ ...p, ritmoKgSemana: Number(e.currentTarget.value) })}>
                {RITMOS.map((r) => <option key={r.kg} value={r.kg}>{r.nome}</option>)}
              </select>
            </label>
            <div class="calc-res">
              <div><b>{fmtNum(calc.basal, 0)}</b><span>metabolismo basal</span></div>
              <div><b>{fmtNum(calc.gasto, 0)}</b><span>gasto do dia</span></div>
              <div><b class="verde">{fmtNum(calc.meta, 0)}</b><span>meta sugerida</span></div>
            </div>
            <button class="btn-secundario" onClick={() => setM({ ...atual, ...strMetas(distribuirMacros(calc.meta, Math.round(num(atual.proteina)))) })}>
              Usar {fmtNum(calc.meta, 0)} kcal
            </button>
            <p class="nota">Fórmula de Mifflin-St Jeor. É uma estimativa; ajuste conforme o peso for mudando.</p>
          </>
        )}
      </section>
    </div>
  );
}

const strMetas = (m: TMetas) => ({ kcal: String(m.kcal), proteina: String(m.proteina), carbo: String(m.carbo), gordura: String(m.gordura) });

export function Refeicoes({ onVoltar }: { onVoltar: () => void }) {
  const salvas = useConfig('refeicoes');
  const [lista, setLista] = useState<RefeicaoDoDia[] | null>(null);
  const atual = lista ?? salvas;
  const mudar = (i: number, campo: 'nome' | 'hora', v: string) =>
    setLista(atual.map((r, j) => (j === i ? { ...r, [campo]: v } : r)));

  async function salvar() {
    const limpa = atual.filter((r) => r.nome.trim()).map((r) => ({ ...r, nome: r.nome.trim() }));
    if (!limpa.length) return avisar('Deixe pelo menos uma refeição');
    await salvarConfig('refeicoes', [...limpa].sort((a, b) => a.hora.localeCompare(b.hora)));
    setLista(null);
    avisar('Refeições salvas');
  }

  return (
    <div class="tela-simples">
      <Cabecalho titulo="Refeições do dia" onVoltar={onVoltar} />
      <section class="cartao bloco">
        <p class="nota">O horário diz qual refeição o + do meio abre. Remover uma refeição não apaga o que já foi registrado nela.</p>
        {atual.map((r, i) => (
          <div class="ref-edit" key={r.id}>
            <input value={r.nome} aria-label="Nome da refeição" onInput={(e) => mudar(i, 'nome', e.currentTarget.value)} />
            <input type="time" value={r.hora} aria-label="Horário" onInput={(e) => mudar(i, 'hora', e.currentTarget.value)} />
            <button class="btn-icone" aria-label={`Remover ${r.nome}`} onClick={() => setLista(atual.filter((_, j) => j !== i))}><I.Lixo /></button>
          </div>
        ))}
        <button class="btn-secundario" onClick={() => setLista([...atual, { id: `r${Date.now()}`, nome: 'Ceia', hora: '22:00' }])}>
          <I.Mais /> Adicionar refeição
        </button>
        <button class="btn-principal" onClick={salvar}>Salvar</button>
        <button class="link centro" onClick={() => setLista(PADRAO.refeicoes)}>Voltar ao padrão</button>
      </section>
    </div>
  );
}

export function Creditos({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div class="tela-simples">
      <Cabecalho titulo="Créditos" onVoltar={onVoltar} />
      <section class="cartao bloco texto">
        <h2>Tabela TACO</h2>
        <p>Tabela Brasileira de Composição de Alimentos, 4ª edição. NEPA/Unicamp, 2011. {totalCatalogo} alimentos, valores por 100 g.</p>
        <p>Arquivos organizados pelo projeto taco-api (github.com/raulfdm/taco-api), licença MIT.</p>
        <p>Porções caseiras: pesos aproximados de medidas comuns.</p>
        <h2>Dados de produtos: Open Food Facts</h2>
        <p>Produtos lidos pelo código de barras vêm do Open Food Facts (openfoodfacts.org), base colaborativa sob a licença Open Database License (ODbL).</p>
        <h2>Leitor de código de barras</h2>
        <p>zxing-wasm e ZXing-C++ (licenças MIT e Apache 2.0).</p>
      </section>
    </div>
  );
}

export function EmBreve({ titulo, etapa }: { titulo: string; etapa: number }) {
  return (
    <div class="tela-simples">
      <h1 class="titulo-tela">{titulo}</h1>
      <p class="lista-vazia">Esta tela chega na Etapa {etapa}.</p>
    </div>
  );
}
