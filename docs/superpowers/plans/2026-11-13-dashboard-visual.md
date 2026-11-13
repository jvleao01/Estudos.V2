# Dashboard Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard mobile-first, tema escuro, com dados de exemplo e gráficos, pronto para trocar os dados pela API depois.

**Architecture:** Scripts clássicos (sem ES modules, para abrir via `file://` ou XAMPP). `data.js` expõe `getDashboardData()`; `dashboard-utils.js` tem funções puras de derivação (testadas com `node --test`); `app.js` renderiza DOM e gráficos.

**Tech Stack:** HTML, CSS, JS puro; Chart.js 4.4.1 via `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js`; Node (só para testes).

**Spec:** `docs/superpowers/specs/2026-11-13-dashboard-visual-design.md`

## Global Constraints
- Tema escuro; cada matéria tem cor fixa (campo `cor`) usada em todos os gráficos/listas.
- Sem emojis em lugar nenhum — apenas ícones SVG inline (traço 2px, estilo Lucide).
- Textos da interface em português.
- Ordem dos cards: cabeçalho → barras por matéria → próximas provas → linha por dia → ranking → rosca.
- Grade de 2 colunas a partir de 900px; 1 coluna abaixo; nada de scroll horizontal em 360px.

## Review Focus
- Nenhuma matéria / todas com 0 min → gráficos e ranking mostram estado vazio ("Nenhum estudo registrado nesta semana"), sem divisão por zero.
- Sem provas futuras → card mostra "Nenhuma prova próxima"; provas passadas são ignoradas.
- Prova hoje → "Hoje", não "em 0 dias"; amanhã → "Amanhã".
- Minutos formatados: 45 → "45min", 90 → "1h 30min", 120 → "2h".
- Empate no ranking → ordem estável (ordem original).

---

### Task 1: Dados e funções de derivação

**Files:**
- Create: `frontend/assetes/js/data.js`, `frontend/assetes/js/dashboard-utils.js`, `tests/dashboard-utils.test.js`

**Interfaces:**
- Produces (globais no browser e `module.exports` no Node):
  - `getDashboardData(): {semana, materias[{id,nome,cor,minutosSemana}], porDia[{dia,minutos}], provas[{materiaId,titulo,data}]}` — 6 matérias de exemplo, 7 dias Seg–Dom, 4 provas (uma ≤3 dias de 2026-11-13).
  - `formatMinutos(min: number): string`
  - `rankMaterias(materias): materia[]` — decrescente por `minutosSemana`, estável.
  - `proximasProvas(provas, materias, hoje: Date, limite=5): [{titulo, data, materia, diasRestantes, urgente}]` — só `diasRestantes >= 0`, ordenado por data, `urgente = diasRestantes <= 3`.
  - `rotuloDias(dias: number): string` — 0 → "Hoje", 1 → "Amanhã", n → "em n dias".
  - `totalMinutos(materias): number`

- [ ] **Step 1: Testes falhando** em `tests/dashboard-utils.test.js` (`node:test` + `node:assert`): casos do Review Focus — `formatMinutos(45)==="45min"`, `(90)==="1h 30min"`, `(120)==="2h"`, `(0)==="0min"`; `rankMaterias` com empate preserva ordem; `proximasProvas` descarta passada, ordena, marca `urgente` em 3 dias e não em 4; `rotuloDias(0|1|5)`; `totalMinutos([])===0`.
- [ ] **Step 2:** `node --test tests/` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `dashboard-utils.js` e `data.js`. Diferença de dias calculada em datas locais à meia-noite (`new Date(y, m-1, d)`), não em UTC.
- [ ] **Step 4:** `node --test tests/` → todos PASS.
- [ ] **Step 5:** Commit `feat: dados de exemplo e derivações do dashboard`.

### Task 2: Layout, tema e navegação

**Files:**
- Modify: `frontend/index.html`, `frontend/assetes/css/style.css`

**Interfaces:**
- Produces: contêineres com ids `#semana-label`, `#chart-materias`, `#lista-provas`, `#chart-dias`, `#lista-ranking`, `#chart-pizza` (canvas para os 3 charts); nav `.bottom-nav` com 6 `<a>` (Dashboard ativo com `aria-current="page"`).
- Tokens CSS em `:root`: `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--accent`, `--danger`, `--radius`.

- [ ] **Step 1:** HTML semântico (`<main>`, cards `<section class="card">` com `<h2>`), meta viewport, `theme-color`, scripts na ordem: Chart.js, `data.js`, `dashboard-utils.js`, `app.js`. Ícones SVG inline na nav: casa, livro, clipboard, chapéu de formatura, relógio, calendário.
- [ ] **Step 2:** CSS mobile-first; nav fixa com `padding-bottom: env(safe-area-inset-bottom)`; `main` com padding inferior para não ficar sob a nav; grade 2 colunas ≥900px (barras e linha ocupam largura cheia).
- [ ] **Step 3:** Abrir `frontend/index.html` no navegador em 360px e 1280px → cards na ordem certa, sem scroll horizontal, nav visível.
- [ ] **Step 4:** Commit `feat: layout e tema escuro do dashboard`.

### Task 3: Renderização e gráficos

**Files:**
- Modify: `frontend/assetes/js/app.js`

**Interfaces:**
- Consumes: tudo da Task 1, ids da Task 2.
- Produces: `renderDashboard(data)` chamado em `DOMContentLoaded` com `getDashboardData()`.

- [ ] **Step 1:** Barras (vertical, uma por matéria, `backgroundColor` = `cor`, tooltip com `formatMinutos`); linha por dia (cor `--accent`, área preenchida suave); rosca com cores das matérias e legenda; Chart.js com cor de texto/grade lidas dos tokens CSS.
- [ ] **Step 2:** Lista de provas (bolinha na cor da matéria, título, data `dd/mm`, `rotuloDias`, classe `.urgente`); ranking com posição, barra proporcional ao 1º, horas.
- [ ] **Step 3:** Estados vazios do Review Focus: testar trocando temporariamente `getDashboardData` para retornar listas vazias → mensagens aparecem, sem erros no console.
- [ ] **Step 4:** Verificar no navegador (360px e desktop): 3 gráficos renderizam, cores consistentes entre barras/rosca/ranking/provas, console limpo.
- [ ] **Step 5:** Commit `feat: gráficos e listas do dashboard`.
