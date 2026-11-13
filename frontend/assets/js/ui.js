/* Componentes de interface compartilhados pelas páginas (DOM, ícones, toast, menu, diálogos, abas).
   Expõe funções globais: el, icone, toast, menu, fecharMenus, confirmar, ligarDialogs, ligarAbas. */
(function () {
  const ICONES = {
    relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M10 2h4"/>',
    trabalho: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    mais: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    finalizar: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    lixo: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    alerta: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    desfazer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  };

  // Cria um elemento. Todo texto entra como nó de texto (nunca HTML).
  function el(tag, attrs = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos) if (f !== null && f !== undefined) n.append(f);
    return n;
  }

  function icone(nome) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icone');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONES[nome]; // constantes internas, nunca dados do usuário
    return svg;
  }

  // toast('Salvo.') | toast(msg, { erro: true }) | toast(msg, { acao: { texto: 'Desfazer', fn } })
  let toastTimer;
  function toast(msg, { erro = false, acao = null } = {}) {
    const t = document.getElementById('toast');
    const fechar = () => { t.hidden = true; };
    t.replaceChildren(el('span', {}, msg));
    if (acao) {
      t.append(el('button', {
        class: 'toast__acao', type: 'button',
        onclick: () => { clearTimeout(toastTimer); fechar(); acao.fn(); },
      }, acao.texto));
    }
    t.className = `toast${erro ? ' toast--erro' : ''}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(fechar, acao ? 5000 : 3500);
  }

  // ---------- menu de ações ----------
  function fecharMenus(excetoBotao) {
    document.querySelectorAll('.menu__lista').forEach((l) => {
      const botao = l.previousElementSibling;
      if (botao === excetoBotao) return;
      l.remove();
      botao.setAttribute('aria-expanded', 'false');
    });
  }

  // acoes: [{ texto, icone, fn(item), perigo? }]
  function menu(rotulo, item, acoes) {
    const botao = el('button', {
      class: 'btn-icone', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': `Ações de ${rotulo}`,
    }, icone('mais'));
    const wrap = el('div', { class: 'menu' }, botao);
    botao.addEventListener('click', (ev) => {
      ev.stopPropagation();
      fecharMenus(botao);
      const aberto = botao.getAttribute('aria-expanded') === 'true';
      if (aberto) { fecharMenus(); return; }
      const lista = el('ul', { class: 'menu__lista', role: 'menu' }, ...acoes.map((a) => el('li', { role: 'none' },
        el('button', {
          class: `menu__item${a.perigo ? ' menu__item--perigo' : ''}`, role: 'menuitem', type: 'button',
          onclick: () => { fecharMenus(); a.fn(item); },
        }, icone(a.icone), a.texto))));
      wrap.append(lista);
      botao.setAttribute('aria-expanded', 'true');
      lista.querySelector('button').focus();
    });
    return wrap;
  }

  document.addEventListener('click', () => fecharMenus());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenus(); });

  // ---------- diálogos ----------
  function confirmar({ titulo, texto, botao, perigo }) {
    const dlg = document.getElementById('dlg-confirma');
    document.getElementById('conf-titulo').textContent = titulo;
    document.getElementById('conf-texto').textContent = texto;
    const ok = document.getElementById('conf-ok');
    ok.textContent = botao;
    ok.className = `btn${perigo ? ' btn--perigo' : ''}`;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((fim) => dlg.addEventListener('close', () => fim(dlg.returnValue === 'sim'), { once: true }));
  }

  function ligarDialogs() {
    document.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => {
      if (e.target === d) d.close(); // clique no fundo escuro fecha
    }));
  }

  // ---------- abas ----------
  function ligarAbas(abas, aoTrocar) {
    document.querySelectorAll('.aba[data-aba]').forEach((b) => {
      b.addEventListener('click', () => aoTrocar(b.dataset.aba));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const passo = e.key === 'ArrowRight' ? 1 : -1;
        const outra = abas[(abas.indexOf(b.dataset.aba) + passo + abas.length) % abas.length];
        aoTrocar(outra);
        document.querySelector(`.aba[data-aba="${outra}"]`).focus();
      });
    });
  }

  Object.assign(window, { el, icone, toast, menu, fecharMenus, confirmar, ligarDialogs, ligarAbas });
})();
