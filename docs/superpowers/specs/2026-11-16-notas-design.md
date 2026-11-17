# Notas (design)

## Intenção
O usuário (uso pessoal, sem login) quer saber, por matéria, quanto já tirou e **quantos pontos ainda faltam para ser aprovado**. Para isso, cada matéria passa a ter uma nota mínima de aprovação e um total de pontos, e cada prova e trabalho passa a ter um valor. A nota de cada item é registrada só depois que ele foi entregue/feito, mas sem pressa: o usuário lança quando quiser. Simulados contam como ponto bônus, que ajuda a atingir o mínimo mas nunca faz a nota passar do total.

## Objetivos
- Página nova `frontend/pages/notas.html`, título "Notas", com um card por matéria **cursando**.
- Matéria ganha **nota mínima** e **total de pontos**, informados no formulário de Matérias.
- Prova e trabalho ganham **valor** (quanto vale), informado no formulário de Trabalhos e Provas.
- Prova ganha o tipo **Prova / Simulado**. Simulado aparece na aba Provas com a etiqueta "Simulado" e funciona como prova (data, contagem, marcar como feito).
- Nota só pode ser lançada em item **concluído**. Lançar é opcional e pode acontecer a qualquer momento depois.
- No card: pontos obtidos, bônus, nota final, quanto falta para o mínimo, pontos em jogo, situação (aprovado / falta / não dá mais), e a lista dos itens concluídos com a nota ou "Lançar nota".

## Não-objetivos
- Mínimo por prova ou trabalho (o mínimo é só da matéria).
- Médias ponderadas, recuperação, conversão para conceito (A, B, C).
- Notas de matérias já cursadas (a página mostra só as cursando).
- Gráficos de evolução de nota.
- Mostrar notas no Dashboard.

## Anti-objetivos
- Perder dados existentes na mudança do banco.
- Permitir lançar nota em item ainda não entregue/feito.
- Nota final acima do total da matéria por causa do bônus.
- Erro de arredondamento em decimais (ex.: 7,5 + 2,3 virar 9,799999).

## Regras de cálculo
Para uma matéria com `minimo` e `total`:
- `obtidos` = soma das notas lançadas em provas (não simulado) e trabalhos concluídos.
- `bonus` = soma das notas lançadas em simulados concluídos.
- `final` = mín(`obtidos` + `bonus`, `total`). O bônus só completa até o total.
- `falta` = máx(`minimo` − `final`, 0).
- `emJogo` = soma do valor de provas (não simulado) e trabalhos **sem nota**, concluídos ou não. Simulados ficam de fora, para o aviso abaixo não depender de bônus incerto.
- Situação:
  - **Aprovado** quando `final` ≥ `minimo`.
  - **Não dá mais** quando `falta` > `emJogo` (mesmo tirando o máximo em tudo que resta, sem contar simulados, não atinge o mínimo).
  - **Faltam N pontos** nos demais casos.
- `distribuidos` = soma do valor de provas (não simulado) e trabalhos da matéria. Se passar do `total`, o card mostra o aviso "Os valores somam X, mais que o total de Y". Não bloqueia nada.
- Matéria sem `minimo`/`total` definidos: o card mostra "Defina o mínimo e o total" com atalho para Matérias e não calcula situação. Itens antigos sem `valor` não somam em `emJogo` nem em `distribuidos` e mostram "Sem valor" na lista, com atalho para editar em Trabalhos e Provas (não dá para lançar nota neles até ter valor, ver API).
- Valores e notas com até 1 casa decimal. Contas feitas em décimos inteiros (×10) para evitar erro de ponto flutuante; exibição com vírgula ("7,5"), sem ",0" em números inteiros.

## Abordagens
- **A (escolhida):** colunas novas nas tabelas existentes + `GET /api/notas` com os dados crus; cálculo em `notas-utils.js` (funções puras testadas com `node --test`), no mesmo padrão de `dashboard-utils.js` e `trabalhos-utils.js`. A nota é lançada pelos `PATCH` que já existem.
- **B (descartada):** tabela `notas` separada (tipo do item + id do item). Sem chave estrangeira real, quebra o `ON DELETE CASCADE` e deixa notas órfãs.
- **C (descartada):** cálculo inteiro no backend. Funciona, mas foge do padrão do projeto, em que a API entrega dados e as regras de exibição ficam nos `*-utils.js`.

## Banco
Acrescentar ao fim de `backend/sql/bd.sql` (pode rodar de novo, não apaga dados) e atualizar os `CREATE TABLE` para bancos novos:
- `materias`: `nota_minima DECIMAL(6,1) NULL`, `nota_total DECIMAL(6,1) NULL`.
- `provas`: `valor DECIMAL(6,1) NULL`, `nota DECIMAL(6,1) NULL`, `simulado BOOLEAN NOT NULL DEFAULT 0`.
- `trabalhos`: `valor DECIMAL(6,1) NULL`, `nota DECIMAL(6,1) NULL`.

As colunas são `NULL` no banco para não quebrar registros antigos. A obrigatoriedade para registros novos fica na API (abaixo).

`seed.sql`: matérias cursando com mínimo/total (ex.: 60/100); provas e trabalhos com valor; algumas notas lançadas; um simulado feito com nota; uma matéria aprovada só graças ao bônus; uma matéria com item concluído sem nota; uma matéria em "não dá mais".

README: rodar `bd.sql` de novo para quem já tem o banco.

## API
Todos os números trafegam como número JSON (ex.: `7.5`), ou `null`.

**Matérias** (`/api/materias`)
- Campos novos `notaMinima` e `notaTotal` na resposta.
- `POST`: os dois são **obrigatórios**. `PATCH`: opcionais.
- Validação: número ≥ 0, até 1 casa decimal, até 9999,9; `notaTotal` > 0; `notaMinima` ≤ `notaTotal` (considerando o valor já gravado quando só um vem no `PATCH`).

**Provas** (`/api/provas`) e **Trabalhos** (`/api/trabalhos`)
- Campos novos na resposta: `valor`, `nota`; provas também `simulado` (booleano).
- `POST`: `valor` **obrigatório** (> 0, até 1 casa decimal). Provas aceitam `simulado` (padrão `false`). `nota` não é aceita no `POST` (item nasce não concluído).
- `PATCH`: aceita `valor`, `simulado` (provas) e `nota`.
  - `nota`: número ≥ 0 com até 1 casa decimal, ou `null` para apagar.
  - `nota: null` é sempre aceito (apagar nunca é bloqueado).
  - Recusa (400) nota numérica em item que, após o `PATCH`, não estará concluído: "Só é possível lançar nota depois de concluir."
  - Recusa (400) nota maior que o valor do item (o valor após o `PATCH`): "A nota não pode passar do valor (30)." Item sem valor: recusa com "Defina o valor antes de lançar a nota."
  - Recusa (400) mudar `valor` para menos que a nota já lançada.
- **Desmarcar concluído** com nota lançada: a nota é mantida no banco, mas ignorada pela página Notas enquanto o item não estiver concluído. Assim o "Desfazer" do toast não perde a nota. (Decisão minha.)
- Ordem e demais regras das listas continuam as mesmas.

**Notas** (`GET /api/notas`, blueprint novo `rotas/notas.py`)
- Devolve as matérias **cursando**, em ordem de nome, cada uma com `{id, nome, cor, notaMinima, notaTotal, itens: [...]}`.
- `itens`: **todas** as provas e trabalhos da matéria (concluídos ou não), cada um com `{id, tipo: "prova"|"trabalho", titulo, data, valor, nota, simulado, concluido}`. Os não concluídos são necessários para calcular `emJogo` e `distribuidos`; a lista do card mostra só os concluídos.
- Ordem dos itens: data crescente, depois id.

## Interface

**Formulário de Matérias:** campos "Nota mínima" e "Total de pontos" lado a lado (input numérico, passo 0,1). Obrigatórios ao criar. Ao editar uma matéria antiga sem esses valores, os campos vêm vazios e são obrigatórios para salvar.

**Formulário de Trabalhos e Provas:**
- Campo "Valor" (pontos) obrigatório, ao criar e ao editar.
- Só na aba Provas: seletor "Prova / Simulado" no topo do formulário. Títulos: "Novo simulado", "Editar simulado".
- Card de simulado na aba Provas: etiqueta "Simulado" ao lado da descrição. Todo o resto igual à prova.
- Card mostra "vale 30" na linha de detalhes.
- Item concluído com nota mostra a nota ("25 / 30") na seção de concluídos. Lançar nota fica na página Notas (não duplicar o fluxo aqui).

**Página Notas:**
- Mesmo tema, componentes de `ui.js` e `componentes.css`, estados (carregando, vazio, erro com "Tentar de novo"), animação AOS.
- Sem matérias cursando: estado vazio com link para Matérias.
- Card por matéria, com barra/realce na cor da matéria:

```
┌ Cálculo II ───────────────────── mínimo 60 / 100 ┐
│ 55 pontos  + 8 bônus  = 63          ✓ Aprovado   │
│ [barra de progresso até o mínimo]                │
│ Em jogo: 30 pontos                               │
│ ─────────────────────────────────────────────────│
│ Prova 1          vale 30      25                 │
│ Trabalho 1       vale 20      18                 │
│ Prova 2          vale 30      [Lançar nota]      │
│ Simulado 1  BÔNUS  vale 10     8                 │
└──────────────────────────────────────────────────┘
```

- Selo de situação: "Aprovado" (verde), "Faltam N pontos" (neutro), "Não dá mais" (vermelho).
- "+ N bônus" só aparece se houver bônus > 0. Se o bônus foi cortado pelo total, mostra a nota final igual ao total.
- Lista: só itens concluídos, em ordem de data. Item sem nota tem o botão "Lançar nota"; com nota, tocar abre a mesma folha para editar ou apagar a nota.
- **Folha de nota** (bottom sheet): título do item, "vale 30", campo "Nota" (passo 0,1, máx = valor). Botões Salvar e, se já houver nota, "Remover nota". Toast "Nota salva".
- Nenhum item concluído: "Nenhuma prova ou trabalho concluído ainda."
- Matéria sem mínimo/total: aviso no card com link para Matérias; a lista aparece mesmo assim.

**Navegação:** item "Notas" no menu (inferior no celular, lateral no computador) em todas as páginas, depois de "Trabalhos". Ícone SVG no mesmo estilo.

## Estrutura
- `backend/rotas/validacao.py`: validador de número com 1 casa decimal (reaproveitado por matérias, provas e trabalhos); `validar_item` passa a tratar `valor`, `nota` e (para provas) `simulado`.
- `backend/rotas/materias.py`, `provas.py`, `trabalhos.py`: campos novos e regras de nota.
- `backend/rotas/notas.py`: `GET /api/notas`, registrado em `app.py`.
- `frontend/pages/notas.html`, `frontend/assets/js/notas.js` (página), `frontend/assets/js/notas-utils.js` (cálculos e formatação), `frontend/assets/css/notas.css`.
- Ajustes em `materias.js`, `trabalhos.js`, `trabalhos-utils.js` se necessário, e nos HTML para o menu.
- Testes: pytest para validação nova (matérias, provas, trabalhos), regras da nota (não concluído, acima do valor, `null`, valor menor que nota) e `GET /api/notas`; `node --test` para `notas-utils.js` cobrindo bônus cortado pelo total, "não dá mais", matéria sem mínimo, itens sem valor, decimais. Os testes atuais continuam passando (ajustando os que criam matérias/provas/trabalhos para enviar os campos obrigatórios novos).

## Decisões minhas (o usuário pode corrigir)
- Nota não pode passar do valor do item.
- Soma dos valores acima do total gera aviso, não bloqueio.
- "Em jogo" não conta simulados.
- Registros antigos ficam sem valores; a página pede para defini-los.
- Notas e valores com até 1 casa decimal.
- Desmarcar concluído mantém a nota guardada, mas ela deixa de contar.
- Lançar nota só pela página Notas.
- Página mostra só matérias cursando.

## Deixado ao implementador
Ícone do menu, cores exatas dos selos, layout em telas largas (ex.: cards em grade), textos de ajuda, animações.
