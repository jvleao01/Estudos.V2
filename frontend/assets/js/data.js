/*
 * Fonte de dados do Dashboard: /api/dashboard (sessões do Cronômetro + provas pendentes).
 * Formato: { semana: {inicio, fim}, materias: [{id, nome, cor, minutosSemana}],
 *            porDia: [{dia, minutos}] (Seg..Dom), provas: [{materiaId, titulo, data, materia: {nome, cor}}] }
 * No navegador depende de api.js (apiFetch).
 */
(function (root) {
  const p2 = (n) => String(n).padStart(2, '0');

  // Segunda-feira da semana de `hoje`, pela data local, em AAAA-MM-DD.
  function segundaFeira(hoje) {
    const offset = (hoje.getDay() + 6) % 7; // segunda = 0
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - offset);
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  }

  function getDashboardData(hoje = new Date()) {
    return apiFetch(`/api/dashboard?inicio=${segundaFeira(hoje)}`);
  }

  const api = { segundaFeira, getDashboardData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
