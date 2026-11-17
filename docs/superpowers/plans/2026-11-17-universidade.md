# Universidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Item "Faculdade" no menu que abre o portal no computador e a App Store do Minha Wyden no celular.

**Architecture:** Link estático no menu + `universidade.js` que troca o `href` em celular/tablet; detecção em função pura testada.

**Tech Stack:** HTML, JS puro (script clássico com export para Node), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-universidade-design.md`

## Global Constraints
- URLs exatas: portal `https://portal.siaaluno.com.br/sianet/Logon`; app `https://apps.apple.com/br/app/integrees/id1541892299`.
- Rótulo "Faculdade"; abre em aba nova com `rel="noopener"`.
- Comandos: `node --test tests/*.test.js`; `.venv\Scripts\python -m pytest backend/tests -q`.

## Review Focus
1. iPad com iPadOS 13+ se apresenta como "Macintosh": deve ser móvel quando `maxTouchPoints > 1` (Mac comum tem 0).
2. Página sem JavaScript: o link ainda vai para o portal.

---

### Task 1: Detecção e script

**Files:** Create `frontend/assets/js/universidade.js`; Test `tests/universidade.test.js`

**Interfaces:** Produces `ehMovel(userAgent: string, maxTouchPoints: number) -> boolean`, `URL_PORTAL`, `URL_APP`.

- [ ] Step 1: testes — iPhone → true; iPad antigo ("iPad") → true; "Macintosh" com 5 toques → true; "Macintosh" com 0 → false; Android → true; Windows → false.
- [ ] Step 2: `node --test tests/*.test.js` → falha (módulo não existe).
- [ ] Step 3: implementar; no navegador, `document.querySelectorAll('a[data-faculdade]')` recebe `URL_APP` se `ehMovel(navigator.userAgent, navigator.maxTouchPoints || 0)`.
- [ ] Step 4: testes passam. Commit `feat: deteccao de celular para o atalho da faculdade`.

### Task 2: Menu

**Files:** Modify `index.html`, `frontend/pages/{materias,trabalhos,notas,cronometro}.html`, `frontend/assets/css/style.css`

- [ ] Step 1: item depois de Cronômetro: `<a href="URL_PORTAL" class="bottom-nav__item" target="_blank" rel="noopener" data-faculdade>` com ícone de link externo (`<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>`) e `<span>Faculdade</span>`; `<script src=".../universidade.js">` em cada página.
- [ ] Step 2: `repeat(5, 1fr)` → `repeat(6, 1fr)`.
- [ ] Step 3: conferir pelo servidor que todos os links locais das 6 rotas dão 200 e que cada página tem um `data-faculdade` e carrega `universidade.js`; suites passam. Commit `feat: atalho da faculdade no menu`.
