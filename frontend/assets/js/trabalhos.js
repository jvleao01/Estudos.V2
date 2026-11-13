/* Página Trabalhos e Provas.
   Depende de: dashboard-utils.js, materias-utils.js (formatarDataCurta), trabalhos-utils.js, api.js, ui.js */
(function () {
  // As duas abas têm o mesmo comportamento; muda só a API, o nome do campo de data e os textos.
  const CONFIG = {
    trabalhos: {
      url: '/api/trabalhos', campoData: 'entrega', tipo: 'trabalho',
      acao: 'Entregue', secao: 'Entregues', toastFeito: 'Marcado como entregue.',
      novo: 'Novo trabalho', editar: 'Editar trabalho', rotuloData: 'Data de entrega', exemplo: 'Ex.: Lista 3 – derivadas',
      vazio: 'Nenhum trabalho cadastrado.', botaoVazio: 'Adicionar trabalho',
      adicionado: 'Trabalho adicionado.', atualizado: 'Trabalho atualizado.', excluido: 'Trabalho excluído.',
      tituloExcluir: 'Excluir trabalho?', apagado: 'apagado',
      linha: (item) => `${item.materia.nome} · entrega ${formatarDataCurta(item.entrega)}`,
    },
    provas: {
      url: '/api/provas', campoData: 'data', tipo: 'prova',
      acao: 'Feita', secao: 'Feitas', toastFeito: 'Marcada como feita.',
      novo: 'Nova prova', editar: 'Editar prova', rotuloData: 'Data', exemplo: 'Ex.: P2 – integrais',
      vazio: 'Nenhuma prova cadastrada.', botaoVazio: 'Adicionar prova',
      adicionado: 'Prova adicionada.', atualizado: 'Prova atualizada.', excluido: 'Prova excluída.',
      tituloExcluir: 'Excluir prova?', apagado: 'apagada',
      linha: (item) => `${item.materia.nome} · ${formatarDataCurta(item.data)}`,
    },
  };
  const ABAS = ['trabalhos', 'provas'];

  // aberto: seção de concluídos aberta em cada aba (só durante a visita)
  const estado = { aba: 'trabalhos', trabalhos: [], provas: [], materias: [], editando: null, aberto: {} };
  const $ = (id) => document.getElementById(id);
  const cfg = () => CONFIG[estado.aba];

  // ---------- render ----------
  function acoesMenu(concluido) {
    const acoes = [
      { texto: 'Editar', icone: 'editar', fn: abrirForm },
      { texto: 'Excluir', icone: 'lixo', perigo: true, fn: excluir },
    ];
    if (concluido) acoes.unshift({ texto: 'Desmarcar', icone: 'desfazer', fn: (i) => marcar(i, false) });
    return acoes;
  }

  function topo(item) {
    return el('div', { class: 'item__topo' },
      el('h3', { class: 'item__titulo' }, item.titulo),
      menu(item.titulo, item, acoesMenu(item.concluido)));
  }

  function itemPendente(item) {
    const c = cfg();
    const selo = seloPrazo(diasAte(item[c.campoData], new Date()), c.tipo);
    return el('li', { class: 'item', 'data-titulo': item.titulo, style: `--cor:${item.materia.cor}` },
      topo(item),
      el('p', { class: 'item__linha' }, c.linha(item)),
      el('div', { class: 'item__rodape' },
        el('span', { class: `selo${selo.urgente ? ' selo--urgente' : ''}` }, selo.texto),
        el('button', { class: 'item__acao', type: 'button', onclick: () => marcar(item, true) },
          icone('check'), c.acao)));
  }

  function itemFeito(item) {
    return el('li', { class: 'item item--feito', 'data-titulo': item.titulo, style: `--cor:${item.materia.cor}` },
      topo(item),
      el('p', { class: 'item__linha' }, cfg().linha(item)));
  }

  function estadoVazio() {
    return el('div', { class: 'estado' }, icone('calendario'), el('p', {}, cfg().vazio),
      el('button', { class: 'btn', type: 'button', onclick: () => abrirForm() }, cfg().botaoVazio));
  }

  function render() {
    for (const aba of ABAS) {
      const ativo = estado.aba === aba;
      $(`aba-${aba}`).setAttribute('aria-selected', String(ativo));
      $(`aba-${aba}`).tabIndex = ativo ? 0 : -1;
      $(`cont-${aba}`).textContent = separarConcluidos(estado[aba]).pendentes.length;
    }
    const painel = $('painel');
    painel.setAttribute('aria-labelledby', `aba-${estado.aba}`);
    const itens = estado[estado.aba];
    if (!itens.length) { painel.replaceChildren(estadoVazio()); return; }
    const { pendentes, concluidos } = separarConcluidos(itens);
    painel.replaceChildren(
      pendentes.length
        ? el('ul', { class: 'lista-itens' }, ...pendentes.map(itemPendente))
        : el('div', { class: 'estado' }, icone('check'), el('p', {}, 'Nada pendente por aqui.')),
      concluidos.length
        ? el('details', {
          class: 'concluidos', open: Boolean(estado.aberto[estado.aba]),
          ontoggle: (e) => { estado.aberto[estado.aba] = e.target.open; },
        },
          el('summary', {}, `${cfg().secao} (${concluidos.length})`),
          el('ul', { class: 'lista-itens' }, ...concluidos.map(itemFeito)))
        : null);
  }

  function renderErro(msg) {
    $('painel').replaceChildren(el('div', { class: 'estado estado--erro' }, icone('alerta'), el('p', {}, msg),
      el('button', { class: 'btn', type: 'button', onclick: carregar }, 'Tentar de novo')));
  }

  async function carregar() {
    // Só mostra "Carregando..." na primeira vez, para não piscar a lista a cada ação.
    if (!estado.carregado) $('painel').replaceChildren(el('div', { class: 'estado' }, el('p', {}, 'Carregando...')));
    try {
      const [trabalhos, provas, materias] = await Promise.all([
        apiFetch(CONFIG.trabalhos.url), apiFetch(CONFIG.provas.url), apiFetch('/api/materias'),
      ]);
      Object.assign(estado, { trabalhos, provas, materias, carregado: true });
      render();
    } catch (e) {
      estado.carregado = false;
      renderErro(e.message);
    }
  }

  function irPara(aba) {
    estado.aba = aba;
    history.replaceState(null, '', aba === 'provas' ? '#provas' : location.pathname);
    render();
  }

  // ---------- ações ----------
  // c é fixado na hora da ação: o "Desfazer" continua valendo mesmo se a aba mudar.
  async function marcar(item, concluido, c = cfg()) {
    try {
      await apiFetch(`${c.url}/${item.id}`, { method: 'PATCH', body: { concluido } });
      await carregar();
      if (concluido) toast(c.toastFeito, { acao: { texto: 'Desfazer', fn: () => marcar(item, false, c) } });
    } catch (e) { toast(e.message, { erro: true }); }
  }

  async function excluir(item) {
    const c = cfg();
    const sim = await confirmar({
      titulo: c.tituloExcluir,
      texto: `"${item.titulo}" será ${c.apagado}. Não dá para desfazer.`,
      botao: 'Excluir',
      perigo: true,
    });
    if (!sim) return;
    try {
      await apiFetch(`${c.url}/${item.id}`, { method: 'DELETE' });
      toast(c.excluido);
      await carregar();
    } catch (e) { toast(e.message, { erro: true }); }
  }

  // ---------- formulário ----------
  function opcoesMateria(item) {
    const lista = estado.materias.filter((m) => m.status === 'cursando');
    if (item && !lista.some((m) => m.id === item.materiaId)) {
      lista.push({ id: item.materiaId, nome: item.materia.nome }); // matéria já finalizada continua disponível
    }
    lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return lista.map((m) => el('option', { value: m.id, selected: item ? m.id === item.materiaId : false }, m.nome));
  }

  function abrirForm(item = null) {
    if (!estado.carregado) {
      toast('Não foi possível carregar os dados. Tentando de novo...', { erro: true });
      carregar();
      return;
    }
    if (!item && !estado.materias.some((m) => m.status === 'cursando')) {
      toast('Cadastre uma matéria em Matérias antes de adicionar.', {
        acao: { texto: 'Ir para Matérias', fn: () => { location.href = 'materias.html'; } },
      });
      return;
    }
    const c = cfg();
    estado.editando = item;
    const form = $('form-item');
    form.reset();
    $('form-erro').hidden = true;
    $('form-titulo').textContent = item ? c.editar : c.novo;
    $('rotulo-data').textContent = c.rotuloData;
    form.titulo.placeholder = c.exemplo;
    form.materia.replaceChildren(...opcoesMateria(item));
    form.titulo.value = item ? item.titulo : '';
    form.data.value = item ? item[c.campoData] : '';
    $('dlg-form').showModal();
    (item ? form.titulo : form.materia).focus();
  }

  $('form-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = cfg();
    const form = e.target;
    const erro = $('form-erro');
    const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };
    const titulo = form.titulo.value.trim();
    const data = form.data.value;
    if (!form.materia.value) return mostrarErro('Escolha a matéria.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return mostrarErro('Data inválida. Use o formato AAAA-MM-DD.');
    if (!titulo || titulo.length > 120) return mostrarErro('A descrição deve ter entre 1 e 120 caracteres.');

    const dados = { materiaId: Number(form.materia.value), titulo, [c.campoData]: data };
    const botao = $('btn-salvar');
    botao.disabled = true;
    try {
      if (estado.editando) {
        await apiFetch(`${c.url}/${estado.editando.id}`, { method: 'PATCH', body: dados });
        toast(c.atualizado);
      } else {
        await apiFetch(c.url, { method: 'POST', body: dados });
        toast(c.adicionado);
      }
      $('dlg-form').close();
      await carregar();
    } catch (err) {
      mostrarErro(err.message);
    } finally {
      botao.disabled = false;
    }
  });

  // ---------- início ----------
  ligarAbas(ABAS, irPara);
  ligarDialogs();
  $('btn-adicionar').addEventListener('click', () => abrirForm());
  // A contagem de dias muda à meia-noite: recalcula ao voltar para a aba.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.carregado) render();
  });
  estado.aba = location.hash === '#provas' ? 'provas' : 'trabalhos';
  carregar();
})();
