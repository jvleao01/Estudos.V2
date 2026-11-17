# Calendário Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página Calendário com aulas recorrentes por semestre, provas, entregas e feriados, com aulas desmarcáveis por dia.

**Architecture:** Tabelas `semestres`, `aulas_semana` e `aulas_desmarcadas` guardam a regra e as exceções; um blueprint `rotas/calendario.py` entrega dados crus do mês e grava a folha "Aulas da semana"; `calendario-utils.js` (puro, `node --test`) calcula feriados, a grade e os dias de aula.

**Tech Stack:** Python 3.14, Flask 3, PyMySQL, pytest; MariaDB 10.4 (XAMPP, porta 8000); JS puro em scripts clássicos com export para Node; `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-calendario-design.md`

## Global Constraints

- **Nunca** rodar `seed.sql` no banco real `estudos`. Testes usam `estudos_test`. `bd.sql` pode rodar no real (só cria).
- `dia_semana`: 1 = segunda … 6 = sábado (numeração de `Date.getDay()`); domingo (0) não é aceito.
- Datas sempre em ISO `AAAA-MM-DD`; no navegador, data local (`parseDataLocal` de `dashboard-utils.js`), nunca `new Date('AAAA-MM-DD')`.
- Mensagens de erro da API em português, formato `{erro}`; textos exatos do spec.
- Interface: tema escuro, ícones SVG, componentes de `ui.js`/`componentes.css`.
- Comandos: `.venv\Scripts\python -m pytest backend/tests -q`; `node --test tests/*.test.js`.
- Scripts que editam arquivos calculam o conteúdo novo **antes** de abrir o arquivo para escrita.

## Review Focus

1. **Matéria de outro semestre no PUT** (ex.: matéria 2026.1 enviada para 2026.2) → 400 "Matéria não pertence a esse semestre.", nada gravado (transação). Teste na Task 2.
2. **Semestre que começa ou termina no meio do mês**: aula no próprio dia de início e de fim aparece; um dia antes/depois não. Teste na Task 4.
3. **Feriado em dia de aula** (ex.: 20/11/2026, sexta): sem aula na lista do dia, mas prova marcada nesse dia continua aparecendo. Teste na Task 4.
4. **Excluir matéria** apaga seus dias de aula e desmarcações (cascade) e o mês continua carregando. Teste na Task 3.
5. **Virada de ano no navegador**: `‹` em janeiro vai para dezembro do ano anterior e feriados são calculados para o ano do mês exibido. Teste na Task 4 (`mesVizinho`).

---

### Task 1: Banco

**Files:** Modify `backend/sql/bd.sql`, `backend/sql/seed.sql`, `backend/tests/conftest.py`; Test `backend/tests/test_banco.py`

**Interfaces:** Produces tabelas `semestres(semestre CHAR(6) PK, inicio DATE NOT NULL, fim DATE NOT NULL)`, `aulas_semana(materia_id, dia_semana TINYINT, PK(materia_id, dia_semana), FK ON DELETE CASCADE)`, `aulas_desmarcadas(materia_id, data DATE, PK(materia_id, data), FK ON DELETE CASCADE)`.

- [ ] Step 1: testes em `test_banco.py`: `test_tabelas_do_calendario_existem` (insere semestre, um dia de aula e uma desmarcada; lê de volta); `test_cascade_apaga_aulas_da_materia` (apaga a matéria → `aulas_semana` e `aulas_desmarcadas` vazias).
- [ ] Step 2: rodar pytest em `test_banco.py` → falham (tabela inexistente).
- [ ] Step 3: `CREATE TABLE IF NOT EXISTS` das 3 tabelas em `bd.sql`; adicionar as 3 ao `TABELAS` de `conftest.py` (antes de `materias`). `seed.sql`: `TRUNCATE` das novas, semestre `('2026.2', '2026-08-03', '2026-12-12')`, dias (Cálculo II seg+qua, Física I ter+sex, POO qui, Química Geral seg) e uma aula desmarcada de Física I numa terça de novembro de 2026.
- [ ] Step 4: suite pytest passa. Rodar **só** `bd.sql` no banco real (`c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 < backend\sql\bd.sql`) e conferir `SHOW TABLES`.
- [ ] Step 5: commit `feat(banco): tabelas do calendario`.

### Task 2: Semestres (`GET`/`PUT /api/semestres/<semestre>`)

**Files:** Create `backend/rotas/calendario.py`; Modify `backend/app.py`; Test `backend/tests/test_calendario.py`

**Interfaces:**
- Consumes: `validar_data`, `ErroValidacao`, `erro` de `validacao.py`.
- Produces: blueprint `bp` em `rotas/calendario.py` com prefixo `/api` (registrado em `app.py`); `RE_SEMESTRE` reutilizado de `rotas/materias.py`; resposta `{semestre, inicio, fim, materias: [{id, nome, cor, status, dias}]}`.

- [ ] Step 1: testes (helpers `materia(client, nome, semestre="2026.2")` com mínimo/total):
  - `test_semestre_sem_datas`: `GET /api/semestres/2026.2` → 200 `{semestre: "2026.2", inicio: None, fim: None, materias: [...]}` com `dias: []`.
  - `test_semestre_invalido` → `GET /api/semestres/2026.3` → 400 "Semestre inválido. Use o formato 2026.1 ou 2026.2.".
  - `test_put_grava_datas_e_dias`: `PUT {inicio: "2026-08-03", fim: "2026-12-12", aulas: {str(mid): [3, 1]}}` → 200, `dias == [1, 3]` (ordenado); o `GET` devolve o mesmo.
  - `test_put_substitui_dias_so_das_enviadas`: duas matérias com dias; `PUT` só com a primeira `[]` → primeira `[]`, segunda intacta.
  - `test_put_atualiza_datas_existentes` (segundo `PUT` muda o fim).
  - `test_validacoes_put` (parametrizado): fim ≤ início → "O início deve ser antes do fim."; 201 dias → "O semestre pode ter no máximo 200 dias."; dia `0`, `7`, `"1"`, `True` ou repetido → "Dia da semana inválido."; `aulas` não-objeto → "Envie as aulas por matéria."; data inválida → "Data inválida. Use o formato AAAA-MM-DD.".
  - `test_put_materia_de_outro_semestre`: matéria 2026.1 no `PUT` de 2026.2 → 400 "Matéria não pertence a esse semestre."; datas **não** gravadas (o `GET` continua com `inicio is None`).
  - `test_put_materia_inexistente` → 400 "Matéria não pertence a esse semestre.".
- [ ] Step 2: pytest → falham (404).
- [ ] Step 3: implementar. `PUT` valida tudo antes de escrever; grava com `INSERT ... ON DUPLICATE KEY UPDATE` em `semestres`, `DELETE` + `INSERT` em `aulas_semana` por matéria enviada. A conexão de `get_conexao()` — conferir em `conexao.py` se é autocommit; se for, envolver as escritas em `con.begin()`/`commit`/`rollback`.
- [ ] Step 4: suite passa. Commit `feat(api): semestres e dias de aula`.

### Task 3: Desmarcar aulas e dados do mês

**Files:** Modify `backend/rotas/calendario.py`; Test `backend/tests/test_calendario.py`

**Interfaces:**
- Produces:
  - `POST /api/aulas/desmarcadas` `{materiaId, data}` → 201 `{materiaId, data}` (idempotente com `INSERT IGNORE`); matéria inexistente/`materiaId` inválido → 400 "Matéria não encontrada.".
  - `DELETE /api/aulas/desmarcadas/<int:mid>/<data>` → 204; inexistente → 404 "Aula desmarcada não encontrada."; data inválida → 400.
  - `GET /api/calendario?mes=AAAA-MM` → `{semestres: [{semestre, inicio, fim}], aulas: [{materiaId, nome, cor, semestre, dias}], desmarcadas: [{materiaId, data}], provas: [{id, materiaId, materia: {nome, cor}, titulo, data, concluido, simulado}], trabalhos: [{id, materiaId, materia: {nome, cor}, titulo, data, concluido}]}`.

- [ ] Step 1: testes:
  - `test_desmarcar_e_remarcar`: `POST` → 201; `POST` de novo → 201; `DELETE` → 204; `DELETE` de novo → 404 com a mensagem.
  - `test_desmarcar_materia_inexistente` → 400.
  - `test_mes_invalido` (`mes` ausente, `2026-13`, `2026-1`) → 400 "Mês inválido. Use o formato AAAA-MM.".
  - `test_calendario_do_mes`: semestre 2026.2 (03/08–12/12), Cálculo com `[1, 3]`, Física sem dias; prova em 18/11 e outra em 05/12; trabalho em 30/11; desmarcada em 16/11 e outra em 07/12. `GET ?mes=2026-11` → `semestres` com 2026.2; `aulas` só Cálculo (`dias [1, 3]`); `desmarcadas == [{materiaId, data: "2026-11-16"}]`; uma prova (18/11, `simulado False`), um trabalho com `data == "2026-11-30"`.
  - `test_calendario_mes_fora_do_semestre`: `?mes=2027-03` → `semestres == []`, `aulas == []`.
  - `test_excluir_materia_limpa_aulas`: matéria com dias e desmarcada; `DELETE /api/materias/<id>` → `GET ?mes=2026-11` → 200 com `aulas == []` e `desmarcadas == []`.
- [ ] Step 2: pytest → falham.
- [ ] Step 3: implementar (intervalo do mês: primeiro dia até primeiro dia do mês seguinte; semestres com `inicio < fim_do_mes AND fim >= inicio_do_mes`).
- [ ] Step 4: suite passa. Commit `feat(api): calendario do mes e aulas desmarcadas`.

### Task 4: `calendario-utils.js`

**Files:** Create `frontend/assets/js/calendario-utils.js`; Test `tests/calendario-utils.test.js`

**Interfaces:**
- Consumes: `parseDataLocal(iso)` de `dashboard-utils.js` (via `require` no Node, global no navegador, como `trabalhos-utils.js`).
- Produces:
  - `pascoa(ano) -> 'AAAA-MM-DD'` (Meeus/Jones/Butcher).
  - `feriados(ano) -> Map<string, string>` (data ISO → nome), lista exata do spec.
  - `gradeDoMes(ano, mes) -> (string|null)[][]` — `mes` 1–12; semanas dom→sáb; `null` fora do mês.
  - `diasDoMes(ano, mes, dados) -> Map<string, {feriado: string|null, aulas: [{materiaId, nome, cor, desmarcada}], provas: [...], trabalhos: [...]}>` — `dados` é a resposta de `/api/calendario`; regras do spec.
  - `mesVizinho('AAAA-MM', delta: -1|1) -> 'AAAA-MM'`.
  - `rotuloMes('AAAA-MM') -> 'Novembro 2026'`; `rotuloDia(iso) -> 'Quarta, 18/11'`.

- [ ] Step 1: testes:
  - `pascoa`: 2024 → `'2024-03-31'`, 2025 → `'2025-04-20'`, 2026 → `'2026-04-05'`, 2027 → `'2027-03-28'`.
  - `feriados(2026)`: `'2026-02-16'` e `'2026-02-17'` → `'Carnaval'`; `'2026-04-03'` → `'Sexta-feira Santa'`; `'2026-06-04'` → `'Corpus Christi'`; `'2026-11-20'` → `'Consciência Negra'`; `'2026-08-15'` → `'Assunção de Nossa Senhora'`; `'2026-12-08'` → `'Imaculada Conceição'`; total 15 entradas.
  - `gradeDoMes(2026, 11)`: primeira semana começa em `'2026-11-01'` (domingo, sem `null` à esquerda); `gradeDoMes(2026, 8)` (01/08 é sábado): primeira semana `[null ×6, '2026-08-01']`; `gradeDoMes(2028, 2)` contém `'2028-02-29'`; toda semana tem 7 posições.
  - `diasDoMes` com semestre `2026-11-04`–`2026-11-25` e Cálculo `[3]` (quartas) em novembro/2026: aulas em 04, 11, 18 e 25; nada em 03 ou 26 nem fora do intervalo; com Física `[5]` (sexta) não há aula em 20/11 (feriado) e `feriado == 'Consciência Negra'`; prova em 20/11 aparece; desmarcada em 11/11 → aula com `desmarcada: true`.
  - `mesVizinho('2026-01', -1) == '2025-12'`, `mesVizinho('2026-12', 1) == '2027-01'`.
  - `rotuloMes('2026-11') == 'Novembro 2026'`; `rotuloDia('2026-11-18') == 'Quarta, 18/11'`.
- [ ] Step 2: `node --test tests/*.test.js` → falha.
- [ ] Step 3: implementar; datas montadas com `new Date(ano, mes - 1, dia)` e formatadas manualmente em ISO (sem `toISOString`).
- [ ] Step 4: testes passam. Commit `feat: calculos do calendario`.

### Task 5: Página Calendário e menu

**Files:** Create `frontend/pages/calendario.html`, `frontend/assets/js/calendario.js`, `frontend/assets/css/calendario.css`; Modify menus em `index.html` e `frontend/pages/{materias,trabalhos,notas,cronometro}.html`, `frontend/assets/css/style.css`

**Interfaces:**
- Consumes: rotas das Tasks 2–3; funções da Task 4; `semestreAtual` de `materias-utils.js`; `el`, `icone`, `toast`, `ligarDialogs` de `ui.js`; `apiFetch`; `animarEntrada`.

- [ ] Step 1: **Menu** — item "Calendário" depois de "Notas" (`calendario.html`; em `index.html`, `frontend/pages/calendario.html`), ícone `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`; `repeat(6, 1fr)` → `repeat(7, 1fr)`; em `@media (max-width: 400px)` o rótulo do menu cai para `9px` se o texto "Calendário"/"Cronômetro" for cortado (conferir larguras: 360 / 7 ≈ 51px).
- [ ] Step 2: **HTML** — topo (sub "Agenda", título "Calendário", botão "Aulas da semana"); barra `‹ Mês Ano ›` + "Hoje"; `#aviso-semestre`; `#grade` (cabeçalho dom … sáb); `#dia` (lista do dia); `<dialog id="dlg-aulas" class="sheet">` com `inicio`/`fim` (`type="date"`), `#tabela-aulas`, erro, Cancelar/Salvar; toast; scripts `dashboard-utils.js`, `materias-utils.js`, `calendario-utils.js`, `api.js`, AOS, `animacoes.js`, `ui.js`, `calendario.js`, `universidade.js`.
- [ ] Step 3: **Estado e carga** — `estado = {mes: 'AAAA-MM', dados, dias, selecionado}`; mês inicial do `location.hash` (`#AAAA-MM` válido) ou do mês atual; `carregar()` busca `/api/calendario?mes=`; troca de mês atualiza o hash com `history.replaceState`; dia selecionado = hoje se no mês, senão o dia 1.
- [ ] Step 4: **Grade** — cada dia é `<button>` com número, marcadores (aula = bolinha na cor da matéria, só aulas não desmarcadas; prova = triângulo; entrega = quadrado; até 3 e "+N"), classes `hoje`, `selecionado`, `feriado`; `aria-label` como "Quarta, 18 de novembro: 1 aula, 1 prova" (ou "… feriado, Consciência Negra"); setas ← → movem a seleção.
- [ ] Step 5: **Lista do dia** — `rotuloDia`; feriado; aulas com "Desmarcar" (`POST`) ou, desmarcada, "Sem aula" riscado + "Remarcar" (`DELETE`); toast "Aula desmarcada." com "Desfazer" / "Aula remarcada."; provas ("Prova"/"Simulado" + matéria) e entregas ("Entrega" + matéria), concluídas com classe `feito`; vazio "Nada neste dia.".
- [ ] Step 6: **Aviso e folha** — semestre do mês exibido = `semestreAtual(new Date(ano, mes - 1, 15))`; aviso se esse semestre não está em `dados.semestres`. Folha: `GET /api/semestres/<s>`, preenche datas e grade de checkboxes (seg–sáb, `aria-label` "Cálculo II, segunda"); sem matérias, aviso com link para `materias.html`; Salvar valida no cliente (datas preenchidas e início < fim) e envia `PUT`; trava a folha durante o envio (`data-travado`); toast "Aulas salvas.", fecha e recarrega.
- [ ] Step 7: **Verificar** — com o servidor (test client do Flask no banco real, **somente leitura**): `/frontend/pages/calendario.html` e todos os links/scripts das 7 rotas dão 200; `node --check` nos JS; suites passam. Dar ao usuário o roteiro para conferir no navegador.
- [ ] Step 8: commit `feat: pagina de calendario`.
