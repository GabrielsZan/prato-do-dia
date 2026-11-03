import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

// Painel que sobe de baixo da tela. Tocar fora fecha.
export function Folha({ aberta = true, onFechar, children }: { aberta?: boolean; onFechar: () => void; children: ComponentChildren }) {
  if (!aberta) return null;
  return (
    <div class="folha-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div class="folha" role="dialog">
        <div class="folha-pega" />
        {children}
      </div>
    </div>
  );
}

// Aviso rápido no rodapé, com "Desfazer" opcional.
interface Aviso { texto: string; desfazer?: () => void; id: number }
let mostrar: (a: Aviso | null) => void = () => {};
let tempo: ReturnType<typeof setTimeout> | undefined;

export function avisar(texto: string, desfazer?: () => void) {
  clearTimeout(tempo);
  mostrar({ texto, desfazer, id: Date.now() });
  tempo = setTimeout(() => mostrar(null), 4000);
}

export function Avisos() {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  mostrar = setAviso;
  if (!aviso) return null;
  return (
    <div class="aviso" key={aviso.id}>
      <span>{aviso.texto}</span>
      {aviso.desfazer && (
        <button onClick={() => { aviso.desfazer!(); setAviso(null); }}>Desfazer</button>
      )}
    </div>
  );
}
