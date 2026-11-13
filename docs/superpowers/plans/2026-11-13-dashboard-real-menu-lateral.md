# Dashboard real + menu lateral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard com dados reais via `/api/dashboard`, Calendário fora da navegação e menu lateral recolhido com vidro no computador.

**Architecture:** Blueprint `rotas/dashboard.py` devolvendo o contrato existente de `getDashboardData()`; `data.js` passa a buscar da API. Menu lateral só com CSS (media query ≥ 900px) sobre a `nav.bottom-nav` de cada página.

**Tech Stack:** Flask, PyMySQL, pytest; JS puro + Chart.js 4.4.1 (CDN); `node --test`; e2e com puppeteer-core (fora do repo).

**Spec:** `docs/superpowers/specs/2026-11-13-dashboard-real-menu-lateral-design.md`

## Global Constraints
- Mensagens em português; erros `{"erro": "..."}`; sem emojis; texto do usuário via `textContent`.
- Semana = segunda a domingo, a partir da data local do navegador.
- Vidro (`backdrop-filter`) só no menu lateral do computador.
- Commits `tipo: descrição` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
- Semana sem sessões → cards de tempo vazios, sem erro de gráfico. Task 2.
- Prova de matéria sem tempo na semana → aparece com nome e cor certos. Tasks 1 e 2.
- Sessão no domingo 23:59 conta na semana; na segunda seguinte 00:01 não. Task 1.
- API fora → cards mostram a mensagem, a página não quebra. Task 2.
- Menu aberto por hover não empurra o conteúdo nem cria rolagem horizontal; 899px continua barra de baixo. Task 3.

---

### Task 1: API do Dashboard
**Files:** Create `backend/rotas/dashboard.py`, `backend/tests/test_dashboard.py`; Modify `backend/app.py`.
**Interfaces:** Produces `GET /api/dashboard?inicio=AAAA-MM-DD` → contrato do spec.
- [ ] **Step 1: failing tests:** `test_semana_vazia` (materias `[]`, porDia 7 itens Seg..Dom com 0, provas `[]`, semana {inicio, fim=inicio+6}); `test_minutos_por_materia_e_dia` (sessões seg 30 + qua 20 em A, dom 23:59 10 em B, segunda seguinte 00:01 99 em B e domingo anterior 50 em A → A=50, B=10; porDia Seg 30, Qua 20, Dom 10); `test_materia_sem_tempo_fica_fora`; `test_provas_pendentes_com_materia` (feita fora; anterior a `inicio` fora; matéria sem tempo vem com `materia.nome/cor`; ordem por data); `test_inicio_invalido` ("" e "13/11/2026" → 400 mensagem de data).
- [ ] **Step 2:** rodar → falha (404).
- [ ] **Step 3:** implementar e registrar.
- [ ] **Step 4:** `pytest backend/tests -q` → tudo passa.
- [ ] **Step 5:** commit `feat: api do dashboard`.

### Task 2: Dashboard usando a API
**Files:** Modify `frontend/assets/js/data.js`, `dashboard-utils.js`, `app.js`, `frontend/index.html`; `tests/dashboard-utils.test.js`.
**Interfaces:** `getDashboardData(hoje = new Date()) -> Promise<contrato>`; `segundaFeira(hoje: Date) -> 'AAAA-MM-DD'` (exportada de `data.js`); `proximasProvas` usa `p.materia` quando `materiaId` não está em `materias`.
- [ ] **Step 1: failing tests (node):** `segundaFeira` para quinta 2026-11-13 → `2026-11-09`, domingo 2026-11-15 23:30 → `2026-11-09`, segunda 2026-11-16 00:10 → `2026-11-16`; `proximasProvas` com prova cuja matéria não está na lista mas tem `materia: {nome, cor}` → `materia.nome` certo. Remover o teste do contrato de exemplo.
- [ ] **Step 2: failing e2e** (`dashboard.e2e.js`, banco e2e com sessões inseridas na semana atual): total na semana certo; ranking com as matérias e tempos esperados; próximas provas com P2 primeiro; semana sem sessões → "Nenhum estudo registrado nesta semana" nos cards de tempo; servidor sem banco → mensagem de erro nos cards; console sem erros.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** node + e2e passam.
- [ ] **Step 5:** commit `feat: dashboard com dados reais`.

### Task 3: Calendário fora e menu lateral
**Files:** Modify `frontend/index.html`, `frontend/pages/*.html` (nav), `frontend/assets/css/style.css`.
- [ ] **Step 1: failing e2e** (`menu.e2e.js`): nas 4 páginas, sem "Calendário" e 4 itens; 375px: nav embaixo (top > 700), sem `backdrop-filter` novo além do atual; 1280px: nav à esquerda (left 0, largura ≤ 80, altura = janela), textos ocultos; hover → largura ≥ 200 e textos visíveis, `backdrop-filter` contém `blur`, conteúdo `main` não se move; foco por Tab no primeiro link também abre; item ativo destacado; sem rolagem horizontal em 899 e 1280.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** todos os e2e (dashboard, menu, cronometro, fixes-crono, materias, trabalhos, fixes) + pytest + node passam; capturas em 1280 recolhido/aberto.
- [ ] **Step 5:** commit `feat: menu lateral no computador e remove calendario`.
