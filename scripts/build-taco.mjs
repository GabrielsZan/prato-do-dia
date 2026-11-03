// Baixa a TACO (4ª ed., NEPA/Unicamp) do repositório raulfdm/taco-api (MIT)
// e gera src/data/taco.json só com os campos que o app usa.
// Campo vazio na TACO = sem dado → vira null (não zero).
import { writeFileSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/raulfdm/taco-api/main/references/csv/';

async function baixar(nome) {
  const r = await fetch(BASE + nome);
  if (!r.ok) throw new Error(`Falha ao baixar ${nome}: ${r.status}`);
  return lerCsv(await r.text());
}

function lerCsv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.some((v) => v !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}

const num = (v) => (v === '' || v == null ? null : Number(v));

const [foods, nutrientes, categorias] = await Promise.all([
  baixar('food.csv'), baixar('nutrients.csv'), baixar('categories.csv'),
]);
const porId = new Map(nutrientes.map((n) => [n.foodId, n]));

// Ordem dos valores: kcal, proteína, carboidrato, gordura, fibra, sódio (por 100 g)
const alimentos = foods.map((f) => {
  const n = porId.get(f.id) ?? {};
  return [
    Number(f.id), Number(f.categoryId), f.name.replace(/\s+/g, ' ').trim(),
    num(n.kcal), num(n.protein), num(n.carbohydrates), num(n.lipids), num(n.dietaryFiber), num(n.sodium),
  ];
});

const saida = {
  fonte: 'TACO 4ª edição, NEPA/Unicamp, via github.com/raulfdm/taco-api (MIT)',
  campos: ['id', 'categoria', 'nome', 'kcal', 'proteina', 'carbo', 'gordura', 'fibra', 'sodio'],
  categorias: Object.fromEntries(categorias.map((c) => [c.id, c.name])),
  alimentos,
};
writeFileSync(new URL('../src/data/taco.json', import.meta.url), JSON.stringify(saida));
console.log(`taco.json: ${alimentos.length} alimentos, ${categorias.length} categorias`);
