import taco from '../data/taco.json';
import apelidos from '../data/apelidos.json';
import extras from '../data/extras.json';
import type { Alimento } from './tipos';

interface Apelido { taco: number; nome: string; outros?: string[]; padrao?: boolean }

type LinhaTaco = [number, number, string, ...(number | null)[]];

// Alimentos que vêm junto com o app: TACO (com os apelidos) + extras.
export function carregarCatalogo(): Alimento[] {
  const porTaco = new Map((apelidos as Apelido[]).map((a) => [a.taco, a]));
  const daTaco = (taco.alimentos as LinhaTaco[]).map((l): Alimento => {
    const [id, , nome, kcal, proteina, carbo, gordura, fibra, sodio] = l;
    const ap = porTaco.get(id);
    return {
      id: `taco:${id}`,
      fonte: 'taco',
      nome: ap ? ap.nome : nome,
      nomeOriginal: ap ? nome : undefined,
      outrosNomes: ap?.outros,
      padrao: ap?.padrao,
      por100: { kcal, proteina, carbo, gordura, fibra, sodio } as Alimento['por100'],
    };
  });
  return [...daTaco, ...(extras as Alimento[])];
}
