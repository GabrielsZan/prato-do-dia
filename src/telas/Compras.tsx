import { useRef, useState } from 'preact/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { avisar } from '../componentes/Folha';
import * as I from '../componentes/Icones';
import { db, type ItemCompra } from '../lib/db';

export function Compras({ onVoltar }: { onVoltar: () => void }) {
  const itens = useLiveQuery(() => db.compras.orderBy('id').toArray(), []) ?? [];
  const [texto, setTexto] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const pendentes = itens.filter((i) => !i.feito);
  const feitos = itens.filter((i) => i.feito);

  function adicionar() {
    const t = (campo.current?.value ?? texto).trim(); // o campo, não o estado: Enter logo depois de digitar
    if (!t) return;
    campo.current?.focus();
    setTexto('');
    db.compras.add({ texto: t, feito: 0, criadoEm: Date.now() });
  }

  async function apagar(i: ItemCompra) {
    await db.compras.delete(i.id!);
    avisar(`"${i.texto}" apagado`, () => db.compras.add(i));
  }

  return (
    <div class="tela-simples">
      <header class="sub-cab">
        <button class="btn-icone" aria-label="Voltar" onClick={onVoltar}><I.Voltar /></button>
        <h1>Lista de compras</h1>
      </header>

      <form class="compras-add" onSubmit={(e) => { e.preventDefault(); adicionar(); }}>
        <input ref={campo} value={texto} placeholder="Adicionar item (ex.: ovos)" enterkeyhint="done" aria-label="Novo item"
          onInput={(e) => setTexto(e.currentTarget.value)} />
        <button type="submit" aria-label="Adicionar item" disabled={!texto.trim()}><I.Mais tam={22} /></button>
      </form>

      {!itens.length && <p class="lista-vazia">A lista está vazia. Escreva um item e toque no +.</p>}

      {pendentes.length > 0 && (
        <>
          <div class="secao">Para comprar · {pendentes.length}</div>
          <div class="cartao compras-lista">{pendentes.map((i) => <Item key={i.id} item={i} onApagar={apagar} />)}</div>
        </>
      )}
      {feitos.length > 0 && (
        <>
          <div class="secao compras-sec">
            <span>No carrinho · {feitos.length}</span>
            <button class="link" onClick={async () => {
              await db.compras.bulkDelete(feitos.map((f) => f.id!));
              avisar(`${feitos.length} ${feitos.length === 1 ? 'item tirado' : 'itens tirados'} da lista`, () => db.compras.bulkAdd(feitos));
            }}>Limpar marcados</button>
          </div>
          <div class="cartao compras-lista">{feitos.map((i) => <Item key={i.id} item={i} onApagar={apagar} />)}</div>
        </>
      )}
      {itens.length > 0 && <p class="nota">Toque para marcar. Arraste para a esquerda para apagar.</p>}
    </div>
  );
}

// Arrastar para a esquerda apaga; um toque marca/desmarca.
function Item({ item, onApagar }: { item: ItemCompra; onApagar: (i: ItemCompra) => void }) {
  const [dx, setDx] = useState(0);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const arrastou = useRef(false);

  return (
    <div class={`compras-item-fundo ${dx < 0 ? 'arrastando' : ''}`}>
      <span class="compras-apagar"><I.Lixo /></span>
      <button
        class={`compras-item ${item.feito ? 'feito' : ''}`}
        style={{ transform: `translateX(${dx}px)`, transition: inicio.current ? 'none' : 'transform .2s' }}
        onPointerDown={(e) => { inicio.current = { x: e.clientX, y: e.clientY }; arrastou.current = false; }}
        onPointerMove={(e) => {
          if (!inicio.current) return;
          const d = e.clientX - inicio.current.x;
          if (Math.abs(d) > 8 && Math.abs(d) > Math.abs(e.clientY - inicio.current.y)) arrastou.current = true;
          if (arrastou.current) setDx(Math.min(0, d));
        }}
        onPointerUp={() => {
          inicio.current = null;
          if (dx < -90) onApagar(item); else setDx(0);
        }}
        onPointerCancel={() => { inicio.current = null; setDx(0); }}
        onClick={() => { if (!arrastou.current) db.compras.update(item.id!, { feito: item.feito ? 0 : 1 }); }}
      >
        <span class={`compras-ck ${item.feito ? 'on' : ''}`}>{item.feito ? <I.Certo /> : null}</span>
        <span class="compras-txt">{item.texto}</span>
      </button>
    </div>
  );
}
