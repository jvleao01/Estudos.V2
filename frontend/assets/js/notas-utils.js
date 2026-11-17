/* Funções puras da página Notas (sem DOM). Contas em décimos inteiros para evitar erro de ponto flutuante. */
(function (root) {
  const d = (n) => Math.round(n * 10); // pontos -> décimos
  const p = (n) => n / 10; // décimos -> pontos

  // Recebe uma matéria de /api/notas e devolve os números do card.
  function resumoMateria(materia) {
    const configurada = materia.notaMinima !== null && materia.notaTotal !== null;
    let obtidos = 0; let bonus = 0; let emJogo = 0; let distribuidos = 0;
    for (const i of materia.itens) {
      const nota = i.concluido ? i.nota : null; // nota de item desmarcado não conta
      if (nota !== null) {
        if (i.simulado) bonus += d(nota);
        else obtidos += d(nota);
      }
      if (i.simulado || i.valor === null) continue;
      distribuidos += d(i.valor);
      if (nota === null) emJogo += d(i.valor);
    }
    let final = obtidos + bonus;
    let falta = null; let situacao = null; let excedeTotal = false;
    if (configurada) {
      const minimo = d(materia.notaMinima); const total = d(materia.notaTotal);
      final = Math.min(final, total);
      falta = Math.max(minimo - final, 0);
      if (final >= minimo) situacao = 'aprovado';
      else if (falta > emJogo) situacao = 'impossivel';
      else situacao = 'falta';
      excedeTotal = distribuidos > total;
      falta = p(falta);
    }
    return {
      configurada,
      obtidos: p(obtidos), bonus: p(bonus), final: p(final), falta,
      emJogo: p(emJogo), distribuidos: p(distribuidos), excedeTotal, situacao,
      concluidos: materia.itens.filter((i) => i.concluido),
    };
  }

  function formatarPontos(n) {
    return String(p(d(n))).replace('.', ',');
  }

  function textoSituacao(resumo) {
    if (!resumo.configurada) return null;
    if (resumo.situacao === 'aprovado') return { texto: 'Aprovado', classe: 'ok' };
    if (resumo.situacao === 'impossivel') return { texto: 'Não dá mais', classe: 'perigo' };
    const n = formatarPontos(resumo.falta);
    return { texto: resumo.falta < 2 ? `Falta ${n} ponto` : `Faltam ${n} pontos`, classe: 'neutro' };
  }

  const api = { resumoMateria, formatarPontos, textoSituacao };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
