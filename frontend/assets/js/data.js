/*
 * Fonte de dados do Dashboard.
 * Hoje: dados de exemplo. Depois: trocar o corpo de getDashboardData() por
 * um fetch('/api/dashboard') que devolva exatamente este mesmo formato.
 */
(function (root) {
  function isoLocal(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function diasAPartirDeHoje(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return isoLocal(d);
  }

  function semanaAtual() {
    const hoje = new Date();
    const offset = (hoje.getDay() + 6) % 7; // segunda = 0
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - offset);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
    return { inicio: isoLocal(inicio), fim: isoLocal(fim) };
  }

  function getDashboardData() {
    return {
      semana: semanaAtual(),
      materias: [
        { id: 1, nome: 'Cálculo', cor: '#6c8cff', minutosSemana: 380 },
        { id: 2, nome: 'Física', cor: '#2ec4b6', minutosSemana: 265 },
        { id: 3, nome: 'Programação', cor: '#f4a261', minutosSemana: 310 },
        { id: 4, nome: 'Química', cor: '#e76f9a', minutosSemana: 150 },
        { id: 5, nome: 'Inglês', cor: '#b388ff', minutosSemana: 95 },
        { id: 6, nome: 'História', cor: '#e9c46a', minutosSemana: 60 },
      ],
      porDia: [
        { dia: 'Seg', minutos: 180 },
        { dia: 'Ter', minutos: 210 },
        { dia: 'Qua', minutos: 120 },
        { dia: 'Qui', minutos: 240 },
        { dia: 'Sex', minutos: 150 },
        { dia: 'Sáb', minutos: 260 },
        { dia: 'Dom', minutos: 100 },
      ],
      provas: [
        { materiaId: 1, titulo: 'P2 de Cálculo', data: diasAPartirDeHoje(2) },
        { materiaId: 2, titulo: 'Prova de Física', data: diasAPartirDeHoje(6) },
        { materiaId: 3, titulo: 'Avaliação prática', data: diasAPartirDeHoje(11) },
        { materiaId: 4, titulo: 'Química orgânica', data: diasAPartirDeHoje(18) },
      ],
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { getDashboardData };
  else root.getDashboardData = getDashboardData;
})(typeof window !== 'undefined' ? window : globalThis);
