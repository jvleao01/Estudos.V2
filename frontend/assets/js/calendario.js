/* Página Calendário. Depende de: materias-utils.js (semestreAtual), calendario-utils.js, api.js, ui.js, animacoes.js */
(function () {
  const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const DIAS_AULA = [1, 2, 3, 4, 5, 6]; // segunda a sábado
  const MAX_MARCAS = 3;
  const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

  const estado = { mes: null, dados: null, dias: new Map(), selecionado: null, carregado: false, semestreFolha: null };
  const $ = (id) => document.getElementById(id);
  const dd = (n) => String(n).padStart(2, '0');

  function hojeIso() {
    const h = new Date();
    return `${h.getFullYear()}-${dd(h.getMonth() + 1)}-${dd(h.getDate())}`;
  }
  const mesAtual = () => hojeIso().slice(0, 7);
  const anoMes = () => estado.mes.split('-').map(Number);
  // Semestre do mês exibido, pelo dia 15 (mesma regra de semestreAtual usada em Matérias).
  const semestreDoMes = () => { const [a, m] = anoMes(); return semestreAtual(new Date(a, m - 1, 15)); };

  // ---------- grade ----------
  function plural(n, um, varios) { return `${n} ${n === 1 ? um : varios}`; }

  function rotuloCelula(data, info) {
    const [a, m, d] = data.split('-').map(Number);
    const nomeDia = DIAS[new Date(a, m - 1, d).getDay()];
    const partes = [];
    const aulas = info.aulas.filter((x) => !x.desmarcada).length;
    if (info.feriado) partes.push(`feriado, ${info.feriado}`);
    if (aulas) partes.push(plural(aulas, 'aula', 'aulas'));
    if (info.provas.length) partes.push(plural(info.provas.length, 'prova', 'provas'));
    if (info.trabalhos.length) partes.push(plural(info.trabalhos.length, 'entrega', 'entregas'));
    return `${nomeDia}, ${d} de ${MESES[m - 1].toLowerCase()}${partes.length ? `: ${partes.join(', ')}` : ''}`;
  }

  function marcas(info) {
    const lista = [
      ...info.aulas.filter((a) => !a.desmarcada).map((a) => ({ classe: 'marca--aula', cor: a.cor })),
      ...info.provas.map((p) => ({ classe: 'marca--prova', cor: p.materia.cor })),
      ...info.trabalhos.map((t) => ({ classe: 'marca--entrega', cor: t.materia.cor })),
    ];
    const visiveis = lista.length > MAX_MARCAS ? lista.slice(0, MAX_MARCAS - 1) : lista;
    const nos = visiveis.map((x) => el('span', { class: `marca ${x.classe}`, style: `--cor:${x.cor}` }));
    if (lista.length > visiveis.length) nos.push(el('span', { class: 'marca-mais' }, `+${lista.length - visiveis.length}`));
    return el('span', { class: 'cal-celula__marcas', 'aria-hidden': 'true' }, ...nos);
  }

  function celula(data) {
    if (!data) return el('div', { class: 'cal-celula cal-celula--vazia', role: 'presentation' });
    const info = estado.dias.get(data);
    const classes = ['cal-celula'];
    if (data === hojeIso()) classes.push('hoje');
    if (data === estado.selecionado) classes.push('selecionado');
    if (info.feriado) classes.push('feriado');
    return el('button', {
      class: classes.join(' '), type: 'button', 'data-data': data,
      'aria-label': rotuloCelula(data, info), 'aria-pressed': String(data === estado.selecionado),
      tabindex: data === estado.selecionado ? '0' : '-1',
      onclick: () => selecionar(data),
    }, el('span', { class: 'cal-celula__num' }, String(Number(data.slice(8)))), marcas(info));
  }

  function renderGrade() {
    const [a, m] = anoMes();
    const cabecalho = DIAS_CURTOS.map((d) => el('div', { class: 'cal-cab', 'aria-hidden': 'true' }, d));
    const celulas = gradeDoMes(a, m).flat().map(celula);
    $('painel').replaceChildren(el('div', { class: 'cal-grade', onkeydown: navegarTeclado }, ...cabecalho, ...celulas));
  }

  // Setas movem a seleção dentro do mês (←/→ um dia, ↑/↓ uma semana).
  function navegarTeclado(e) {
    const passo = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!passo || !estado.selecionado) return;
    const [a, m, d] = estado.selecionado.split('-').map(Number);
    const alvo = new Date(a, m - 1, d + passo);
    const iso = `${alvo.getFullYear()}-${dd(alvo.getMonth() + 1)}-${dd(alvo.getDate())}`;
    if (!estado.dias.has(iso)) return;
    e.preventDefault();
    selecionar(iso);
    const botao = document.querySelector(`.cal-celula[data-data="${iso}"]`);
    if (botao) botao.focus();
  }

  // ---------- lista do dia ----------
  function linhaAula(data, aula) {
    const acao = aula.desmarcada
      ? el('button', { class: 'item__acao', type: 'button', onclick: () => remarcar(aula, data), 'aria-label': `Remarcar aula de ${aula.nome}` }, 'Remarcar')
      : el('button', { class: 'item__acao', type: 'button', onclick: () => desmarcar(aula, data), 'aria-label': `Desmarcar aula de ${aula.nome}` }, 'Desmarcar');
    return el('li', { class: `cal-item${aula.desmarcada ? ' cal-item--desmarcada' : ''}`, style: `--cor:${aula.cor}` },
      el('span', { class: 'marca marca--aula', 'aria-hidden': 'true' }),
      el('div', { class: 'cal-item__info' },
        el('span', { class: 'cal-item__titulo' }, aula.nome),
        el('span', { class: 'cal-item__tipo' }, aula.desmarcada ? 'Sem aula' : 'Aula')),
      acao);
  }

  function linhaItem(item, tipo, classeMarca) {
    return el('li', { class: `cal-item${item.concluido ? ' feito' : ''}`, style: `--cor:${item.materia.cor}` },
      el('span', { class: `marca ${classeMarca}`, 'aria-hidden': 'true' }),
      el('div', { class: 'cal-item__info' },
        el('span', { class: 'cal-item__titulo' }, item.titulo),
        el('span', { class: 'cal-item__tipo' }, `${tipo} · ${item.materia.nome}${item.concluido ? ' · concluído' : ''}`)));
  }

  function renderDia() {
    const data = estado.selecionado;
    const info = estado.dias.get(data);
    const filhos = [el('h3', { class: 'cal-dia__titulo' }, rotuloDia(data))];
    if (info.feriado) filhos.push(el('p', { class: 'cal-dia__feriado' }, `Feriado: ${info.feriado}`));
    const itens = [
      ...info.aulas.map((a) => linhaAula(data, a)),
      ...info.provas.map((p) => linhaItem(p, p.simulado ? 'Simulado' : 'Prova', 'marca--prova')),
      ...info.trabalhos.map((t) => linhaItem(t, 'Entrega', 'marca--entrega')),
    ];
    filhos.push(itens.length ? el('ul', { class: 'cal-lista' }, ...itens) : el('p', { class: 'cal-dia__vazio' }, 'Nada neste dia.'));
    $('dia').replaceChildren(...filhos);
  }

  function selecionar(data) {
    estado.selecionado = data;
    renderGrade();
    renderDia();
  }

  // ---------- cabeçalho e aviso ----------
  function renderTopo() {
    $('mes-titulo').textContent = rotuloMes(estado.mes);
    $('btn-hoje').hidden = estado.mes === mesAtual();
    const sem = semestreDoMes();
    const temDatas = estado.dados && estado.dados.semestres.some((s) => s.semestre === sem);
    const aviso = $('aviso-semestre');
    aviso.hidden = !estado.dados || temDatas;
    if (!aviso.hidden) {
      aviso.replaceChildren(icone('alerta'), `Defina as datas do semestre ${sem} para ver as aulas. `,
        el('button', { class: 'link-botao', type: 'button', onclick: abrirAulas }, 'Definir agora'));
    }
  }

  function render() {
    renderTopo();
    renderGrade();
    renderDia();
  }

  function renderErro(msg) {
    $('dia').replaceChildren();
    $('painel').replaceChildren(el('div', { class: 'estado estado--erro' }, icone('alerta'), el('p', {}, msg),
      el('button', { class: 'btn', type: 'button', onclick: carregar }, 'Tentar de novo')));
  }

  async function carregar() {
    const mes = estado.mes;
    if (!estado.carregado) $('painel').replaceChildren(el('div', { class: 'estado' }, el('p', {}, 'Carregando...')));
    try {
      const dados = await apiFetch(`/api/calendario?mes=${mes}`);
      if (mes !== estado.mes) return; // trocou de mês enquanto carregava
      const [a, m] = anoMes();
      const primeira = !estado.carregado;
      Object.assign(estado, { dados, dias: diasDoMes(a, m, dados), carregado: true });
      if (!estado.dias.has(estado.selecionado)) {
        estado.selecionado = estado.dias.has(hojeIso()) ? hojeIso() : `${mes}-01`;
      }
      render();
      if (primeira) animarEntrada(document.querySelectorAll('.cal-painel, .cal-dia'));
    } catch (e) {
      estado.carregado = false;
      renderTopo();
      renderErro(e.message);
    }
  }

  function irParaMes(mes) {
    estado.mes = mes;
    estado.dados = null;
    history.replaceState(null, '', `#${mes}`);
    renderTopo();
    carregar();
  }

  // ---------- desmarcar / remarcar ----------
  async function desmarcar(aula, data) {
    try {
      await apiFetch('/api/aulas/desmarcadas', { method: 'POST', body: { materiaId: aula.materiaId, data } });
      await carregar();
      toast('Aula desmarcada.', { acao: { texto: 'Desfazer', fn: () => remarcar(aula, data, true) } });
    } catch (e) { toast(e.message, { erro: true }); }
  }

  async function remarcar(aula, data, silencioso = false) {
    try {
      await apiFetch(`/api/aulas/desmarcadas/${aula.materiaId}/${data}`, { method: 'DELETE' });
      await carregar();
      if (!silencioso) toast('Aula remarcada.');
    } catch (e) { toast(e.message, { erro: true }); }
  }

  // ---------- folha "Aulas da semana" ----------
  function tabelaAulas(materias) {
    if (!materias.length) {
      return el('p', { class: 'aulas-vazio' }, `Nenhuma matéria no semestre ${estado.semestreFolha}. `,
        el('a', { href: 'materias.html' }, 'Cadastrar em Matérias'));
    }
    const cab = el('tr', {}, el('th', { scope: 'col' }, el('span', { class: 'sr-only' }, 'Matéria')),
      ...DIAS_AULA.map((d) => el('th', { scope: 'col' }, DIAS_CURTOS[d])));
    const linhas = materias.map((m) => el('tr', { 'data-materia': m.id },
      el('th', { scope: 'row', style: `--cor:${m.cor}` }, m.nome),
      ...DIAS_AULA.map((d) => el('td', {}, el('input', {
        type: 'checkbox', value: d, checked: m.dias.includes(d), 'aria-label': `${m.nome}, ${DIAS[d].toLowerCase()}`,
      })))));
    return el('div', { class: 'aulas-tabela-wrap' },
      el('table', { class: 'aulas-tabela' }, el('thead', {}, cab), el('tbody', {}, ...linhas)));
  }

  async function abrirAulas() {
    const sem = semestreDoMes();
    estado.semestreFolha = sem;
    const form = $('form-aulas');
    form.reset();
    $('aulas-erro').hidden = true;
    $('aulas-titulo').textContent = `Aulas da semana · ${sem}`;
    $('tabela-aulas').replaceChildren(el('p', { class: 'aulas-vazio' }, 'Carregando...'));
    $('dlg-aulas').showModal();
    try {
      const s = await apiFetch(`/api/semestres/${sem}`);
      form.inicio.value = s.inicio || '';
      form.fim.value = s.fim || '';
      $('tabela-aulas').replaceChildren(tabelaAulas(s.materias));
      form.inicio.focus();
    } catch (e) {
      $('tabela-aulas').replaceChildren();
      mostrarErroAulas(e.message);
    }
  }

  function mostrarErroAulas(msg) {
    $('aulas-erro').textContent = msg;
    $('aulas-erro').hidden = false;
  }

  $('form-aulas').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const inicio = form.inicio.value;
    const fim = form.fim.value;
    if (!inicio || !fim) return mostrarErroAulas('Informe o início e o fim do semestre.');
    if (inicio >= fim) return mostrarErroAulas('O início deve ser antes do fim.');
    const aulas = {};
    form.querySelectorAll('tr[data-materia]').forEach((tr) => {
      aulas[tr.dataset.materia] = [...tr.querySelectorAll('input:checked')].map((c) => Number(c.value));
    });
    const dlg = $('dlg-aulas');
    const botao = $('btn-salvar-aulas');
    dlg.setAttribute('data-travado', '');
    botao.disabled = true;
    try {
      await apiFetch(`/api/semestres/${estado.semestreFolha}`, { method: 'PUT', body: { inicio, fim, aulas } });
      dlg.removeAttribute('data-travado');
      dlg.close();
      toast('Aulas salvas.');
      await carregar();
    } catch (err) {
      mostrarErroAulas(err.message);
    } finally {
      dlg.removeAttribute('data-travado');
      botao.disabled = false;
    }
  });

  // ---------- início ----------
  ligarDialogs();
  $('btn-aulas').addEventListener('click', abrirAulas);
  $('mes-anterior').addEventListener('click', () => irParaMes(mesVizinho(estado.mes, -1)));
  $('mes-seguinte').addEventListener('click', () => irParaMes(mesVizinho(estado.mes, 1)));
  $('btn-hoje').addEventListener('click', () => { estado.selecionado = hojeIso(); irParaMes(mesAtual()); });
  // "Hoje" muda à meia-noite: redesenha ao voltar para a aba.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.carregado) render();
  });
  const doHash = location.hash.slice(1);
  estado.mes = RE_MES.test(doHash) ? doHash : mesAtual();
  renderTopo();
  carregar();
})();
