/* Funções puras de derivação do Dashboard (sem DOM). */
(function (root) {
  const MS_DIA = 24 * 60 * 60 * 1000;

  function formatMinutos(min) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }

  function totalMinutos(materias) {
    return materias.reduce((soma, m) => soma + (m.minutosSemana || 0), 0);
  }

  // Array.prototype.sort é estável (ES2019+): empates mantêm a ordem original.
  function rankMaterias(materias) {
    return [...materias].sort((a, b) => b.minutosSemana - a.minutosSemana);
  }

  // "YYYY-MM-DD" -> Date local à meia-noite (evita deslocamento de fuso do parse UTC).
  function parseDataLocal(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function inicioDoDia(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function proximasProvas(provas, materias, hoje, limite = 5) {
    const base = inicioDoDia(hoje);
    const porId = new Map(materias.map((m) => [m.id, m]));
    return provas
      .map((p) => {
        const data = parseDataLocal(p.data);
        const diasRestantes = Math.round((data - base) / MS_DIA);
        return {
          titulo: p.titulo,
          data,
          materia: porId.get(p.materiaId) || p.materia || null, // matéria sem tempo na semana vem na própria prova
          diasRestantes,
          urgente: diasRestantes <= 3,
        };
      })
      .filter((p) => p.diasRestantes >= 0)
      .sort((a, b) => a.data - b.data)
      .slice(0, limite);
  }

  function rotuloDias(dias) {
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Amanhã';
    return `em ${dias} dias`;
  }

  const api = { formatMinutos, totalMinutos, rankMaterias, proximasProvas, rotuloDias, parseDataLocal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
