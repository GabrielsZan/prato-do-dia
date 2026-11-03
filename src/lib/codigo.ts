// Leitura de código de barras com zxing-wasm. O arquivo .wasm vai junto no app
// (nada de CDN), então também funciona sem internet para produtos já salvos.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

type Leitor = typeof import('zxing-wasm/reader');
let leitor: Promise<Leitor> | null = null;

function carregar(): Promise<Leitor> {
  leitor ??= import('zxing-wasm/reader').then((m) => {
    m.prepareZXingModule({
      overrides: { locateFile: (caminho: string, prefixo: string) => (caminho.endsWith('.wasm') ? wasmUrl : prefixo + caminho) },
    });
    return m;
  });
  return leitor;
}

export const prepararLeitor = () => carregar();

export async function lerCodigo(imagem: ImageData): Promise<string | null> {
  const m = await carregar();
  const r = await m.readBarcodes(imagem, {
    formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'],
    tryHarder: true,
    maxNumberOfSymbols: 1,
  });
  return r.find((x) => x.isValid)?.text ?? null;
}
