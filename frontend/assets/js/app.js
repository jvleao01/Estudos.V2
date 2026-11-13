/* Renderização do Dashboard. Depende de: Chart.js, AOS (opcional), animacoes.js, api.js, data.js, dashboard-utils.js */
(function () {
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MSG_VAZIO = 'Nenhum estudo registrado nesta semana';

  const css = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

  function el(tag, attrs = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else n.setAttribute(k, v);
    }
    for (const f of filhos) n.append(f);
    return n;
  }

  function mostrarVazio(container, msg) {
    const tag = /^(UL|OL)$/.test(container.tagName) ? 'li' : 'div';
    container.replaceChildren(el(tag, { class: 'vazio' }, msg));
  }

  function configurarChartJs() {
    Chart.defaults.color = css('--muted');
    Chart.defaults.borderColor = css('--borda');
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.plugins.tooltip.backgroundColor = css('--surface-2');
    Chart.defaults.plugins.tooltip.titleColor = css('--text');
    Chart.defaults.plugins.tooltip.bodyColor = css('--text');
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  const eixoHoras = (v) => (v % 60 === 0 ? `${v / 60}h` : '');

  function renderCabecalho(semana, total) {
    const i = parseDataLocal(semana.inicio);
    const f = parseDataLocal(semana.fim);
    const mesmoMes = i.getMonth() === f.getMonth();
    document.getElementById('semana-label').textContent = mesmoMes
      ? `Semana de ${i.getDate()} a ${f.getDate()} de ${MESES[f.getMonth()]}`
      : `Semana de ${i.getDate()} ${MESES[i.getMonth()]} a ${f.getDate()} ${MESES[f.getMonth()]}`;
    document.getElementById('total-semana').textContent = formatMinutos(total);
  }

  function renderBarras(ranking, total) {
    const wrap = document.getElementById('wrap-materias');
    if (total === 0) return mostrarVazio(wrap, MSG_VAZIO);
    new Chart(document.getElementById('chart-materias'), {
      type: 'bar',
      data: {
        labels: ranking.map((m) => m.nome),
        datasets: [{
          data: ranking.map((m) => m.minutosSemana),
          backgroundColor: ranking.map((m) => m.cor),
          borderRadius: 6,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${formatMinutos(c.raw)}` } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 60, callback: eixoHoras }, grid: { color: css('--borda') } },
          y: { grid: { display: false }, ticks: { color: css('--text') } },
        },
      },
    });
  }

  function renderLinha(porDia) {
    const wrap = document.getElementById('wrap-dias');
    if (porDia.every((d) => !d.minutos)) return mostrarVazio(wrap, MSG_VAZIO);
    const canvas = document.getElementById('chart-dias');
    const accent = css('--accent');
    const grad = canvas.getContext('2d').createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, accent + '55');
    grad.addColorStop(1, accent + '00');
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: porDia.map((d) => d.dia),
        datasets: [{
          data: porDia.map((d) => d.minutos),
          borderColor: accent,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: accent,
          pointBorderColor: css('--surface'),
          pointBorderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${formatMinutos(c.raw)}` } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 60, callback: eixoHoras }, grid: { color: css('--borda') } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function renderPizza(materias, total) {
    const wrap = document.getElementById('wrap-pizza');
    const comTempo = materias.filter((m) => m.minutosSemana > 0);
    if (total === 0) return mostrarVazio(wrap, MSG_VAZIO);
    new Chart(document.getElementById('chart-pizza'), {
      type: 'doughnut',
      data: {
        labels: comTempo.map((m) => m.nome),
        datasets: [{
          data: comTempo.map((m) => m.minutosSemana),
          backgroundColor: comTempo.map((m) => m.cor),
          borderColor: css('--surface'),
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, color: css('--text') },
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${formatMinutos(c.raw)} · ${Math.round((c.raw / total) * 100)}%`,
            },
          },
        },
      },
    });
  }

  function renderProvas(provas, materias) {
    const lista = document.getElementById('lista-provas');
    const proximas = proximasProvas(provas, materias, new Date());
    if (proximas.length === 0) return mostrarVazio(lista, 'Nenhuma prova próxima');
    lista.replaceChildren(...proximas.map((p) => {
      const cor = p.materia ? p.materia.cor : css('--accent');
      return el('li', { class: `prova${p.urgente ? ' urgente' : ''}` },
        el('div', { class: 'prova__data' },
          el('span', { class: 'prova__dia' }, String(p.data.getDate()).padStart(2, '0')),
          el('span', { class: 'prova__mes' }, MESES[p.data.getMonth()])),
        el('div', { class: 'prova__info' },
          el('p', { class: 'prova__titulo' }, p.titulo),
          el('p', { class: 'prova__materia' },
            el('span', { class: 'ponto', style: `--cor:${cor}` }),
            p.materia ? p.materia.nome : 'Sem matéria')),
        el('span', { class: 'prova__faltam' }, rotuloDias(p.diasRestantes)));
    }));
  }

  function renderRanking(ranking, total) {
    const lista = document.getElementById('lista-ranking');
    if (total === 0) return mostrarVazio(lista, MSG_VAZIO);
    const max = ranking[0].minutosSemana;
    lista.replaceChildren(...ranking.map((m, i) => el('li', { class: 'ranking__item' },
      el('span', { class: 'ranking__pos' }, `${i + 1}º`),
      el('span', { class: 'ranking__nome' }, m.nome),
      el('span', { class: 'ranking__tempo' }, formatMinutos(m.minutosSemana)),
      el('div', { class: 'ranking__barra' },
        el('span', { style: `--cor:${m.cor};width:${(m.minutosSemana / max) * 100}%` })))));
  }

  function renderDashboard(data) {
    const total = totalMinutos(data.materias);
    const ranking = rankMaterias(data.materias);
    renderCabecalho(data.semana, total);
    renderProvas(data.provas, data.materias);
    renderRanking(ranking, total);
    if (typeof Chart === 'undefined') {
      ['wrap-materias', 'wrap-dias', 'wrap-pizza'].forEach((id) =>
        mostrarVazio(document.getElementById(id), 'Não foi possível carregar os gráficos (sem internet?)'));
      return;
    }
    configurarChartJs();
    renderBarras(ranking, total);
    renderLinha(data.porDia);
    renderPizza(data.materias, total);
  }

  function renderErro(msg) {
    document.getElementById('total-semana').textContent = '—';
    for (const id of ['wrap-materias', 'lista-provas', 'wrap-dias', 'lista-ranking', 'wrap-pizza']) {
      mostrarVazio(document.getElementById(id), msg);
    }
  }

  window.renderDashboard = renderDashboard;
  // Espera a fonte carregar: o Chart.js mede os rótulos no momento do desenho.
  document.addEventListener('DOMContentLoaded', async () => {
    animarEntrada(document.querySelectorAll('.dashboard > .card'));
    const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
    try {
      const [data] = await Promise.all([getDashboardData(), fontes]);
      renderDashboard(data);
    } catch (e) {
      renderErro(e.message);
    }
  });
})();
