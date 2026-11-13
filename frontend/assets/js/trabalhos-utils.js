/* Funções puras da página Trabalhos e Provas (sem DOM). No navegador, depende de dashboard-utils.js. */
(function (root) {
  const MS_DIA = 24 * 60 * 60 * 1000;
  const LIMITE_URGENTE = 7;
  const { parseDataLocal } = typeof module !== 'undefined' && module.exports
    ? require('./dashboard-utils.js')
    : root;

  // Dias de calendário entre hoje e a data (negativo se já passou). Math.round absorve horário de verão.
  function diasAte(iso, hoje) {
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return Math.round((parseDataLocal(iso) - base) / MS_DIA);
  }

  function seloPrazo(dias, tipo) {
    const urgente = dias <= LIMITE_URGENTE;
    if (dias === 0) return { texto: 'Hoje', urgente };
    if (dias === 1) return { texto: 'Amanhã', urgente };
    if (dias > 1) return { texto: `Faltam ${dias} dias`, urgente };
    const n = -dias;
    const prefixo = tipo === 'prova' ? 'Passou há' : 'Atrasado há';
    return { texto: `${prefixo} ${n} ${n === 1 ? 'dia' : 'dias'}`, urgente };
  }

  function separarConcluidos(itens) {
    return {
      pendentes: itens.filter((i) => !i.concluido),
      concluidos: itens.filter((i) => i.concluido),
    };
  }

  const api = { diasAte, seloPrazo, separarConcluidos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
