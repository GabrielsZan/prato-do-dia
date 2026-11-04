import { useEffect, useRef, useState } from 'preact/hooks';
import { Abas, type Aba } from './componentes/Abas';
import { Avisos } from './componentes/Folha';
import { atualizarProprios } from './lib/alimentos';
import { lerConfig, refeicaoDoHorario } from './lib/config';
import { hojeISO } from './lib/datas';
import { Hoje } from './telas/Hoje';
import { Adicionar } from './telas/Adicionar';
import { Progresso } from './telas/Progresso';
import { Creditos, Mais, Metas, Refeicoes, type SubTela } from './telas/Mais';
import { Jejum } from './telas/Jejum';
import { Compras } from './telas/Compras';
import { Backup } from './telas/Backup';

type Tela = { aba: Aba; sub?: SubTela; adicionar?: string };

export function App() {
  const [tela, setTela] = useState<Tela>({ aba: 'hoje' });
  const [data, setData] = useState(hojeISO());
  const ponte = useRef<HTMLInputElement>(null);

  useEffect(() => { atualizarProprios(); }, []);

  // Se o app ficou aberto de um dia para o outro, volta para o dia de hoje.
  useEffect(() => {
    let ultimoHoje = hojeISO();
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      const agora = hojeISO();
      if (agora !== ultimoHoje) { setData(agora); ultimoHoje = agora; }
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);

  // No iPhone o teclado só abre se o foco acontecer dentro do toque.
  // Focamos um campo invisível já no toque; a tela Adicionar passa o foco para a busca.
  function abrirAdicionar(refeicao: string) {
    ponte.current?.focus();
    setTela((t) => ({ ...t, adicionar: refeicao }));
  }

  async function abrirPeloHorario() {
    ponte.current?.focus();
    const r = refeicaoDoHorario(await lerConfig('refeicoes'));
    setTela((t) => ({ ...t, adicionar: r.id }));
  }

  let conteudo;
  if (tela.adicionar) {
    conteudo = <Adicionar data={data} refeicao={tela.adicionar} onFechar={() => setTela({ aba: 'hoje' })} />;
  } else if (tela.sub) {
    const voltar = () => setTela({ aba: tela.aba });
    conteudo = tela.sub === 'metas' ? <Metas onVoltar={voltar} />
      : tela.sub === 'refeicoes' ? <Refeicoes onVoltar={voltar} />
      : tela.sub === 'compras' ? <Compras onVoltar={voltar} />
      : tela.sub === 'backup' ? <Backup onVoltar={voltar} />
      : <Creditos onVoltar={voltar} />;
  } else {
    conteudo = (
      <>
        {tela.aba === 'hoje' && <Hoje data={data} onData={setData} onAdicionar={abrirAdicionar} onJejum={() => setTela({ aba: 'jejum' })} />}
        {tela.aba === 'progresso' && <Progresso onAbrirDia={(d) => { setData(d); setTela({ aba: 'hoje' }); }} />}
        {tela.aba === 'jejum' && <Jejum />}
        {tela.aba === 'mais' && <Mais onAbrir={(sub) => setTela({ aba: 'mais', sub })} />}
        <Abas ativa={tela.aba} onAba={(aba) => setTela({ aba })} onMais={abrirPeloHorario} />
      </>
    );
  }

  return (
    <>
      <input ref={ponte} class="ponte-foco" aria-hidden="true" tabIndex={-1} />
      {conteudo}
      <Avisos />
    </>
  );
}
