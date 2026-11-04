import { useEffect, useRef } from 'preact/hooks';
import type { ChartConfiguration } from 'chart.js';

// Chart.js só é carregado quando um gráfico aparece (aba Progresso), para o diário abrir rápido.
// Vai junto no app e fica guardado pelo service worker, então funciona sem internet.
let carregando: Promise<typeof import('chart.js')> | null = null;
function chartjs() {
  carregando ??= import('chart.js').then((m) => {
    m.Chart.register(m.LineController, m.BarController, m.LineElement, m.PointElement, m.BarElement, m.CategoryScale, m.LinearScale);
    m.Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';
    m.Chart.defaults.color = '#6B746E';
    return m;
  });
  return carregando;
}

export function Grafico({ config, altura }: { config: ChartConfiguration; altura: number }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const chave = JSON.stringify(config.data) + JSON.stringify(config.options?.scales ?? {});

  useEffect(() => {
    let grafico: import('chart.js').Chart | undefined;
    let vivo = true;
    chartjs().then(({ Chart }) => {
      if (!vivo || !tela.current) return;
      grafico = new Chart(tela.current, config);
    });
    return () => { vivo = false; grafico?.destroy(); };
  }, [chave]);

  return <div style={{ position: 'relative', height: `${altura}px` }}><canvas ref={tela} /></div>;
}
