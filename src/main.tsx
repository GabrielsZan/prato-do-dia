import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { pedirArmazenamentoPersistente } from './lib/db';
import './estilo.css';
import './telas.css';

registerSW({ immediate: true });
pedirArmazenamentoPersistente();

// Apaga o cache do app antigo (versões "prato-v1", "prato-v2"…), que não é mais usado.
caches?.keys().then((ks) => ks.filter((k) => /^prato-v\d+$/.test(k)).forEach((k) => caches.delete(k))).catch(() => {});

render(<App />, document.getElementById('app')!);
