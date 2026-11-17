/* Funções puras da página Calendário (sem DOM). Datas sempre locais; ISO 'AAAA-MM-DD' montado à mão. */
(function (root) {
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const doisDigitos = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
  function deIso(s) {
    const [a, m, d] = s.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function somarDias(s, n) {
    const d = deIso(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  // Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano).
  function pascoa(ano) {
    const a = ano % 19; const b = Math.floor(ano / 100); const c = ano % 100;
    const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31); const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
  }

  // Feriados nacionais (fixos e móveis) e municipais de Belo Horizonte.
  function feriados(ano) {
    const f = new Map();
    const fixos = [
      ['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'],
      ['08-15', 'Assunção de Nossa Senhora'], ['09-07', 'Independência'], ['10-12', 'Nossa Senhora Aparecida'],
      ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'],
      ['12-08', 'Imaculada Conceição'], ['12-25', 'Natal'],
    ];
    for (const [md, nome] of fixos) f.set(`${ano}-${md}`, nome);
    // Feriado móvel que cai num fixo (ex.: Sexta-feira Santa em 21/04/2000) junta os nomes.
    const juntar = (data, nome) => f.set(data, f.has(data) ? `${f.get(data)} · ${nome}` : nome);
    const p = pascoa(ano);
    juntar(somarDias(p, -48), 'Carnaval');
    juntar(somarDias(p, -47), 'Carnaval');
    juntar(somarDias(p, -2), 'Sexta-feira Santa');
    juntar(somarDias(p, 60), 'Corpus Christi');
    return f;
  }

  // Semanas de domingo a sábado; posições fora do mês são null. mes: 1-12.
  function gradeDoMes(ano, mes) {
    const semanas = [];
    let semana = new Array(new Date(ano, mes - 1, 1).getDay()).fill(null);
    const total = new Date(ano, mes, 0).getDate();
    for (let dia = 1; dia <= total; dia += 1) {
      semana.push(`${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`);
      if (semana.length === 7) { semanas.push(semana); semana = []; }
    }
    if (semana.length) semanas.push(semana.concat(new Array(7 - semana.length).fill(null)));
    return semanas;
  }

  // Monta cada dia do mês: feriado, aulas (com desmarcada), provas e trabalhos. dados = resposta de /api/calendario.
  function diasDoMes(ano, mes, dados) {
    const fer = feriados(ano);
    const periodo = new Map(dados.semestres.map((s) => [s.semestre, s]));
    const desmarcadas = new Set(dados.desmarcadas.map((d) => `${d.materiaId}|${d.data}`));
    const dias = new Map();
    for (const data of gradeDoMes(ano, mes).flat().filter(Boolean)) {
      const feriado = fer.get(data) || null;
      const diaSemana = deIso(data).getDay();
      const aulas = feriado ? [] : dados.aulas
        .filter((a) => {
          const s = periodo.get(a.semestre);
          return s && data >= s.inicio && data <= s.fim && a.dias.includes(diaSemana);
        })
        .map((a) => ({
          materiaId: a.materiaId, nome: a.nome, cor: a.cor, desmarcada: desmarcadas.has(`${a.materiaId}|${data}`),
        }));
      dias.set(data, {
        feriado,
        aulas,
        provas: dados.provas.filter((p) => p.data === data),
        trabalhos: dados.trabalhos.filter((t) => t.data === data),
      });
    }
    return dias;
  }

  function mesVizinho(mes, delta) {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`;
  }

  function rotuloMes(mes) {
    const [a, m] = mes.split('-').map(Number);
    return `${MESES[m - 1]} ${a}`;
  }

  function rotuloDia(data) {
    const [, m, d] = data.split('-');
    return `${DIAS[deIso(data).getDay()]}, ${d}/${m}`;
  }

  const api = { pascoa, feriados, gradeDoMes, diasDoMes, mesVizinho, rotuloMes, rotuloDia, MESES, DIAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
