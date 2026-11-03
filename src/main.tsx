import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { pedirArmazenamentoPersistente } from './lib/db';
import './estilo.css';
import './telas.css';

registerSW({ immediate: true });
pedirArmazenamentoPersistente();

render(<App />, document.getElementById('app')!);
