/* Menu no celular (< 900px): o <nav class="bottom-nav"> vira uma gaveta lateral aberta pelo botão ☰.
   No computador o CSS esconde ☰, ✕ e fundo, e o menu lateral continua como antes. */
(function () {
  const nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  const DESKTOP = window.matchMedia('(min-width: 900px)');
  const svg = (caminhos) => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${caminhos}</svg>`;

  nav.id = nav.id || 'menu-principal';

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'menu-botao';
  botao.setAttribute('aria-label', 'Abrir menu');
  botao.setAttribute('aria-controls', nav.id);
  botao.setAttribute('aria-expanded', 'false');
  botao.innerHTML = svg('<path d="M4 6h16M4 12h16M4 18h16"/>'); // constante interna

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'menu-fechar';
  fechar.setAttribute('aria-label', 'Fechar menu');
  fechar.innerHTML = svg('<path d="M18 6 6 18M6 6l12 12"/>');

  const fundo = document.createElement('div');
  fundo.className = 'menu-fundo';
  fundo.setAttribute('aria-hidden', 'true');

  nav.prepend(fechar);
  nav.before(botao);
  nav.after(fundo);

  const aberto = () => document.body.classList.contains('menu-aberto');

  function abrir() {
    document.body.classList.add('menu-aberto');
    botao.setAttribute('aria-expanded', 'true');
    // espera a gaveta ficar visível (visibility) para poder receber o foco
    requestAnimationFrame(() => (nav.querySelector('[aria-current="page"]') || fechar).focus());
  }

  function fecharMenu(devolverFoco = true) {
    if (!aberto()) return;
    document.body.classList.remove('menu-aberto');
    botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botao.focus();
  }

  botao.addEventListener('click', () => (aberto() ? fecharMenu() : abrir()));
  fechar.addEventListener('click', () => fecharMenu());
  fundo.addEventListener('click', () => fecharMenu());
  // escolher uma página fecha (a navegação acontece normalmente; o link da Faculdade abre outra aba)
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) fecharMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aberto()) fecharMenu(); });
  // Tab para fora do menu fecha, para o foco não ficar atrás do fundo escuro
  nav.addEventListener('focusout', (e) => {
    if (aberto() && e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== botao) fecharMenu(false);
  });
  DESKTOP.addEventListener('change', (e) => { if (e.matches) fecharMenu(false); });
})();
