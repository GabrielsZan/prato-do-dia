import { useEffect, useRef, useState } from 'preact/hooks';
import * as I from '../componentes/Icones';
import { lerCodigo, prepararLeitor } from '../lib/codigo';
import { codigoValido } from '../lib/off';

interface Props {
  onCodigo: (codigo: string) => void;
  onFechar: () => void;
}

// Câmera traseira em tela cheia, lendo a faixa do meio várias vezes por segundo.
export function Escanear({ onCodigo, onFechar }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [manual, setManual] = useState('');
  const pausado = useRef(false); // digitando à mão: a câmera para de ler
  pausado.current = digitando;

  useEffect(() => {
    let parar = false;
    let stream: MediaStream | null = null;
    const tela = document.createElement('canvas');
    const ctx = tela.getContext('2d', { willReadFrequently: true })!;

    async function iniciar() {
      prepararLeitor();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        const nome = (e as Error)?.name;
        setErro(nome === 'NotAllowedError'
          ? 'O app não tem permissão para usar a câmera. No iPhone: Ajustes › Safari › Câmera › Permitir. Ou digite o código abaixo.'
          : 'Não consegui abrir a câmera. Digite o código abaixo.');
        setDigitando(true);
        return;
      }
      if (parar) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      ler();
    }

    async function ler() {
      while (!parar) {
        const v = video.current;
        if (v && v.videoWidth && !pausado.current) {
          // Recorta a faixa central (onde fica a moldura), mais rápido e mais certeiro.
          const w = v.videoWidth, h = Math.round(v.videoHeight * 0.4);
          tela.width = w; tela.height = h;
          ctx.drawImage(v, 0, (v.videoHeight - h) / 2, w, h, 0, 0, w, h);
          try {
            const codigo = await lerCodigo(ctx.getImageData(0, 0, w, h));
            if (codigo && !parar) { parar = true; onCodigo(codigo); return; }
          } catch { /* quadro ruim, tenta o próximo */ }
        }
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    iniciar();
    return () => { parar = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const valido = codigoValido(manual.trim());

  return (
    <div class="tela-camera">
      <video ref={video} playsInline muted autoPlay />
      <div class="camera-moldura"><i /></div>
      <header class="camera-cab">
        <button class="btn-icone claro" aria-label="Fechar" onClick={onFechar}><I.Fechar /></button>
        <span>Aponte para o código de barras</span>
        <span style="width:38px" />
      </header>
      <div class="camera-base">
        {erro && <p class="camera-erro">{erro}</p>}
        {digitando ? (
          <div class="camera-manual">
            <input inputMode="numeric" autoFocus placeholder="Número do código" value={manual}
              onInput={(e) => setManual(e.currentTarget.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && valido && onCodigo(manual.trim())} />
            <button class="btn-principal" disabled={!valido} onClick={() => onCodigo(manual.trim())}>Buscar</button>
            {manual.length >= 8 && !valido && <p class="camera-erro">Esse número não parece um código de barras válido.</p>}
          </div>
        ) : (
          <button class="camera-digitar" onClick={() => setDigitando(true)}>Digitar o código</button>
        )}
      </div>
    </div>
  );
}
