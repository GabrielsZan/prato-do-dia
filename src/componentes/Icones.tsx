// Ícones desenhados à mão (sem biblioteca), no traço dos mockups.
type P = { tam?: number };
const base = (tam: number, largura = 2.4) => ({
  width: tam, height: tam, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  'stroke-width': largura, 'stroke-linecap': 'round' as const, 'stroke-linejoin': 'round' as const,
});

export const Mais = ({ tam = 18 }: P) => <svg {...base(tam, 2.6)}><path d="M12 5v14M5 12h14" /></svg>;
export const Fechar = ({ tam = 22 }: P) => <svg {...base(tam)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Voltar = ({ tam = 22 }: P) => <svg {...base(tam)}><path d="M15 5l-7 7 7 7" /></svg>;
export const Avancar = ({ tam = 18 }: P) => <svg {...base(tam)}><path d="M9 5l7 7-7 7" /></svg>;
export const Abaixo = ({ tam = 16 }: P) => <svg {...base(tam, 2.6)}><path d="M6 9l6 6 6-6" /></svg>;
export const Lupa = ({ tam = 20 }: P) => <svg {...base(tam)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const Raio = ({ tam = 16 }: P) => <svg {...base(tam)}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></svg>;
export const Copiar = ({ tam = 16 }: P) => <svg {...base(tam)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V5a1 1 0 011-1h11" /></svg>;
export const Reticencias = ({ tam = 20 }: P) => <svg {...base(tam)}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>;
export const Relogio = ({ tam = 16 }: P) => <svg {...base(tam, 2.2)}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>;
export const Codigo = ({ tam = 22 }: P) => <svg {...base(tam, 2)}><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M16 8v8" /></svg>;
export const Gota = ({ tam = 20 }: P) => <svg width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5C8 8 6 11.2 6 14.5a6 6 0 0012 0C18 11.2 16 8 12 2.5z" /></svg>;
export const Fogo = ({ tam = 24 }: P) => <svg width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 01-10 0c0-2.5 1.2-3.8 2-5 .3 2 1.3 3 2.3 3C11 8 12 5 12 2z" /></svg>;
export const Certo = ({ tam = 14 }: P) => <svg {...base(tam, 3.5)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const Lixo = ({ tam = 18 }: P) => <svg {...base(tam, 2.2)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const Estrela = ({ tam = 20, cheia = false }: P & { cheia?: boolean }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill={cheia ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.7l6.2-.9z" />
  </svg>
);

export const AbaHoje = () => <svg {...base(24, 2.2)}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 10h8M8 14h5" /></svg>;
export const AbaProgresso = () => <svg {...base(24, 2.2)}><path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" /></svg>;
export const AbaJejum = () => <svg {...base(24, 2.2)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>;
export const AbaMais = () => <svg {...base(24, 2.2)}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
