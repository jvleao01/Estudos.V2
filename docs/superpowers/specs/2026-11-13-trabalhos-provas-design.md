# Trabalhos e Provas (design)

## Intenção
Segunda página com dados reais. O usuário (uso pessoal, sem login) registra os trabalhos e as provas de cada matéria e acompanha, de relance, quanto tempo falta para cada um. O destaque em vermelho chama atenção para o que está perto (7 dias ou menos) ou já passou sem ter sido concluído. Marcar como entregue (trabalho) ou feita (prova) encerra a contagem.

## Objetivos
- Página `frontend/pages/trabalhos.html` com título "Trabalhos e Provas" e duas abas: **Trabalhos** e **Provas**.
- **Trabalhos:** adicionar com matéria, data de entrega e descrição. Ações: marcar como entregue, editar e excluir.
- **Provas:** adicionar com matéria, data e descrição. Ações: marcar como feita, editar e excluir. Sem nota.
- Cada item pendente mostra a contagem de dias. Com 7 dias ou menos, ou com a data vencida, o aviso fica vermelho.
- Concluídos saem da contagem e vão para uma seção recolhida no fim da aba, de onde podem ser desmarcados.

## Não-objetivos
- Nota ou peso de prova.
- Filtro por matéria, busca e notificações.
- Ligar o Dashboard (`index.html`) à API. Ele continua com dados de exemplo.
- Páginas Notas, Cronômetro e Calendário.

## Anti-objetivos
- Perder dados existentes na mudança do banco.
- Aviso de dias errado por causa de fuso horário (por exemplo, "Amanhã" quando a data é hoje).

## Abordagens
- **A (escolhida pelo usuário):** dois blueprints separados, `rotas/trabalhos.py` (`/api/trabalhos`) e `rotas/provas.py` (`/api/provas`), no mesmo estilo de `rotas/materias.py`. A validação comum fica num módulo compartilhado. Cada recurso pode evoluir sozinho, e a contrapartida é um pouco de código repetido.
- **B (descartada):** um módulo que gera as duas APIs a partir de uma configuração. Tem menos código, mas é mais abstrato, e diferenças futuras viram condicionais.
- **C (descartada):** juntar tudo numa tabela única `atividades` com um tipo. Exigiria migrar os dados e reescrever as consultas de Matérias, sem ganho real.

## Banco
Hoje: `trabalhos(id, materia_id, titulo VARCHAR(120), entrega DATE NULL, concluido BOOLEAN)` e `provas(id, materia_id, titulo VARCHAR(120), data DATE NOT NULL)`.

Mudanças, acrescentadas ao fim de `backend/sql/bd.sql` para continuar podendo rodá-lo de novo sem erro (MariaDB 10.4 suporta `IF NOT EXISTS` em coluna):
- `ALTER TABLE provas ADD COLUMN IF NOT EXISTS concluido BOOLEAN NOT NULL DEFAULT 0;`
- `ALTER TABLE trabalhos MODIFY entrega DATE NOT NULL;` (a data de entrega passa a ser obrigatória, pois a contagem depende dela). Antes do `MODIFY`, um `UPDATE trabalhos SET entrega = CURDATE() WHERE entrega IS NULL` evita falha caso exista algum registro sem data.
- Também atualizar os `CREATE TABLE` para refletirem o formato final, para bancos novos.
- A "descrição" da interface é gravada na coluna existente `titulo` (até 120 caracteres). Não se cria coluna nova.
- `seed.sql`: incluir `concluido` nas provas, com uma prova passada já marcada como feita, e um trabalho atrasado não entregue, para demonstrar o vermelho.
- README: instrução para quem já tem o banco: rodar `bd.sql` de novo para aplicar as mudanças (não apaga dados).

## API (JSON)
As duas têm o mesmo formato. Trabalhos usam o campo `entrega` e provas usam `data`, seguindo as colunas.

- `GET /api/trabalhos` e `GET /api/provas`: lista completa com `{id, materiaId, materia: {nome, cor}, titulo, entrega|data, concluido}`. Ordem: pendentes primeiro, por data crescente (atrasados naturalmente no topo); depois concluídos, por data decrescente. A data vai em ISO `AAAA-MM-DD` e `concluido` como booleano.
- `POST` com `{materiaId, titulo, entrega|data}`: 201 com o item criado. `concluido` começa `false`.
- `PATCH /<id>` com campos parciais (`materiaId`, `titulo`, `entrega|data`, `concluido`). Marcar e desmarcar = `{concluido: true|false}`.
- `DELETE /<id>`: 204.
- Erros, iguais a Matérias: 400 `{erro}` em português para validação, 404 para item inexistente, 503 com o banco fora do ar (já tratado em `app.py`).
- Validação: `titulo` de 1 a 120 caracteres após trim; data no formato `AAAA-MM-DD` e válida no calendário; `materiaId` inteiro de uma matéria existente (senão 400 "Matéria não encontrada."); `concluido` booleano. Datas passadas são aceitas (permite registrar algo atrasado).
- Ajuste em `rotas/materias.py`: as "próximas provas" dos cards passam a ignorar provas com `concluido = 1`.

## Interface
- Mesmo tema escuro, ícones SVG (sem emojis), abas, bottom sheet, menu de ações, toast, estados (carregando, vazio, erro com "Tentar de novo") e botão "+" da página de Matérias.
- Topo: título "Trabalhos e Provas". Abas `Trabalhos (n) | Provas (n)`, em que n = pendentes. A aba ativa fica lembrada na URL (`#provas`).
- **Card pendente:** barra lateral na cor da matéria, descrição em destaque, linha "Cálculo II · entrega 18/11" (prova: "Cálculo II · 18/11"), selo de contagem e botão de ação rápida "Entregue" ou "Feita". Menu com Editar e Excluir.
- **Selo de contagem:** "Faltam N dias", "Amanhã", "Hoje"; vencido: "Atrasado há N dias" (trabalho) ou "Passou há N dias" (prova), com "há 1 dia" no singular. Vermelho quando dias ≤ 7, inclusive vencidos; neutro acima disso. Dias calculados no navegador entre a data local de hoje e a data do item, as duas à meia-noite local (reusar `parseDataLocal`).
- **Seção de concluídos:** no fim da aba, recolhida por padrão: "Entregues (n)" ou "Feitas (n)". Itens mais discretos, sem selo, com a data. Menu com Desmarcar, Editar e Excluir.
- **Formulário (bottom sheet):** Matéria (lista das matérias com status `cursando`; ao editar um item cuja matéria já é cursada, ela também aparece selecionada), Data de entrega (ou Data), Descrição. Título "Novo trabalho", "Editar trabalho", "Nova prova", "Editar prova". O "+" abre o formulário da aba ativa.
- Sem matérias cursando: o formulário não abre e aparece um aviso com link para a página de Matérias.
- Excluir pede confirmação. Marcar como entregue ou feita não pede confirmação; o toast mostra "Marcado como entregue" com a opção "Desfazer".
- Navegação inferior: "Trabalhos" passa a apontar para `trabalhos.html` nas duas páginas (`pages/materias.html` e a nova), marcada como ativa na nova.

## Estrutura
- `backend/rotas/validacao.py`: `ErroValidacao`, `erro()`, validadores de texto, data e `materiaId`. `materias.py` passa a importar `ErroValidacao` e `erro` daqui.
- `backend/rotas/trabalhos.py` e `backend/rotas/provas.py`: blueprints registrados em `app.py`.
- `frontend/pages/trabalhos.html`, `frontend/assets/js/trabalhos.js` (página) e `frontend/assets/js/trabalhos-utils.js` (funções puras: dias restantes, texto e urgência do selo, separação pendentes/concluídos).
- Componentes visuais e JS compartilhados com Matérias (abas, sheet, menu, toast, botões, estados, `el()`, `icone()`, `confirmar()`): extrair para `assets/css/componentes.css` e `assets/js/ui.js`, usados pelas duas páginas, em vez de copiar.
- Testes: pytest para as duas APIs (CRUD, validação, 404, ordem, provas concluídas fora dos cards de Matérias), no banco `estudos_test`; `node --test` para `trabalhos-utils.js`. Os testes atuais continuam passando.

## Decisões minhas (o usuário pode corrigir)
- O contador da aba mostra só os pendentes.
- Itens vencidos e não concluídos ficam no topo da lista, em vermelho, até serem marcados ou excluídos.
- Desfazer pelo toast em vez de confirmação ao marcar como concluído.
- A data de entrega passa a ser obrigatória no banco.
- A seção de concluídos começa recolhida e não guarda o estado aberto entre visitas.
- Itens de matérias excluídas somem junto (o `ON DELETE CASCADE` já existente).

## Deixado ao implementador
Ícones exatos, animações, textos de ajuda e estados vazios, limite de caracteres exibido no campo de descrição, detalhes do layout do card em telas largas.
