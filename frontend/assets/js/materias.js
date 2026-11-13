/* Página Matérias. Depende de: ui.js, dashboard-utils.js (formatMinutos), materias-utils.js, api.js */
(function () {
  // Mesma paleta de backend/rotas/materias.py
  const PALETA = ['#6c8cff', '#2ec4b6', '#f4a261', '#e76f9a', '#b388ff',
    '#e9c46a', '#4cc9f0', '#90be6d', '#ff7b54', '#a0a7b8'];

  const estado = { aba: 'cursando', cursando: [], cursadas: [], editando: null };
  const $ = (id) => document.getElementById(id);

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
        menu(m.nome, m, [
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
        menu(m.nome, m, [
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
      const primeira = !estado.carregado;
      Object.assign(estado, { cursando, cursadas, carregado: true });
      render();
      // fade-up só na primeira vez; depois de cada ação a lista não reanima
      if (primeira) animarEntrada(document.querySelectorAll('#painel .mat-card, #painel .grupo'));
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
    } catch (e) { toast(e.message, { erro: true }); }
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
    } catch (e) { toast(e.message, { erro: true }); }
  }

  // ---------- início ----------
  ligarAbas(['cursando', 'cursadas'], irPara);
  ligarDialogs();
  $('btn-adicionar').addEventListener('click', () => abrirForm());
  $('semestre-label').textContent = `Semestre ${semestreAtual(new Date())}`;
  estado.aba = location.hash === '#cursadas' ? 'cursadas' : 'cursando';
  carregar();
})();
