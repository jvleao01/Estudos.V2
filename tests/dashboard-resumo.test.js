const test = require('node:test');
const assert = require('node:assert');
const { notasPorFalta, mesesDaSemana, diasDaSemana } = require('../frontend/assets/js/dashboard-resumo.js');

let seq = 0;
const item = (valor, nota, concluido = true) => {
  seq += 1;
  return { id: seq, tipo: 'prova', titulo: `I${seq}`, data: '2026-11-01', valor, nota, simulado: false, concluido };
};
const materia = (nome, notaMinima, itens, notaTotal = 100) => ({ id: nome.length, nome, cor: '#fff', notaMinima, notaTotal, itens });

test('notasPorFalta: quem precisa de mais pontos no topo, aprovadas no fim', () => {
  const r = notasPorFalta([
    materia('Aprovada', 60, [item(70, 65)]),
    materia('Falta 10', 60, [item(50, 50), item(50, null, false)]),
    materia('Falta 40', 60, [item(50, 20), item(50, null, false)]),
    materia('Sem notas', 60, [item(100, null, false)]),
  ]);
  assert.deepStrictEqual(r.linhas.map((l) => l.nome), ['Sem notas', 'Falta 40', 'Falta 10', 'Aprovada']);
  assert.strictEqual(r.linhas[0].resumo.falta, 60);
  assert.strictEqual(r.semValores, 0);
});

test('notasPorFalta: "Não dá mais" ordena pelo que falta e matérias sem mínimo ficam de fora', () => {
  const r = notasPorFalta([
    materia('Impossível', 60, [item(40, 10), item(30, null, false)]),
    materia('Falta 5', 60, [item(55, 55), item(45, null, false)]),
    materia('Sem mínimo', null, [item(10, 5)], null),
  ]);
  assert.deepStrictEqual(r.linhas.map((l) => l.nome), ['Impossível', 'Falta 5']);
  assert.strictEqual(r.linhas[0].resumo.situacao, 'impossivel');
  assert.strictEqual(r.semValores, 1);
});

test('notasPorFalta: empate em ordem alfabética', () => {
  const r = notasPorFalta([materia('B', 60, []), materia('A', 60, [])]);
  assert.deepStrictEqual(r.linhas.map((l) => l.nome), ['A', 'B']);
});

test('mesesDaSemana: um ou dois meses', () => {
  assert.deepStrictEqual(mesesDaSemana('2026-11-16'), ['2026-11']);
  assert.deepStrictEqual(mesesDaSemana('2026-11-30'), ['2026-11', '2026-12']);
  assert.deepStrictEqual(mesesDaSemana('2026-12-28'), ['2026-12', '2027-01']);
});

const vazio = (extra = {}) => ({ semestres: [], semestresDefinidos: [], aulas: [], desmarcadas: [], provas: [], trabalhos: [], ...extra });

test('diasDaSemana: 7 dias de segunda a domingo, juntando dois meses', () => {
  const nov = vazio({
    semestres: [{ semestre: '2026.2', inicio: '2026-08-03', fim: '2026-12-12' }],
    aulas: [{ materiaId: 1, nome: 'Cálculo', cor: '#6c8cff', semestre: '2026.2', dias: [1, 3] }],
  });
  const dez = vazio({
    semestres: [{ semestre: '2026.2', inicio: '2026-08-03', fim: '2026-12-12' }],
    aulas: [{ materiaId: 1, nome: 'Cálculo', cor: '#6c8cff', semestre: '2026.2', dias: [1, 3] }],
    provas: [{ id: 5, materiaId: 1, materia: { nome: 'Cálculo', cor: '#6c8cff' }, titulo: 'P3', data: '2026-12-04', concluido: false, simulado: false }],
  });
  const dias = diasDaSemana('2026-11-30', { '2026-11': nov, '2026-12': dez });
  assert.deepStrictEqual(dias.map((d) => d.data),
    ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
  assert.strictEqual(dias[0].aulas.length, 1); // segunda 30/11
  assert.strictEqual(dias[2].aulas.length, 1); // quarta 02/12
  assert.strictEqual(dias[4].provas[0].titulo, 'P3');
});

test('diasDaSemana: feriado aparece e tira a aula', () => {
  const nov = vazio({
    semestres: [{ semestre: '2026.2', inicio: '2026-08-03', fim: '2026-12-12' }],
    aulas: [{ materiaId: 2, nome: 'Física', cor: '#2ec4b6', semestre: '2026.2', dias: [5] }],
  });
  const sexta = diasDaSemana('2026-11-16', { '2026-11': nov })[4];
  assert.strictEqual(sexta.data, '2026-11-20');
  assert.strictEqual(sexta.feriado, 'Consciência Negra');
  assert.deepStrictEqual(sexta.aulas, []);
});
