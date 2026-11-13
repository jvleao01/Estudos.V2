/* Página Matérias. Depende de: dashboard-utils.js (formatMinutos), materias-utils.js, api.js */
(function () {
  // Mesma paleta de backend/rotas/materias.py
  const PALETA = ['#6c8cff', '#2ec4b6', '#f4a261', '#e76f9a', '#b388ff',
    '#e9c46a', '#4cc9f0', '#90be6d', '#ff7b54', '#a0a7b8'];

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
  };

  const estado = { aba: 'cursando', cursando: [], cursadas: [], editando: null };
  const $ = (id) => document.getElementById(id);

  // ---------- helpers de DOM (todo texto entra via textContent) ----------
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

  let toastTimer;
  function toast(msg, erro = false) {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast${erro ? ' toast--erro' : ''}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
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

  function menu(materia, acoes) {
    const botao = el('button', {
      class: 'btn-icone', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': `Ações de ${materia.nome}`,
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
          onclick: () => { fecharMenus(); a.fn(materia); },
        }, icone(a.icone), a.texto))));
      wrap.append(lista);
      botao.setAttribute('aria-expanded', 'true');
      lista.querySelector('button').focus();
    });
    return wrap;
  }

  document.addEventListener('click', () => fecharMenus());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenus(); });

  // ---------- render ----------
  function estadoVazio(msg, comBotao = true) {
    return el('div', { class: 'estado' }, icone('livro'), el('p', {}, msg),
      comBotao ? el('button', { class: 'btn', type: 'button', onclick: () => abrirForm() }, 'Adicionar matéria') : null);
  }

  function cardCursando(m) {
    const provas = m.provas.length
      ? el('span', { class: 'chips' }, ...m.provas.map((p) => el('span', { class: 'chip-data', title: p.titulo }, formatarDataCurta(p.data))))
      : el('span', {}, 'Sem provas marcadas');
    return el('li', { class: 'mat-card', style: `--cor:${m.cor}` },
      el('div', { class: 'mat-card__topo' },
        el('h3', { class: 'mat-card__nome' }, m.nome),
        el('span', { class: 'chip-semestre' }, m.semestre),
        menu(m, [
          { texto: 'Editar', icone: 'editar', fn: abrirForm },
          { texto: 'Finalizar', icone: 'finalizar', fn: finalizar },
          { texto: 'Excluir', icone: 'lixo', perigo: true, fn: excluir },
        ])),
      el('ul', { class: 'mat-card__stats' },
        el('li', { class: 'stat' }, icone('relogio'), el('strong', {}, formatMinutos(m.minutosTotais)), ' estudadas'),
        el('li', { class: 'stat' }, icone('trabalho'), 'Trabalhos: ', el('strong', {}, rotuloTrabalhos(m.trabalhos, m.trabalhosPendentes))),
        el('li', { class: 'stat' }, icone('calendario'), provas)));
  }

  function listaCursadas(materias) {
    return el('div', {}, ...agruparPorSemestre(materias).map((g) => el('section', { class: 'grupo' },
      el('h3', { class: 'grupo__titulo' }, `Semestre ${g.semestre}`),
      el('ul', { class: 'grupo__lista' }, ...g.materias.map((m) => el('li', { class: 'cursada' },
        el('span', { class: 'ponto', style: `--cor:${m.cor}` }),
        el('span', { class: 'cursada__nome' }, m.nome),
        menu(m, [
          { texto: 'Editar', icone: 'editar', fn: abrirForm },
          { texto: 'Excluir', icone: 'lixo', perigo: true, fn: excluir },
        ])))))));
  }

  function render() {
    for (const aba of ['cursando', 'cursadas']) {
      const ativo = estado.aba === aba;
      $(`aba-${aba}`).setAttribute('aria-selected', String(ativo));
      $(`aba-${aba}`).tabIndex = ativo ? 0 : -1;
      $(`cont-${aba}`).textContent = estado[aba].length;
    }
    const painel = $('painel');
    painel.setAttribute('aria-labelledby', `aba-${estado.aba}`);
    if (estado.aba === 'cursando') {
      painel.replaceChildren(estado.cursando.length
        ? el('ul', { class: 'lista-materias' }, ...estado.cursando.map(cardCursando))
        : estadoVazio('Você ainda não está cursando nenhuma matéria.'));
    } else {
      painel.replaceChildren(estado.cursadas.length
        ? listaCursadas(estado.cursadas)
        : estadoVazio('Nenhuma matéria concluída registrada.'));
    }
  }

  function renderErro(msg) {
    $('painel').replaceChildren(el('div', { class: 'estado estado--erro' }, icone('alerta'), el('p', {}, msg),
      el('button', { class: 'btn', type: 'button', onclick: carregar }, 'Tentar de novo')));
  }

  async function carregar() {
    $('painel').replaceChildren(el('div', { class: 'estado' }, el('p', {}, 'Carregando...')));
    try {
      const [cursando, cursadas] = await Promise.all([
        apiFetch('/api/materias?status=cursando'),
        apiFetch('/api/materias?status=cursada'),
      ]);
      Object.assign(estado, { cursando, cursadas });
      render();
    } catch (e) {
      renderErro(e.message);
    }
  }

  // ---------- abas ----------
  function irPara(aba) {
    estado.aba = aba;
    history.replaceState(null, '', aba === 'cursadas' ? '#cursadas' : location.pathname);
    render();
  }

  document.querySelectorAll('.aba').forEach((b) => {
    b.addEventListener('click', () => irPara(b.dataset.aba));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const outra = b.dataset.aba === 'cursando' ? 'cursadas' : 'cursando';
      irPara(outra);
      $(`aba-${outra}`).focus();
    });
  });

  // ---------- formulário ----------
  function montarCores(corAtual, permitirAuto) {
    const opcoes = [];
    const radio = (valor, extra = {}) => el('input', { type: 'radio', name: 'cor', value: valor, checked: corAtual === valor, ...extra });
    if (permitirAuto) {
      opcoes.push(el('label', { class: 'cor cor--auto' }, radio('auto', { 'aria-label': 'Cor automática' }),
        el('span', { class: 'cor__amostra' }, 'Automática')));
    }
    for (const c of PALETA) {
      opcoes.push(el('label', { class: 'cor' }, radio(c, { 'aria-label': `Cor ${c}` }),
        el('span', { class: 'cor__amostra', style: `--cor:${c}` }, icone('check'))));
    }
    const livre = corAtual && corAtual !== 'auto' && !PALETA.includes(corAtual) ? corAtual : '#ffffff';
    const seletor = el('input', { type: 'color', value: livre, 'aria-label': 'Escolher outra cor' });
    const radioLivre = radio(livre, { 'data-livre': '', 'aria-label': 'Cor personalizada' });
    if (corAtual === livre && !PALETA.includes(livre)) radioLivre.checked = true;
    const amostraLivre = el('span', { class: 'cor__amostra' }, icone('check'));
    if (radioLivre.checked) amostraLivre.style.background = livre;
    seletor.addEventListener('input', () => {
      radioLivre.value = seletor.value;
      radioLivre.checked = true;
      amostraLivre.style.background = seletor.value;
    });
    opcoes.push(el('label', { class: 'cor cor--livre' }, radioLivre, amostraLivre, seletor));
    $('cores').replaceChildren(...opcoes);
  }

  function abrirForm(materia = null) {
    estado.editando = materia;
    const form = $('form-materia');
    form.reset();
    $('form-erro').hidden = true;
    const statusNovo = estado.aba === 'cursando' ? 'cursando' : 'cursada';
    $('form-titulo').textContent = materia ? 'Editar matéria' : (statusNovo === 'cursando' ? 'Nova matéria' : 'Matéria já cursada');
    form.nome.value = materia ? materia.nome : '';
    form.semestre.value = materia ? materia.semestre : semestreAtual(new Date());
    $('campo-status').hidden = !materia;
    form.querySelector(`input[name="status"][value="${materia ? materia.status : statusNovo}"]`).checked = true;
    const permitirAuto = !materia && statusNovo === 'cursada';
    montarCores(materia ? materia.cor : (permitirAuto ? 'auto' : proximaCorLivre()), permitirAuto);
    $('dlg-form').showModal();
    form.nome.focus();
  }

  function proximaCorLivre() {
    const usadas = new Set([...estado.cursando, ...estado.cursadas].map((m) => m.cor));
    return PALETA.find((c) => !usadas.has(c)) || PALETA[0];
  }

  $('form-materia').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const erro = $('form-erro');
    const nome = form.nome.value.trim();
    const semestre = form.semestre.value.trim();
    const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };
    if (!nome) return mostrarErro('Informe o nome da matéria.');
    if (!/^\d{4}\.[12]$/.test(semestre)) return mostrarErro('Semestre inválido. Use o formato 2026.1 ou 2026.2.');

    const dados = { nome, semestre, status: form.querySelector('input[name="status"]:checked').value };
    const cor = form.querySelector('input[name="cor"]:checked');
    if (cor && cor.value !== 'auto') dados.cor = cor.value;

    const botao = $('btn-salvar');
    botao.disabled = true;
    try {
      if (estado.editando) {
        await apiFetch(`/api/materias/${estado.editando.id}`, { method: 'PATCH', body: dados });
        toast('Matéria atualizada.');
      } else {
        await apiFetch('/api/materias', { method: 'POST', body: dados });
        toast('Matéria adicionada.');
      }
      $('dlg-form').close();
      await carregar();
    } catch (err) {
      mostrarErro(err.message);
    } finally {
      botao.disabled = false;
    }
  });

  document.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => {
    if (e.target === d) d.close(); // clique no fundo escuro fecha
  }));

  // ---------- confirmação ----------
  function confirmar({ titulo, texto, botao, perigo }) {
    const dlg = $('dlg-confirma');
    $('conf-titulo').textContent = titulo;
    $('conf-texto').textContent = texto;
    $('conf-ok').textContent = botao;
    $('conf-ok').className = `btn${perigo ? ' btn--perigo' : ''}`;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((ok) => dlg.addEventListener('close', () => ok(dlg.returnValue === 'sim'), { once: true }));
  }

  async function finalizar(m) {
    const sim = await confirmar({
      titulo: 'Finalizar matéria?',
      texto: `"${m.nome}" vai para Já cursadas (semestre ${m.semestre}).`,
      botao: 'Finalizar',
    });
    if (!sim) return;
    try {
      await apiFetch(`/api/materias/${m.id}`, { method: 'PATCH', body: { status: 'cursada' } });
      toast('Matéria finalizada.');
      await carregar();
    } catch (e) { toast(e.message, true); }
  }

  async function excluir(m) {
    const sim = await confirmar({
      titulo: 'Excluir matéria?',
      texto: `"${m.nome}" e todo o histórico dela (horas, trabalhos e provas) serão apagados. Não dá para desfazer.`,
      botao: 'Excluir',
      perigo: true,
    });
    if (!sim) return;
    try {
      await apiFetch(`/api/materias/${m.id}`, { method: 'DELETE' });
      toast('Matéria excluída.');
      await carregar();
    } catch (e) { toast(e.message, true); }
  }

  // ---------- início ----------
  $('btn-adicionar').addEventListener('click', () => abrirForm());
  $('semestre-label').textContent = `Semestre ${semestreAtual(new Date())}`;
  estado.aba = location.hash === '#cursadas' ? 'cursadas' : 'cursando';
  carregar();
})();
