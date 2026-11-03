import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { Busca } from './telas/Busca';
import { pedirArmazenamentoPersistente } from './lib/db';
import './estilo.css';

registerSW({ immediate: true });
pedirArmazenamentoPersistente();

render(<Busca />, document.getElementById('app')!);
