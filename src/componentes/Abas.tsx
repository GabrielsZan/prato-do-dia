import * as I from './Icones';

export type Aba = 'hoje' | 'progresso' | 'jejum' | 'mais';

export function Abas({ ativa, onAba, onMais }: { ativa: Aba; onAba: (a: Aba) => void; onMais: () => void }) {
  const aba = (id: Aba, nome: string, icone: preact.JSX.Element) => (
    <button class={`aba ${ativa === id ? 'ativa' : ''}`} onClick={() => onAba(id)}>
      {icone}{nome}
    </button>
  );
  return (
    <nav class="abas">
      {aba('hoje', 'Hoje', <I.AbaHoje />)}
      {aba('progresso', 'Progresso', <I.AbaProgresso />)}
      <div class="aba">
        <button class="fab" aria-label="Adicionar alimento" onClick={onMais}><I.Mais tam={26} /></button>
      </div>
      {aba('jejum', 'Jejum', <I.AbaJejum />)}
      {aba('mais', 'Mais', <I.AbaMais />)}
    </nav>
  );
}
