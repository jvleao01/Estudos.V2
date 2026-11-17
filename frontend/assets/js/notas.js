/* Página Notas. Depende de: notas-utils.js, api.js, ui.js, animacoes.js */
(function () {
  const URL_TIPO = { prova: '/api/provas', trabalho: '/api/trabalhos' };
  const estado = { materias: [], carregado: false, item: null };
  const $ = (id) => document.getElementById(id);
  const pts = formatarPontos;

  // ---------- render ----------
  function linhaPontos(m, r) {
    const partes = [el('strong', {}, rotuloPontos(r.obtidos))];
    if (r.bonus > 0) {
      partes.push(el('span', { class: 'nota-bonus' }, ` + ${pts(r.bonus)} bônus`));
      partes.push(el('strong', {}, ` = ${pts(r.final)}`));
    }
    const sit = textoSituacao(r);
    return el('div', { class: 'nota-card__pontos' },
      el('p', {}, ...partes),
      sit ? el('span', { class: `selo selo--${sit.classe}` }, sit.texto) : null);
  }

  function barra(m, r) {
    const max = m.notaMinima;
    const atual = Math.min(r.final, max);
    const pct = max > 0 ? Math.round((atual / max) * 100) : 100;
    return el('div', {
      class: 'nota-barra', role: 'progressbar',
      'aria-label': 'Progresso até o mínimo', 'aria-valuemin': '0',
      'aria-valuemax': String(max), 'aria-valuenow': String(atual),
    }, el('span', { style: `width:${pct}%` }));
  }

  function linhaItem(m, i) {
    const vale = i.valor === null ? null : el('span', { class: 'nota-item__vale' }, `vale ${pts(i.valor)}`);
    let direita;
    if (i.valor === null) {
      // abre a edição do item em Trabalhos e Provas
      const aba = i.tipo === 'prova' ? '#provas' : '';
      direita = el('a', {
        class: 'nota-item__link', href: `trabalhos.html?editar=${i.id}${aba}`,
        'aria-label': `Sem valor: definir o valor de ${i.titulo}`,
      }, 'Sem valor');
    } else if (i.nota === null) {
      direita = el('button', {
        class: 'item__acao', type: 'button', onclick: () => abrirNota(i), 'aria-label': `Lançar nota de ${i.titulo}`,
      }, 'Lançar nota');
    } else {
      direita = el('button', {
        class: 'nota-item__nota', type: 'button', onclick: () => abrirNota(i),
        'aria-label': `Editar nota de ${i.titulo}: ${pts(i.nota)}`,
      }, pts(i.nota));
    }
    return el('li', { class: 'nota-item' },
      el('div', { class: 'nota-item__info' },
        el('span', { class: 'nota-item__titulo' }, i.titulo,
          i.simulado ? el('span', { class: 'etiqueta' }, 'Bônus') : null),
        vale),
      direita);
  }

  function card(m) {
    const r = resumoMateria(m);
    const filhos = [
      el('div', { class: 'nota-card__topo' },
        el('h3', { class: 'nota-card__nome' }, m.nome),
        r.configurada ? el('span', { class: 'nota-card__min' }, `mínimo ${pts(m.notaMinima)} / ${pts(m.notaTotal)}`) : null),
    ];
    if (r.configurada) {
      filhos.push(linhaPontos(m, r), barra(m, r),
        el('p', { class: 'nota-card__jogo' }, `Em jogo: ${rotuloPontos(r.emJogo)}`));
      if (r.excedeTotal) {
        filhos.push(el('p', { class: 'nota-aviso' }, icone('alerta'),
          `Os valores somam ${pts(r.distribuidos)}, mais que o total de ${pts(m.notaTotal)}.`));
      }
    } else {
      filhos.push(el('p', { class: 'nota-aviso' }, icone('alerta'), 'Defina o mínimo e o total. ',
        el('a', { href: 'materias.html' }, 'Ir para Matérias')));
    }
    filhos.push(r.concluidos.length
      ? el('ul', { class: 'nota-itens' }, ...r.concluidos.map((i) => linhaItem(m, i)))
      : el('p', { class: 'nota-card__vazio' }, 'Nenhuma prova ou trabalho concluído ainda.'));
    return el('li', { class: 'nota-card', style: `--cor:${m.cor}` }, ...filhos);
  }

  function render() {
    const painel = $('painel');
    if (!estado.materias.length) {
      painel.replaceChildren(el('div', { class: 'estado' }, icone('livro'), el('p', {}, 'Nenhuma matéria cursando.'),
        el('a', { class: 'btn', href: 'materias.html' }, 'Ir para Matérias')));
      return;
    }
    painel.replaceChildren(el('ul', { class: 'lista-notas' }, ...estado.materias.map(card)));
  }

  function renderErro(msg) {
    $('painel').replaceChildren(el('div', { class: 'estado estado--erro' }, icone('alerta'), el('p', {}, msg),
      el('button', { class: 'btn', type: 'button', onclick: carregar }, 'Tentar de novo')));
  }

  async function carregar() {
    if (!estado.carregado) $('painel').replaceChildren(el('div', { class: 'estado' }, el('p', {}, 'Carregando...')));
    try {
      const materias = await apiFetch('/api/notas');
      const primeira = !estado.carregado;
      Object.assign(estado, { materias, carregado: true });
      render();
      if (primeira) animarEntrada(document.querySelectorAll('#painel .nota-card'));
    } catch (e) {
      estado.carregado = false;
      renderErro(e.message);
    }
  }

  // ---------- folha de nota ----------
  function abrirNota(item) {
    estado.item = item;
    const form = $('form-nota');
    form.reset();
    $('nota-erro').hidden = true;
    $('nota-titulo').textContent = item.titulo;
    $('nota-vale').textContent = `vale ${pts(item.valor)}${item.simulado ? ' · bônus' : ''}`;
    form.nota.max = String(item.valor);
    form.nota.value = item.nota === null ? '' : String(item.nota);
    $('btn-remover-nota').hidden = item.nota === null;
    $('dlg-nota').showModal();
    form.nota.focus();
  }

  async function salvarNota(nota) {
    const item = estado.item;
    const dlg = $('dlg-nota');
    const botoes = [$('btn-salvar-nota'), $('btn-remover-nota')];
    dlg.setAttribute('data-travado', '');
    botoes.forEach((b) => { b.disabled = true; });
    try {
      await apiFetch(`${URL_TIPO[item.tipo]}/${item.id}`, { method: 'PATCH', body: { nota } });
      dlg.removeAttribute('data-travado');
      dlg.close();
      toast(nota === null ? 'Nota removida.' : 'Nota salva.');
      await carregar();
    } catch (err) {
      $('nota-erro').textContent = err.message;
      $('nota-erro').hidden = false;
      // o item pode ter mudado em outra aba (apagado, desmarcado): atualiza os cards por trás da folha
      carregar();
    } finally {
      dlg.removeAttribute('data-travado');
      botoes.forEach((b) => { b.disabled = false; });
    }
  }

  $('form-nota').addEventListener('submit', (e) => {
    e.preventDefault();
    const bruto = e.target.nota.value;
    const nota = bruto === '' ? NaN : Number(bruto);
    const valor = estado.item.valor;
    if (!Number.isFinite(nota) || nota < 0 || nota > valor) {
      $('nota-erro').textContent = `A nota deve ser de 0 a ${pts(valor)}.`;
      $('nota-erro').hidden = false;
      return;
    }
    salvarNota(nota);
  });
  $('btn-remover-nota').addEventListener('click', () => salvarNota(null));

  // ---------- início ----------
  ligarDialogs();
  carregar();
})();
