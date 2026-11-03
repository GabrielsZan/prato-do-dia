# Prato do Dia — contagem de calorias

## Sobre o projeto

App pessoal de dieta do Gabriel, para uso só dele, no **iPhone**, como PWA (app web instalado na tela inicial pelo Safari).
Feito **totalmente do zero**: código, visual e conteúdo novos. Não existe código antigo para reaproveitar.

**O coração do app é o diário: registrar o que ele comeu, rápido e sem atrito, no estilo do YAZIO.**
Toda decisão de design deve servir a isso. A pergunta de sempre é: quantos toques leva para registrar uma refeição? Quanto menos, melhor.

Em volta do diário: metas de calorias e macros, código de barras, água, peso, progresso, jejum intermitente, lista de compras e, por último, um cardápio pronto com trocas como sugestão opcional.

### Regra sobre o YAZIO
O YAZIO serve só como referência de **funções**. Não copiar nome, logo, mascote, telas, textos, receitas nem banco de dados dele. Visual, textos e conteúdo são próprios.

## Como trabalhar com o Gabriel

- **Opções antes de implementar.** Em toda decisão grande (stack, estrutura de dados, fluxo de tela, biblioteca), apresente 2–3 opções com os prós e contras e uma recomendação. Implemente só depois que ele escolher.
- **Visual antes de código.** Telas novas começam como mockup estático para ele aprovar.
- **Checkpoints explícitos.** Trabalhe por etapas (veja o Roteiro). Ao fim de cada etapa:
  - mostre o resultado (screenshot no tamanho de celular ou instrução para abrir);
  - liste o que foi feito e o que ficou pendente;
  - **pare e espere o ok** antes de começar a próxima.
- Fale em **português**, de forma direta. Ele não é programador profissional: explique termos técnicos quando forem necessários para uma decisão.
- Commits pequenos, um por passo concluído, com mensagem em português.

## Público e conteúdo

- Interface toda em **português do Brasil**.
- Comida brasileira comum e barata: cuscuz, pão francês, tapioca, ovo, queijo, frango, arroz, feijão, salada, frutas. Nada "viajado".
- Quantidades em **gramas**, exceto itens contados em unidade (ovo, pão francês, fatia etc.).
- Refeições padrão: café da manhã, lanche da manhã, almoço, lanche da tarde e jantar (editáveis). O jantar é com a família, por volta das 21h. Os lanches costumam ser levados ou comprados perto da clínica, que não tem geladeira.
- Meta inicial: **1.700 kcal e 120 g de proteína por dia** (editável).

## Escopo

### Fase 1 (esta versão)

**Diário — tela Hoje (prioridade máxima)**
- Anel com as calorias consumidas e as que faltam para a meta; barras de proteína, carboidrato e gordura.
- Lista das refeições do dia, cada uma com:
  - os alimentos registrados, com gramas e calorias, e o total da refeição;
  - botão **+** que abre direto a tela de adicionar alimento já naquela refeição;
  - tocar num item para editar a quantidade, trocar de refeição ou apagar.
- Navegar entre dias (ontem, amanhã, escolher data). Dá para registrar em dias passados.
- Água e jejum ativo em destaque, sem atrapalhar o diário.

**Adicionar alimento (prioridade máxima)**
- Campo de busca com foco imediato ao abrir; resultados enquanto digita.
- Busca unificada: TACO + alimentos próprios + produtos escaneados. Antes de digitar, mostrar recentes e favoritos; ao digitar, eles aparecem primeiro.
- Quantidade em gramas ou em porção caseira (1 ovo, 1 pão francês, 1 colher...), com prévia das calorias e macros antes de confirmar. A última quantidade usada daquele alimento vem preenchida.
- Registro rápido: tocar no "+" de um recente registra direto com a última quantidade.
- Código de barras pela câmera, buscando no Open Food Facts. Produto encontrado fica salvo localmente.
- Cadastro de alimento próprio (por 100 g ou por porção, copiando do rótulo).
- Adicionar só calorias (e macros, opcional) quando não souber o alimento exato, ex.: "salgado da cantina, ~300 kcal".
- Refeições salvas: um conjunto de alimentos registrado de uma vez (ex.: "meu café de sempre").
- Copiar uma refeição de outro dia (ex.: "repetir o almoço de ontem").
- Favoritar alimentos.

**Metas**
- Definir manualmente ou calcular pela fórmula de Mifflin-St Jeor (peso, altura, idade, sexo, nível de atividade, ritmo de perda).
- Mostrar aviso, sem bloquear, se a meta ficar abaixo do metabolismo basal calculado ou muito baixa.

**Progresso**
- Peso com gráfico (registro semanal; aceita registro em qualquer dia).
- Médias da semana: calorias, proteína, dias dentro da meta.
- Sequência de dias registrados.
- Histórico por dia.

**Mais**
- Água: copos por dia, tamanho do copo configurável.
- Jejum intermitente: timer de início e fim, planos 12:12, 14:10, 16:8, 18:6, 20:4 e personalizado, histórico.
- Lista de compras com itens marcáveis (avulsos e, quando houver cardápio, gerados a partir dele).
- Backup: exportar e importar todos os dados em JSON (compartilhar pelo WhatsApp ou Drive).
- Créditos das fontes de dados.

**Cardápio pronto com trocas (último item da fase 1, opcional)**
- Montado **do zero junto com o Gabriel**, só depois do diário estar pronto e em uso.
- Cada refeição pode ter uma sugestão do cardápio, que aparece discreta na tela Hoje e é registrada com 1 toque.
- Listas de trocas equivalentes por grupo, editáveis no app.
- Se nenhum cardápio estiver configurado, o app funciona normalmente sem ele.

### Fase 2 (depois, não começar sem ele pedir)
- Registro por **foto com IA**: o app manda a foto para uma edge function no Supabase, que chama a API do Claude com visão e devolve os alimentos com gramas estimados; ele confere e confirma antes de registrar. A chave da API fica **só** no servidor, nunca no código do app.
- Receitas próprias com comida simples do dia a dia.
- Registro de exercício (calorias gastas somadas ao dia).
- Relatório de micronutrientes (fibra, sódio, cálcio, ferro etc., que a TACO já tem).

### Fora do escopo
- Relógio, Apple Saúde, Google Fit e Health Connect.
- Login, contas, sincronização na nuvem, anúncios, assinatura.

## Dados de alimentos

### TACO (base principal)
- Tabela Brasileira de Composição de Alimentos, 4ª edição (NEPA/Unicamp): 596 alimentos em 15 categorias, valores por 100 g.
- Fonte dos arquivos: repositório `raulfdm/taco-api` (licença MIT), pasta `references/csv/`:
  - `food.csv` (id, categoryId, name)
  - `nutrients.csv` (foodId, kcal, protein, lipids, carbohydrates, dietaryFiber, sodium, calcium, iron e outros)
  - `categories.csv`
- Criar `scripts/build-taco.mjs`, que baixa esses CSVs e gera um `src/data/taco.json` compacto com os campos que o app usa. Campos vazios significam "sem dado", não zero: mostre "—" na tela e conte como 0 só na soma.
- Os nomes da TACO vêm invertidos ("Pão, trigo, francês", "Arroz, tipo 1, cozido"). Para a busca ficar boa:
  - ignorar acentos e maiúsculas;
  - casar as palavras em qualquer ordem;
  - criar `src/data/apelidos.json` com nomes do dia a dia ("pão francês", "arroz branco", "peito de frango") apontando para o item certo;
  - mostrar o nome do dia a dia na lista, com o nome da TACO em letra menor;
  - em empates, preferir a versão pronta para comer (cozido, grelhado) à crua.
- Verificado: arroz, feijão carioca, pão francês, cuscuz de milho, ovo, peito de frango, queijo minas, banana e mamão estão na tabela.

### Complementos
- Itens que faltam na TACO (ex.: goma de tapioca pura, whey, pão de forma) vão em `src/data/extras.json`, com a fonte de cada valor. Prefira pedir ao Gabriel a foto ou os dados do rótulo do produto que ele usa; não invente valores.
- Porções caseiras (1 ovo, 1 pão francês, 1 fatia, 1 colher de sopa...) ficam em `src/data/porcoes.json`. Confirme os pesos com ele.

### Open Food Facts (código de barras)
- `GET https://world.openfoodfacts.org/api/v2/product/{codigo}.json`
- Usar `product_name`, `brands` e, em `nutriments`, os campos `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`, `fiber_100g` e `sodium_100g`.
- Se o produto não existir ou vier sem calorias, abrir o cadastro de alimento próprio já com o código preenchido.
- Precisa de internet só no momento do escaneamento.
- Licença ODbL: dar o crédito "Dados de produtos: Open Food Facts" na tela de créditos.

## Decisões da Etapa 0 (aprovadas em 03/11/2026)

- **Nome**: Prato do Dia.
- **Visual**: claro e fresco. Fundo `#F7F7F2`, cartões brancos com cantos arredondados, verde-folha `#2F9E5B` como cor principal, proteína em laranja `#F08A24`, carboidrato em amarelo `#E2B228`, gordura em azul `#4F86E8`. Fonte do sistema (SF no iPhone), sem fontes externas.
- **Mockups aprovados** em `mockups/` (hoje, adicionar, quantidade). São a referência visual das telas.
- **Barra de baixo**: Hoje, Progresso, **+** central (abre a busca na refeição do horário), Jejum, Mais.
- **Toques**: recente = 2 toques (+ da refeição, + do alimento); alimento novo = 3 toques + digitação.

## Arquitetura

- **Vite + TypeScript + Preact**: componentes leves, fácil de organizar muitas telas, build pequeno.
- **PWA**: `manifest.webmanifest` e service worker que guarda o app inteiro para funcionar offline. Respeitar as áreas seguras do iPhone (`env(safe-area-inset-*)`, `viewport-fit=cover`).
- **Hospedagem**: GitHub Pages em `https://gabrielszan.github.io/prato-do-dia/` (repositório público `GabrielsZan/prato-do-dia`, remoto `origin`). Desde 03/11/2026 substitui o app antigo (cardápio), que fica no histórico (commit `beedeb3`). Ele escolheu começar do zero, sem importar dados do antigo.
- **Publicar**: `git push origin main`. O workflow `.github/workflows/publicar.yml` roda os testes, monta e publica sozinho. O service worker (vite-plugin-pwa) atualiza o app no iPhone na próxima abertura.
- **Testes de tela**: `npm run build`, depois `npm run telas` (diário) e `node scripts/teste-codigo.mjs` (código de barras com câmera falsa). `URL=https://gabrielszan.github.io/prato-do-dia/ npm run telas` testa o site publicado.
- **IndexedDB com Dexie.js** para os dados. Pedir `navigator.storage.persist()`. Lembrar que o Safari pode apagar dados de sites não instalados; instalado na tela inicial fica protegido, e o backup cobre o resto.
- **Tudo offline**, exceto o código de barras. Ícones empacotados no app.
- Código de barras: câmera pelo navegador (`getUserMedia`) com leitura em JavaScript (ex.: `@zxing/browser`), porque o Safari não tem `BarcodeDetector`.
- Backup: exportar com a Web Share API (`navigator.share` com arquivo), que abre a tela de compartilhar do iPhone (WhatsApp, Drive, Arquivos); importar com `<input type="file">`.

### Modelo de dados (ponto de partida)
- `alimentos`: id, nome, apelido, fonte (taco | extra | proprio | off), código de barras, valores por 100 g, porções, favorito, última quantidade usada.
- `registros`: data, refeição, alimentoId (ou "só calorias"), gramas e uma **cópia dos valores nutricionais** do momento do registro (editar um alimento depois não muda o histórico).
- `refeicoesSalvas`.
- `agua` (por dia), `peso` (data, kg), `jejuns` (início, fim, plano), `compras`.
- `cardapio` e `trocas` (só na etapa do cardápio).
- `config`: metas, refeições do dia, tamanho do copo de água, plano de jejum.

## Roteiro (uma etapa por vez, com checkpoint no fim de cada uma)

0. **Decisões e mockups** — concluída (veja "Decisões da Etapa 0").
1. **Base**: projeto Vite + Preact como PWA, banco local com Dexie, script da TACO, apelidos e busca funcionando.
2. **Diário**: telas Hoje e Adicionar alimento completas (recentes, favoritos, porções, editar e apagar, só calorias, refeições salvas, copiar refeição), metas e troca de dia.
3. **Código de barras** com o Open Food Facts e cadastro de alimento próprio.
4. **Primeira versão no iPhone**: publicar no GitHub Pages (no lugar do app antigo) e instalar na tela inicial para ele já começar a usar o diário no dia a dia. A partir daqui, cada etapa termina com uma versão publicada.
5. **Água, peso e progresso**: gráficos, médias semanais e sequência.
6. **Jejum, compras e backup.**
7. **Cardápio e trocas**, montados do zero com ele, a partir do que ele já estiver comendo no diário.

## Testes

- Testar toda tela em viewport de celular (390×844) com Playwright e conferir por screenshot.
- Antes de cada checkpoint:
  - registrar alimentos e conferir se as somas do dia batem (calorias e macros calculadas a partir das gramas);
  - contar os toques para registrar um alimento recente e um alimento novo; se aumentou, explicar por quê;
  - fechar e reabrir o app e conferir se os dados continuam lá;
  - abrir sem internet e conferir se tudo funciona, exceto o código de barras;
  - exportar e importar um backup e conferir se nada se perde.
- No iPhone (app instalado na tela inicial):
  - permissão de câmera e escaneamento real de um produto;
  - backup pela tela de compartilhar do iPhone;
  - nada escondido atrás do notch, da ilha dinâmica ou da barra de gestos.
- **Atualizações sem perder dados**: depois da primeira versão, ele vai ter dados reais no celular. Manter sempre o mesmo endereço (os dados ficam presos à origem `gabrielszan.github.io`) e o mesmo nome de banco do Dexie. Remover o app da tela inicial apaga os dados. A cada versão nova, mudar a versão do service worker para o iPhone baixar a atualização. Antes de qualquer mudança no formato do banco, escrever a migração do Dexie e lembrar ele de exportar um backup.
