/* Funções puras dos cards "Notas" e "Esta semana" do Dashboard (sem DOM).
   Reaproveita as contas das páginas: no navegador depende de notas-utils.js e calendario-utils.js. */
(function (root) {
  const ehNode = typeof module !== 'undefined' && module.exports;
  const { resumoMateria } = ehNode ? require('./notas-utils.js') : root;
  const { diasDoMes } = ehNode ? require('./calendario-utils.js') : root;

  const dd = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  function somarDias(data, n) {
    const [a, m, d] = data.split('-').map(Number);
    return iso(new Date(a, m - 1, d + n));
  }

  // Matérias de /api/notas com mínimo/total definidos, quem precisa de mais pontos primeiro; aprovadas no fim.
  function notasPorFalta(materias) {
    const linhas = [];
    let semValores = 0;
    for (const m of materias) {
      const resumo = resumoMateria(m);
      if (!resumo.configurada) { semValores += 1; continue; }
      linhas.push({ id: m.id, nome: m.nome, cor: m.cor, notaMinima: m.notaMinima, resumo });
    }
    linhas.sort((a, b) => b.resumo.falta - a.resumo.falta || a.nome.localeCompare(b.nome, 'pt-BR'));
    return { linhas, semValores };
  }

  // Meses ('AAAA-MM') que a semana iniciada em `inicio` toca: um ou dois.
  function mesesDaSemana(inicio) {
    const meses = [inicio.slice(0, 7), somarDias(inicio, 6).slice(0, 7)];
    return meses[0] === meses[1] ? [meses[0]] : meses;
  }

  // Os 7 dias (segunda a domingo) com feriado, aulas, provas e trabalhos. porMes: {'AAAA-MM': resposta de /api/calendario}.
  function diasDaSemana(inicio, porMes) {
    const mapas = {};
    for (const [mes, dados] of Object.entries(porMes)) {
      const [a, m] = mes.split('-').map(Number);
      mapas[mes] = diasDoMes(a, m, dados);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const data = somarDias(inicio, i);
      const info = mapas[data.slice(0, 7)].get(data);
      return { data, ...info };
    });
  }

  const api = { notasPorFalta, mesesDaSemana, diasDaSemana };
  if (ehNode) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
