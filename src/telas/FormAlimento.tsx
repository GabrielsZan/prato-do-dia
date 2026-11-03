import { useState } from 'preact/hooks';
import * as I from '../componentes/Icones';
import { avisar } from '../componentes/Folha';
import { apagarProprio, novoId, salvarProprio } from '../lib/alimentos';
import { fmtNum } from '../lib/diario';
import type { Alimento, Nutrientes } from '../lib/tipos';

export interface Rascunho { nome?: string; marca?: string; codigoBarras?: string }

interface Props {
  alimento?: Alimento; // editando
  rascunho?: Rascunho; // novo, vindo do código de barras ou da busca
  onSalvo: (a: Alimento) => void;
  onApagado?: () => void;
  onFechar: () => void;
}

const CAMPOS: { k: keyof Nutrientes; rotulo: string; obrig?: boolean }[] = [
  { k: 'kcal', rotulo: 'Calorias (kcal)', obrig: true },
  { k: 'proteina', rotulo: 'Proteína (g)' },
  { k: 'carbo', rotulo: 'Carboidrato (g)' },
  { k: 'gordura', rotulo: 'Gordura total (g)' },
  { k: 'fibra', rotulo: 'Fibra (g)' },
  { k: 'sodio', rotulo: 'Sódio (mg)' },
];

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
const txt = (v: number | null | undefined) => (v == null ? '' : fmtNum(v, 2).replace(/\./g, ''));

// Cadastro de alimento copiando do rótulo (por 100 g ou por porção).
export function FormAlimento({ alimento, rascunho, onSalvo, onApagado, onFechar }: Props) {
  const p0 = alimento?.porcoes?.[0];
  const [nome, setNome] = useState(alimento?.nome ?? rascunho?.nome ?? '');
  const [marca, setMarca] = useState(alimento?.marca ?? rascunho?.marca ?? '');
  const [codigo, setCodigo] = useState(alimento?.codigoBarras ?? rascunho?.codigoBarras ?? '');
  const [porcaoNome, setPorcaoNome] = useState(p0?.nome ?? '');
  const [porcaoG, setPorcaoG] = useState(p0 ? txt(p0.gramas) : '');
  const [base, setBase] = useState<'100g' | 'porcao'>('100g');
  const [valores, setValores] = useState<Record<keyof Nutrientes, string>>(() => {
    const v = {} as Record<keyof Nutrientes, string>;
    for (const c of CAMPOS) v[c.k] = txt(alimento?.por100[c.k]);
    return v;
  });

  const g = num(porcaoG);
  const porcaoOk = g != null && Number.isFinite(g) && g > 0;
  const kcal = num(valores.kcal);
  const numerosOk = CAMPOS.every((c) => { const n = num(valores[c.k]); return n == null || (Number.isFinite(n) && n >= 0); });
  const valido = nome.trim() && kcal != null && kcal >= 0 && numerosOk && (base === '100g' || porcaoOk);

  async function salvar() {
    if (!valido) return;
    const fator = base === 'porcao' ? 100 / g! : 1;
    const por100 = {} as Nutrientes;
    for (const c of CAMPOS) {
      const n = num(valores[c.k]);
      por100[c.k] = n == null ? null : Math.round(n * fator * 10) / 10;
    }
    const cod = codigo.replace(/\D/g, '') || undefined;
    const a: Alimento = {
      id: alimento?.id ?? novoId(),
      fonte: alimento?.fonte ?? 'proprio',
      nome: nome.trim(),
      marca: marca.trim() || undefined,
      codigoBarras: cod,
      por100,
      porcoes: porcaoOk ? [{ nome: porcaoNome.trim() || '1 porção', gramas: g! }] : undefined,
    };
    await salvarProprio(a);
    avisar(`${a.nome} salvo`);
    onSalvo(a);
  }

  return (
    <div class="tela-form">
      <header class="sub-cab">
        <button class="btn-icone" aria-label="Voltar" onClick={onFechar}><I.Voltar /></button>
        <h1>{alimento ? 'Editar alimento' : 'Novo alimento'}</h1>
      </header>

      <section class="cartao bloco">
        <label class="campo largo"><span>Nome</span>
          <input value={nome} autoFocus={!rascunho?.nome && !alimento} placeholder="ex.: Goma de tapioca" onInput={(e) => setNome(e.currentTarget.value)} />
        </label>
        <div class="campos-2">
          <label class="campo"><span>Marca (opcional)</span>
            <input value={marca} onInput={(e) => setMarca(e.currentTarget.value)} />
          </label>
          <label class="campo"><span>Código de barras</span>
            <input value={codigo} inputMode="numeric" placeholder="—" onInput={(e) => setCodigo(e.currentTarget.value)} />
          </label>
        </div>
      </section>

      <section class="cartao bloco">
        <h2>Porção</h2>
        <div class="campos-2">
          <label class="campo"><span>Nome da porção</span>
            <input value={porcaoNome} placeholder="1 porção" onInput={(e) => setPorcaoNome(e.currentTarget.value)} />
          </label>
          <label class="campo"><span>Peso (g ou ml)</span>
            <input value={porcaoG} inputMode="decimal" placeholder="ex.: 30" onInput={(e) => setPorcaoG(e.currentTarget.value)} />
          </label>
        </div>
        <p class="nota">Opcional. Ex.: "1 fatia" de 25 g, "1 colher de sopa" de 15 g. Fica como atalho na hora de registrar.</p>
      </section>

      <section class="cartao bloco">
        <h2>Tabela do rótulo</h2>
        <div class="segmentos">
          <button class={base === '100g' ? 'on' : ''} onClick={() => setBase('100g')}>Por 100 g</button>
          <button class={base === 'porcao' ? 'on' : ''} onClick={() => setBase('porcao')}>
            Por porção{porcaoOk ? ` (${fmtNum(g!)} g)` : ''}
          </button>
        </div>
        {base === 'porcao' && !porcaoOk && <p class="alerta">Preencha o peso da porção acima.</p>}
        <div class="campos-2">
          {CAMPOS.map((c) => (
            <label class="campo" key={c.k}><span>{c.rotulo}</span>
              <input inputMode="decimal" value={valores[c.k]} placeholder={c.obrig ? '' : '—'}
                onInput={(e) => setValores({ ...valores, [c.k]: e.currentTarget.value })} />
            </label>
          ))}
        </div>
        <p class="nota">Deixe em branco o que o rótulo não informa (aparece "—", não zero).</p>
        <button class="btn-principal" disabled={!valido} onClick={salvar}>Salvar alimento</button>
        {alimento && onApagado && (
          <button class="link centro perigo" onClick={async () => {
            await apagarProprio(alimento.id);
            avisar(`${alimento.nome} apagado`);
            onApagado();
          }}>Apagar alimento</button>
        )}
      </section>
    </div>
  );
}
