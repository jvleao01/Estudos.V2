/* Funções puras do Cronômetro (sem DOM). */
(function (root) {
  const dois = (n) => String(n).padStart(2, '0');

  // Tempo da sessão: acumulado das partes anteriores + trecho atual (se estiver rodando).
  // Medido pelo relógio, então não atrasa com a aba em segundo plano.
  function decorridoMs({ acumuladoMs, inicioTrecho }, agora) {
    return acumuladoMs + (inicioTrecho === null ? 0 : agora - inicioTrecho);
  }

  function arredondarMinutos(ms) {
    return Math.round(ms / 60000);
  }

  function formatarRelogio(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${dois(h)}:${dois(m)}:${dois(total % 60)}`;
  }

  function dataLocalISO(d) {
    return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
  }

  function dataHoraLocalISO(d) {
    return `${dataLocalISO(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
  }

  const api = { decorridoMs, arredondarMinutos, formatarRelogio, dataHoraLocalISO, dataLocalISO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
