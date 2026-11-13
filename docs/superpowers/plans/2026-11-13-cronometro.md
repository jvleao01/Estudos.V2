# Cronômetro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `pages/cronometro.html` que cronometra uma sessão de estudo por matéria (pausar, finalizar com resumo, salvar, cancelar) e grava em `/api/sessoes`; "Notas" sai da navegação.

**Architecture:** Cronômetro em memória no navegador, medido por `Date.now()`; ao salvar, `POST /api/sessoes` (blueprint novo no padrão de `rotas/trabalhos.py`, validação em `rotas/validacao.py`). Cálculos de tempo em funções puras testadas com `node --test`. Interface com `ui.js`/`componentes.css`.

**Tech Stack:** Python 3.14, Flask 3, PyMySQL, pytest; MariaDB 10.4 (XAMPP, porta 8000); JS puro em scripts clássicos; `node --test`; verificação no navegador com puppeteer-core + Chrome headless (scripts fora do repo).

**Spec:** `docs/superpowers/specs/2026-11-13-cronometro-design.md`

## Global Constraints
- Interface e mensagens de erro em português; erros da API em `{"erro": "..."}`; sem emojis; ícones SVG; tokens de `style.css`.
- Texto do usuário só via `textContent` (`el()`).
- Arredondamento ao minuto mais próximo; exibição com `formatMinutos` (`1h 30min`, `56min`).
- `minutos` de 1 a 1440; `inicio` no formato `AAAA-MM-DDTHH:MM:SS` (hora local).
- Nada é gravado sem o usuário tocar em Salvar; fechar a página perde a sessão.
- Testes de API no banco `estudos_test`; testes existentes continuam passando.
- Commits `tipo: descrição` terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
- Aba em segundo plano por minutos → ao voltar, o relógio mostra o tempo real (não atrasado). Coberto na Task 3 (relógio controlável no e2e).
- Pausar e retomar várias vezes → tempo final = soma dos trechos rodando, sem contar as pausas. Coberto na Task 2.
- Erro da API ao salvar (banco fora) → painel continua aberto e o tempo não se perde. Coberto na Task 3.
- 29s → Salvar desativado com "Sessão muito curta para salvar."; 30s → 1min salvável. Coberto nas Tasks 2 e 3.
- Sessão às 23h59 do dia → resumo "Hoje" do dia de início a inclui. Coberto na Task 1 (inicio no fim do dia).

---

### Task 1: API de sessões

**Files:**
- Create: `backend/rotas/sessoes.py`, `backend/tests/test_sessoes.py`
- Modify: `backend/app.py`, `backend/rotas/validacao.py` (se precisar de helper de data e hora)

**Interfaces:**
- Consumes: `ErroValidacao`, `erro`, `materia_existe` e o validador de data de `rotas/validacao.py`.
- Produces: `POST /api/sessoes` `{materiaId, inicio, minutos}` → 201 `{id, materiaId, inicio, minutos}` (`inicio` como `AAAA-MM-DDTHH:MM:SS`); `GET /api/sessoes/resumo?data=AAAA-MM-DD` → `{data, minutos}`.

- [ ] **Step 1: Write the failing tests** em `test_sessoes.py`:
  - `test_salvar_sessao`: POST `{materiaId, inicio: "2026-11-13T14:05:00", minutos: 56}` → 201, corpo igual com `id > 0`.
  - `test_sessao_soma_nas_materias`: depois de salvar 56 e 34, `GET /api/materias` dá `minutosTotais == 90`.
  - `test_resumo_do_dia`: sessões em `2026-11-13T08:00:00` (30), `2026-11-13T23:59:00` (20) e `2026-11-14T00:01:00` (10) → resumo de `2026-11-13` = 50; de `2026-11-14` = 10; de `2026-11-15` = 0.
  - `test_validacao` parametrizado (400 + mensagem exata): `minutos` 0, 1441, `"5"`, `5.5`, `True`, ausente → "Os minutos devem ser um número inteiro entre 1 e 1440."; `inicio` `"2026-11-13 14:05"`, `"2026-13-01T10:00:00"`, ausente → "Início inválido. Use o formato AAAA-MM-DDTHH:MM:SS."; `materiaId` `"1"` → "Matéria inválida."; 9999 → "Matéria não encontrada."; corpo não-JSON → "Envie os dados em JSON.".
  - `test_resumo_data_invalida`: sem `data` e com `data=13/11/2026` → 400 "Data inválida. Use o formato AAAA-MM-DD.".
- [ ] **Step 2: Run** `.venv\Scripts\python -m pytest backend/tests/test_sessoes.py -q` → falham (rota inexistente).
- [ ] **Step 3: Implement** `sessoes.py` (resumo com `SUM(minutos)` e `WHERE DATE(inicio) = %s`; `inicio` validado com regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$` + `datetime.fromisoformat`) e o registro em `app.py`.
- [ ] **Step 4: Run** `.venv\Scripts\python -m pytest backend/tests -q` → tudo passa.
- [ ] **Step 5: Commit** `feat: api de sessoes de estudo`.

---

### Task 2: Funções puras do cronômetro

**Files:**
- Create: `frontend/assets/js/cronometro-utils.js`, `tests/cronometro-utils.test.js`

**Interfaces:**
- Produces:
  - `decorridoMs({acumuladoMs, inicioTrecho}, agora: number) -> number` (`inicioTrecho` em ms ou `null` se pausado).
  - `arredondarMinutos(ms) -> number` (minuto mais próximo).
  - `formatarRelogio(ms) -> 'HH:MM:SS'` (horas com 2+ dígitos).
  - `dataHoraLocalISO(date) -> 'AAAA-MM-DDTHH:MM:SS'`, `dataLocalISO(date) -> 'AAAA-MM-DD'`.

- [ ] **Step 1: Write the failing tests:**
  - `decorridoMs({acumuladoMs: 0, inicioTrecho: 1000}, 61000) === 60000`; pausado `{acumuladoMs: 5000, inicioTrecho: null}` → `5000` para qualquer `agora`; `{acumuladoMs: 5000, inicioTrecho: 10000}, 12000` → `7000`.
  - `arredondarMinutos`: 29s → 0; 30s → 1; 55min54s → 56; 90min → 90; 0 → 0.
  - `formatarRelogio`: 0 → `00:00:00`; 3354000 → `00:55:54`; 5400000 → `01:30:00`; 999ms → `00:00:00`; 100h → `100:00:00`.
  - `dataHoraLocalISO(new Date(2026, 0, 5, 7, 3, 9)) === '2026-01-05T07:03:09'`; `dataLocalISO(new Date(2026, 10, 13, 23, 59)) === '2026-11-13'`.
- [ ] **Step 2: Run** `node --test tests/cronometro-utils.test.js` → falha (módulo não existe).
- [ ] **Step 3: Implement** no padrão UMD de `trabalhos-utils.js`.
- [ ] **Step 4: Run** todos os testes `node --test tests/*.test.js` (listando os arquivos) → passam.
- [ ] **Step 5: Commit** `feat: funcoes de tempo do cronometro`.

---

### Task 3: Página do cronômetro e navegação sem Notas

**Files:**
- Create: `frontend/pages/cronometro.html`, `frontend/assets/js/cronometro.js`, `frontend/assets/css/cronometro.css`
- Modify: `frontend/index.html`, `frontend/pages/materias.html`, `frontend/pages/trabalhos.html` (navegação)
- Test: script e2e fora do repo (`scratchpad/e2e/cronometro.e2e.js`), banco `estudos_e2e` + servidores nas portas 5050 (banco) e 5051 (`DB_PORT=1`).

**Interfaces:**
- Consumes: funções da Task 2, `formatMinutos`, `ui.js`, `apiFetch`, APIs da Task 1 e `GET /api/materias?status=cursando`.
- IDs que o e2e usa: `#materia` (select), `#relogio`, `#btn-iniciar`, `#btn-pausar` (texto Pausar/Retomar), `#btn-finalizar`, `#btn-cancelar`, `#hoje`, painel `#dlg-resumo` com `#resumo-tempo`, `#resumo-aviso`, `#btn-salvar`, `#btn-continuar`, `#btn-descartar`; confirmação `#dlg-confirma`.

- [ ] **Step 1: Write the failing e2e** (relógio da página controlável por `window.__avancar(ms)`, como em `fixes.e2e.js`), viewport 375px:
  - Página carrega; nav sem "Notas"; "Cronômetro" ativo; select só com matérias cursando; `#hoje` mostra o total do dia.
  - Iniciar desativado até escolher matéria → Iniciar → avançar 10 min → `#relogio` `00:10:00`; select desativado.
  - Pausar → avançar 5 min → continua `00:10:00`; Retomar → avançar 45min54s → `00:55:54`.
  - Segundo plano: avançar 2 min e disparar `visibilitychange` → `00:57:54`.
  - Finalizar → painel com `#resumo-tempo` `58min`; Continuar fecha e fica pausado; Finalizar de novo → Salvar → toast "58min salvos em {matéria}."; relógio `00:00:00`; `#hoje` aumentou 58 min; `GET /api/materias` com `minutosTotais` + 58.
  - Sessão de 29s → Finalizar → Salvar desativado e "Sessão muito curta para salvar."; Descartar → confirmação → zerado.
  - Iniciar → Cancelar → confirmação Cancelar fecha sem descartar (tempo continua); Cancelar → confirmar → zerado e nada salvo.
  - 90 min → resumo `1h 30min`.
  - Com sessão em andamento, `beforeunload` é tratado (o evento fica com `defaultPrevented`); parado, não é.
  - Erro ao salvar: na porta 5050 parar... (usar 5051: carregamento mostra erro com "Tentar de novo"). Para o erro no salvar, interceptar o `POST /api/sessoes` com puppeteer (`page.setRequestInterception`) respondendo 503 → toast de erro e painel continua aberto com o mesmo tempo.
  - Sem matérias cursando → estado vazio com link para `materias.html`, Iniciar desativado.
  - `index.html`, `materias.html` e `trabalhos.html` sem "Notas" e com link para o cronômetro; sem rolagem horizontal; console sem erros.
- [ ] **Step 2: Run** o e2e → falha (página não existe).
- [ ] **Step 3: Implement** a página conforme o spec (seção Interface) e a navegação.
- [ ] **Step 4: Run** o e2e e os e2e anteriores (materias, trabalhos, fixes) → passam; pytest e node → passam.
- [ ] **Step 5: Commit** `feat: pagina do cronometro` (e `chore: remove notas da navegacao` se separado).
