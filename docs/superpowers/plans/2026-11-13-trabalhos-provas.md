# Trabalhos e Provas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `pages/trabalhos.html` (abas Trabalhos / Provas) com contagem de dias, marcar como entregue/feita, editar e excluir, sobre as APIs `/api/trabalhos` e `/api/provas`.

**Architecture:** Dois blueprints Flask separados (`rotas/trabalhos.py`, `rotas/provas.py`) com validação comum em `rotas/validacao.py`, no estilo de `rotas/materias.py`. Componentes de interface de Matérias extraídos para `assets/css/componentes.css` e `assets/js/ui.js`, reusados pela página nova. Cálculo de dias no navegador, em funções puras testadas com `node --test`.

**Tech Stack:** Python 3.14, Flask 3, PyMySQL, pytest; MariaDB 10.4 do XAMPP (porta 8000); JS puro em scripts clássicos; `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-13-trabalhos-provas-design.md`

## Global Constraints
- Toda a interface e as mensagens de erro em português; erros da API no formato `{"erro": "..."}`.
- Sem emojis na interface; ícones SVG inline; tema escuro com os tokens de `style.css`.
- Todo texto vindo do usuário entra no DOM via `textContent` (helper `el()`), nunca `innerHTML`.
- Descrição: 1 a 120 caracteres após trim, gravada na coluna `titulo`.
- Datas em ISO `AAAA-MM-DD`; datas passadas são aceitas.
- Vermelho (urgente) quando dias restantes ≤ 7, inclusive negativos; nunca para concluídos.
- `bd.sql` precisa continuar podendo ser rodado de novo num banco existente sem erro e sem perder dados.
- Testes de API no banco `estudos_test` (conftest existente); os testes atuais continuam passando.
- Commits em português no formato `tipo: descrição`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
- Prova/trabalho com data de hoje → selo "Hoje", vermelho; ontem → "Atrasado há 1 dia"/"Passou há 1 dia" (singular). Coberto em Task 4.
- Data inexistente no calendário (`2026-02-30`) ou formato `18/11/2026` → 400, não 500. Coberto em Task 2.
- Descrição com HTML (`<b>x</b>`) aparece como texto literal no card. Coberto em Task 6 (verificação manual).
- Rodar `bd.sql` de novo num banco que já tem provas → coluna `concluido` criada, provas preservadas. Coberto em Task 1.
- Editar um item cuja matéria já foi finalizada (status `cursada`) → a matéria aparece selecionada no formulário e salvar não a troca. Coberto em Task 6 (verificação manual).

---

### Task 1: Banco: `provas.concluido` e entrega obrigatória

**Files:**
- Modify: `backend/sql/bd.sql`, `backend/sql/seed.sql`, `README.md`
- Test: `backend/tests/test_banco.py` (novo)

**Interfaces:**
- Produces: `provas.concluido BOOLEAN NOT NULL DEFAULT 0`; `trabalhos.entrega DATE NOT NULL`.

- [ ] **Step 1: Write the failing tests** em `backend/tests/test_banco.py`, usando a fixture `db` e reaproveitando `_executar_script` e o texto do `bd.sql` (com `` `estudos` `` trocado por `` `estudos_test` ``) como o `conftest.py` faz:
  - `test_provas_tem_concluido_padrao_falso`: `INSERT INTO materias ...; INSERT INTO provas (materia_id, titulo, data)` sem `concluido` → `SELECT concluido` retorna `0`.
  - `test_entrega_obrigatoria`: `INSERT INTO trabalhos (materia_id, titulo) VALUES (...)` levanta `pymysql.err.IntegrityError` ou `OperationalError` (coluna NOT NULL sem default).
  - `test_bd_sql_pode_rodar_de_novo_sem_perder_dados`: insere uma matéria e uma prova, roda o script inteiro de novo, a prova continua lá (`COUNT(*) == 1`).
- [ ] **Step 2: Run** `.venv\Scripts\python -m pytest backend/tests/test_banco.py -q` → as duas primeiras falham.
- [ ] **Step 3: Implement.** Nos `CREATE TABLE`: `entrega DATE NOT NULL` e `concluido BOOLEAN NOT NULL DEFAULT 0` em `provas`. Ao fim do arquivo, para bancos já existentes, nesta ordem: `UPDATE trabalhos SET entrega = CURDATE() WHERE entrega IS NULL;` `ALTER TABLE trabalhos MODIFY entrega DATE NOT NULL;` `ALTER TABLE provas ADD COLUMN IF NOT EXISTS concluido BOOLEAN NOT NULL DEFAULT 0;`. Atenção: o conftest divide o script por `;`, então nada de `;` dentro de comentários.
- [ ] **Step 4: Seed.** Em `seed.sql`, `INSERT INTO provas (materia_id, titulo, data, concluido)`: a `P1` de Química (`CURDATE() - INTERVAL 3 DAY`) com `concluido = 1`, as outras `0`. Acrescentar o trabalho `(2, 'Relatório de laboratório', CURDATE() - INTERVAL 3 DAY, 0)` (atrasado).
- [ ] **Step 5: README.** Na seção Rodar, depois do passo de criar o banco: "Já tinha o banco de uma versão anterior? Rode o `bd.sql` de novo para aplicar as mudanças (não apaga dados)."
- [ ] **Step 6: Run** `.venv\Scripts\python -m pytest backend/tests -q` → tudo passa. Aplicar no banco real: `c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 < backend\sql\bd.sql` e depois o `seed.sql`; conferir `DESCRIBE provas` com `concluido`.
- [ ] **Step 7: Commit** `feat: provas com concluido e entrega obrigatoria no banco`.

---

### Task 2: Validação comum e API de trabalhos

**Files:**
- Create: `backend/rotas/validacao.py`, `backend/rotas/trabalhos.py`
- Modify: `backend/rotas/materias.py` (importar `ErroValidacao` e `erro` de `validacao`), `backend/app.py` (registrar o blueprint)
- Test: `backend/tests/test_trabalhos.py`

**Interfaces:**
- Produces (`rotas/validacao.py`):
  - `class ErroValidacao(Exception)`, `erro(msg: str, status: int) -> (Response, int)` (movidos de `materias.py`, mesmo comportamento).
  - `validar_item(dados, campo_data: str, parcial: bool = False) -> dict`: devolve só os campos presentes e válidos, com nomes de coluna: `materia_id` (de `materiaId`), `titulo`, `<campo_data>` (string ISO), `concluido` (bool). Em criação (`parcial=False`) `materiaId`, `titulo` e a data são obrigatórios; `concluido` nunca é obrigatório. Mensagens exatas: não-dict → `"Envie os dados em JSON."`; título → `"A descrição deve ter entre 1 e 120 caracteres."`; data → `"Data inválida. Use o formato AAAA-MM-DD."` (validar com `date.fromisoformat` só após casar `^\d{4}-\d{2}-\d{2}$`); `materiaId` que não seja `int` (bool não conta como int) → `"Matéria inválida."`; `concluido` não-bool → `"O campo concluído deve ser verdadeiro ou falso."`.
  - `materia_existe(cur, materia_id: int) -> bool`.
- Produces (API): `GET/POST /api/trabalhos`, `PATCH/DELETE /api/trabalhos/<int:id>`. Item: `{id, materiaId, materia: {nome, cor}, titulo, entrega, concluido}` (`concluido` como `true/false`, `entrega` ISO). POST → 201; matéria inexistente em POST/PATCH → 400 `"Matéria não encontrada."`; id inexistente → 404 `"Trabalho não encontrado."`; DELETE → 204.

- [ ] **Step 1: Write the failing tests** em `test_trabalhos.py` (helper `materia(client)` que cria uma matéria via `/api/materias` e devolve o id):
  - `test_criar_e_listar`: POST `{materiaId, titulo: "  Lista 3  ", entrega: "2026-12-01"}` → 201, `titulo == "Lista 3"`, `concluido is False`, `materia == {"nome": ..., "cor": ...}`; GET devolve 1 item igual.
  - `test_ordem_pendentes_por_data_e_concluidos_no_fim`: cria A (+10 dias), B (−2 dias), C (+1 dia, concluído via PATCH), D (−5 dias, concluído) → títulos na ordem `[B, A, C, D]`.
  - `test_marcar_e_desmarcar`: PATCH `{concluido: true}` → `concluido is True`; PATCH `{concluido: false}` → `False`.
  - `test_editar_campos_parciais`: PATCH `{titulo: "Novo"}` mantém `entrega` e `materiaId`.
  - `test_excluir` → 204, depois PATCH no mesmo id → 404.
  - `test_validacao` parametrizado, todos 400 com a mensagem exata: título `""`, `"   "`, 121 caracteres; `entrega` `"2026-02-30"`, `"18/11/2026"`, ausente; `materiaId` `"1"`, `True`, ausente; `concluido` `"sim"`. E `materiaId` 9999 → 400 `"Matéria não encontrada."`.
  - `test_data_passada_aceita`: entrega de ontem → 201.
  - `test_trabalho_conta_nos_cards_de_materias`: depois de criar um pendente, `GET /api/materias` mostra `trabalhos == 1`, `trabalhosPendentes == 1`.
- [ ] **Step 2: Run** `.venv\Scripts\python -m pytest backend/tests/test_trabalhos.py -q` → falham (404 na rota).
- [ ] **Step 3: Implement** `validacao.py`, `trabalhos.py` e o registro em `app.py`. Uma consulta `SELECT ... JOIN materias` com `ORDER BY` que entregue a ordem do teste (pendentes por `entrega` crescente; concluídos por `entrega` decrescente; desempate por `id`). Erros de validação via `bp.register_error_handler(ErroValidacao, ...)` → 400. Nomes de coluna no `UPDATE` vêm só de `validar_item`, nunca do JSON.
- [ ] **Step 4: Run** `.venv\Scripts\python -m pytest backend/tests -q` → tudo passa (inclusive `test_materias.py`, após o import mudar).
- [ ] **Step 5: Commit** `feat: api de trabalhos`.

---

### Task 3: API de provas e provas feitas fora dos cards de Matérias

**Files:**
- Create: `backend/rotas/provas.py`
- Modify: `backend/app.py`, `backend/rotas/materias.py` (consulta de provas em `buscar`)
- Test: `backend/tests/test_provas.py`, `backend/tests/test_materias.py`

**Interfaces:**
- Consumes: `validar_item(dados, "data", parcial)`, `materia_existe`, `ErroValidacao`, `erro` (Task 2).
- Produces: `/api/provas` igual a `/api/trabalhos`, com o campo `data` no lugar de `entrega` e 404 `"Prova não encontrada."`.

- [ ] **Step 1: Write the failing tests:** em `test_provas.py`, `test_criar_e_listar`, `test_ordem_pendentes_por_data_e_concluidos_no_fim`, `test_marcar_e_desmarcar`, `test_excluir` e `test_validacao_data` (`"2026-02-30"` → 400) espelhando a Task 2 com `data`. Em `test_materias.py`, `test_prova_feita_nao_aparece_nos_cards`: duas provas futuras, uma marcada via `PATCH /api/provas/<id> {concluido: true}` → `GET /api/materias` lista só a outra em `provas`.
- [ ] **Step 2: Run** `.venv\Scripts\python -m pytest backend/tests -q` → os novos falham.
- [ ] **Step 3: Implement** `provas.py`, registro em `app.py`, e `AND NOT concluido` na consulta de provas de `buscar()` em `materias.py`.
- [ ] **Step 4: Run** `.venv\Scripts\python -m pytest backend/tests -q` → tudo passa.
- [ ] **Step 5: Commit** `feat: api de provas`.

---

### Task 4: Funções puras de prazo

**Files:**
- Create: `frontend/assets/js/trabalhos-utils.js` (mesmo padrão UMD de `materias-utils.js`)
- Test: `tests/trabalhos-utils.test.js`

**Interfaces:**
- Consumes: `parseDataLocal(iso)` de `dashboard-utils.js` (no Node, via `require`; no navegador, global).
- Produces:
  - `diasAte(iso: string, hoje: Date) -> number`: dias entre a meia-noite local de `hoje` e a data; negativo se passou.
  - `seloPrazo(dias: number, tipo: 'trabalho'|'prova') -> {texto: string, urgente: boolean}`.
  - `separarConcluidos(itens: Array<{concluido: boolean}>) -> {pendentes, concluidos}`, preservando a ordem recebida.

- [ ] **Step 1: Write the failing tests** (com `hoje = new Date(2026, 10, 13, 23, 30)` para pegar erro de fuso):
  - `diasAte('2026-11-13', hoje) === 0`; `'2026-11-14'` → `1`; `'2026-11-12'` → `-1`; `'2026-12-13'` → `30`.
  - `seloPrazo(0, 'prova')` → `{texto: 'Hoje', urgente: true}`; `(1, 'trabalho')` → `'Amanhã'`, urgente; `(7, …)` → `'Faltam 7 dias'`, urgente; `(8, …)` → `'Faltam 8 dias'`, não urgente; `(-1, 'trabalho')` → `'Atrasado há 1 dia'`, urgente; `(-3, 'trabalho')` → `'Atrasado há 3 dias'`; `(-1, 'prova')` → `'Passou há 1 dia'`; `(-3, 'prova')` → `'Passou há 3 dias'`.
  - `separarConcluidos` com `[p1, c1, p2]` → `pendentes [p1, p2]`, `concluidos [c1]`.
- [ ] **Step 2: Run** `node --test tests/trabalhos-utils.test.js` → falha (módulo não existe).
- [ ] **Step 3: Implement** as três funções.
- [ ] **Step 4: Run** `node --test tests/dashboard-utils.test.js tests/materias-utils.test.js tests/trabalhos-utils.test.js` → tudo passa.
- [ ] **Step 5: Commit** `feat: funcoes de prazo de trabalhos e provas`.

---

### Task 5: Extrair componentes compartilhados de Matérias

Refatoração sem mudança de comportamento na página de Matérias.

**Files:**
- Create: `frontend/assets/css/componentes.css`, `frontend/assets/js/ui.js`
- Modify: `frontend/assets/css/materias.css`, `frontend/assets/js/materias.js`, `frontend/pages/materias.html`

**Interfaces:**
- Produces (`ui.js`, funções globais em script clássico, dentro de um IIFE que faz `Object.assign(window, {...})`):
  - `el(tag, attrs = {}, ...filhos) -> Element` e `icone(nome) -> SVGElement`, como hoje. `ICONES` fica em `ui.js` com todos os ícones de `materias.js` mais `desfazer` (seta curva).
  - `toast(msg: string, opcoes = {}) -> void` com `opcoes = {erro?: boolean, acao?: {texto: string, fn: () => void}}`. Com `acao`, o toast mostra um botão que chama `fn` e fecha o toast; duração de 5000 ms com ação, 3500 ms sem. As chamadas `toast(msg, true)` de `materias.js` viram `toast(msg, {erro: true})`.
  - `menu(rotulo: string, item, acoes: Array<{texto, icone, fn(item), perigo?}>) -> Element`: `rotulo` vira `aria-label` "Ações de {rotulo}". Inclui o fechamento por clique fora e Esc.
  - `confirmar({titulo, texto, botao, perigo}) -> Promise<boolean>` (usa `#dlg-confirma`, `#conf-titulo`, `#conf-texto`, `#conf-ok`).
  - `ligarDialogs() -> void`: botões `[data-fechar]` e clique no fundo fecham o `dialog`.
  - `ligarAbas(abas: string[], aoTrocar: (aba) => void) -> void`: clique e setas esquerda/direita em `.aba[data-aba]`.
- `componentes.css`: tudo de `materias.css` que não é específico de matéria (`[hidden]`, `.pagina`, abas, menu, estados, botões, fab, sheet, formulário `.campo`/`.segmentado`/`.form-erro`, toast) + estilo do botão de ação do toast (`.toast__acao`). Ficam em `materias.css`: `.mat-card*`, chips, grupos, `.cursada`, `.cor*`.

- [ ] **Step 1: Implement** a extração; `materias.html` carrega `componentes.css` antes de `materias.css` e `ui.js` antes de `materias.js`.
- [ ] **Step 2: Verify** com o servidor rodando (`iniciar.bat`), em http://localhost:5000/pages/materias.html: lista carrega; abas e setas funcionam; adicionar, editar, finalizar (com confirmação) e excluir funcionam; menu fecha com Esc e clique fora; toast aparece; console sem erros. `.venv\Scripts\python -m pytest backend/tests -q` e os testes `node` continuam passando.
- [ ] **Step 3: Commit** `refactor: componentes compartilhados de interface`.

---

### Task 6: Página Trabalhos e Provas

**Files:**
- Create: `frontend/pages/trabalhos.html`, `frontend/assets/js/trabalhos.js`, `frontend/assets/css/trabalhos.css`
- Modify: `frontend/pages/materias.html` (link "Trabalhos" da navegação → `trabalhos.html`)

**Interfaces:**
- Consumes: `ui.js` (Task 5), `diasAte`, `seloPrazo`, `separarConcluidos` (Task 4), `formatarDataCurta` (`materias-utils.js`), `parseDataLocal` (`dashboard-utils.js`), `apiFetch` (`api.js`), APIs das Tasks 2 e 3, `GET /api/materias` para o formulário.

Comportamento (do spec, seção Interface):
- Topo "Trabalhos e Provas"; abas `Trabalhos (n) | Provas (n)` com n = pendentes; aba ativa lembrada em `#provas`.
- Configuração por aba, para não duplicar código: `{trabalhos: {url: '/api/trabalhos', campoData: 'entrega', tipo: 'trabalho', acao: 'Entregue', secao: 'Entregues', toastFeito: 'Marcado como entregue.', novo: 'Novo trabalho', editar: 'Editar trabalho', rotuloData: 'Data de entrega'}, provas: {url: '/api/provas', campoData: 'data', tipo: 'prova', acao: 'Feita', secao: 'Feitas', toastFeito: 'Marcada como feita.', novo: 'Nova prova', editar: 'Editar prova', rotuloData: 'Data'}}`.
- Card pendente: barra na cor da matéria (`--cor`), descrição, linha "{matéria} · entrega {dd/mm}" (prova: "{matéria} · {dd/mm}"), selo `seloPrazo` (classe `selo--urgente` quando urgente; neutro senão), botão "Entregue"/"Feita" (PATCH `{concluido: true}`, toast com ação "Desfazer" que faz PATCH `{concluido: false}` e recarrega), menu Editar/Excluir.
- Seção de concluídos com `<details>` fechado: `<summary>` "Entregues (n)" / "Feitas (n)"; itens discretos com data, sem selo; menu Desmarcar/Editar/Excluir. Não aparece se n = 0.
- Formulário: `<select>` de matérias com `status === 'cursando'`, por nome; ao editar, se a matéria do item não está na lista, acrescentá-la e selecioná-la. Campos `<input type="date">` e descrição (`maxlength="120"`). Validação no cliente para campos vazios, com as mesmas mensagens da API; erro da API em `#form-erro`.
- "+" sem nenhuma matéria cursando: toast/aviso "Cadastre uma matéria em Matérias antes de adicionar." com link para `materias.html` no estado vazio.
- Excluir pede confirmação (`confirmar`, `perigo: true`): "Excluir trabalho?"/"Excluir prova?" com o texto "\"{descrição}\" será apagado. Não dá para desfazer." (prova: "apagada").
- Estados: carregando, vazio ("Nenhum trabalho cadastrado." / "Nenhuma prova cadastrada." com botão de adicionar), erro com "Tentar de novo".
- Navegação inferior igual à de `materias.html`, com "Trabalhos" ativo (`aria-current="page"`).

- [ ] **Step 1: Implement** os três arquivos e o link na navegação de `materias.html`.
- [ ] **Step 2: Verify** em http://localhost:5000/pages/trabalhos.html com o seed carregado:
  - Trabalhos: "Relatório de laboratório" no topo com "Atrasado há 3 dias" em vermelho; "Lista 3" "Faltam 5 dias" em vermelho; "Projeto final" "Faltam 20 dias" neutro; "Entregues (2)" recolhida.
  - Provas: P2 "Faltam 2 dias" vermelho; "Feitas (1)" com a P1 de Química.
  - Marcar como entregue → vai para "Entregues", toast "Desfazer" volta o item. Editar e excluir funcionam nas duas abas. `#provas` na URL abre a aba Provas.
  - Criar trabalho com descrição `<b>x</b>` → aparece literalmente `<b>x</b>`.
  - Finalizar Física I em Matérias, voltar e editar "Relatório de laboratório" → Física I aparece selecionada; salvar mantém a matéria.
  - Marcar P2 como feita → em Matérias, o card de Cálculo II deixa de mostrar 15/11.
  - Desligar o MariaDB → estado de erro com "Tentar de novo"; religar e tentar de novo recarrega.
  - Navegação: Início ↔ Matérias ↔ Trabalhos funcionam nas três páginas; console sem erros; largura de celular (375px) sem rolagem horizontal.
- [ ] **Step 3: Run** todos os testes: `.venv\Scripts\python -m pytest backend/tests -q` e `node --test tests/dashboard-utils.test.js tests/materias-utils.test.js tests/trabalhos-utils.test.js`.
- [ ] **Step 4: Commit** `feat: pagina de trabalhos e provas`.
