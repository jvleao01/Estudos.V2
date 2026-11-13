/* Funções puras da página Matérias (sem DOM). */
(function (root) {
  function semestreAtual(data) {
    return `${data.getFullYear()}.${data.getMonth() < 6 ? 1 : 2}`;
  }

  function agruparPorSemestre(materias) {
    const grupos = new Map();
    for (const m of materias) {
      if (!grupos.has(m.semestre)) grupos.set(m.semestre, []);
      grupos.get(m.semestre).push(m);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
      .map(([semestre, lista]) => ({ semestre, materias: lista }));
  }

  function formatarDataCurta(iso) {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  function rotuloTrabalhos(total, pendentes) {
    if (total === 0) return 'Nenhum trabalho';
    if (pendentes === 0) return total === 1 ? '1 (entregue)' : `${total} (todos entregues)`;
    return `${total} (${pendentes} ${pendentes === 1 ? 'pendente' : 'pendentes'})`;
  }

  const api = { semestreAtual, agruparPorSemestre, formatarDataCurta, rotuloTrabalhos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
