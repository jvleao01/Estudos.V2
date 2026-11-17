# Menu no celular (design curto)

## Intenção
Com 7 páginas, a barra inferior ficou apertada no celular. No celular (< 900px) o menu passa a ficar escondido atrás de um botão ☰ no canto superior esquerdo; ao tocar, desliza da esquerda e fecha ao escolher uma página ou quando o usuário quiser.

## Objetivos
- Botão ☰ fixo no topo esquerdo em todas as páginas (só no celular).
- Menu lateral deslizante (da esquerda) com os 7 itens e rótulos completos.
- Fecha ao: escolher um item, tocar no ✕, tocar no fundo escuro, apertar Esc, ou o foco sair do menu.
- Barra inferior some; `--nav-h` vira 0 em todas as larguras (botão "+" e toast descem).
- Acessível: `aria-expanded`/`aria-controls` no ☰; foco vai para o menu ao abrir e volta ao ☰ ao fechar; menu fechado fica fora da ordem de foco (`visibility: hidden`).

## Não-objetivos
- Mudar o menu lateral do computador (≥ 900px).
- Gestos de arrastar para abrir/fechar.

## Abordagens
- **Escolhida:** mesmo `<nav class="bottom-nav">` das páginas vira gaveta no celular via CSS em `style.css`; `menu.js` (todas as páginas) cria ☰, ✕ e fundo e cuida de abrir/fechar.
- Descartada: segundo menu só para celular (dois menus para manter em 7 páginas).

## Design
- `frontend/assets/js/menu.js`: injeta `<button class="menu-botao">` antes do `<nav>`, `<button class="menu-fechar">` dentro do `<nav>` (topo) e `<div class="menu-fundo">`; classe `menu-aberto` no `<body>`; Esc, clique no fundo, clique num item e `focusout` para fora fecham; ao passar para ≥ 900px, fecha.
- `style.css`: em `max-width: 899px`, `.bottom-nav` vira gaveta (`translateX(-100%)` → `0`, largura `min(280px, 82vw)`, itens em linha com rótulo de 15px); `.topo` ganha recuo à esquerda para não ficar sob o ☰; `body.menu-aberto` sem rolagem. Em ≥ 900px, ☰, ✕ e fundo ficam `display: none`. Remove a regra de rótulo 9px (não é mais necessária).
- Verificação: `node --check`, todas as 7 rotas carregam `menu.js` e os links continuam 200; suites passam. Visual conferido pelo usuário no iPhone.
