const test = require('node:test');
const assert = require('node:assert');
const {
  semestreAtual, agruparPorSemestre, formatarDataCurta, rotuloTrabalhos,
} = require('../frontend/assets/js/materias-utils.js');

test('semestreAtual', () => {
  assert.strictEqual(semestreAtual(new Date(2026, 0, 1)), '2026.1');
  assert.strictEqual(semestreAtual(new Date(2026, 5, 30)), '2026.1');
  assert.strictEqual(semestreAtual(new Date(2026, 6, 1)), '2026.2');
  assert.strictEqual(semestreAtual(new Date(2026, 11, 31)), '2026.2');
});

test('agruparPorSemestre ordena semestres desc e mantém ordem interna', () => {
  const g = agruparPorSemestre([
    { nome: 'A', semestre: '2025.1' },
    { nome: 'B', semestre: '2026.1' },
    { nome: 'C', semestre: '2025.2' },
    { nome: 'D', semestre: '2026.1' },
  ]);
  assert.deepStrictEqual(g.map((x) => x.semestre), ['2026.1', '2025.2', '2025.1']);
  assert.deepStrictEqual(g[0].materias.map((m) => m.nome), ['B', 'D']);
  assert.deepStrictEqual(agruparPorSemestre([]), []);
});

test('formatarDataCurta', () => {
  assert.strictEqual(formatarDataCurta('2026-11-18'), '18/11');
  assert.strictEqual(formatarDataCurta('2027-01-05'), '05/01');
});

test('rotuloTrabalhos', () => {
  assert.strictEqual(rotuloTrabalhos(0, 0), 'Nenhum trabalho');
  assert.strictEqual(rotuloTrabalhos(3, 1), '3 (1 pendente)');
  assert.strictEqual(rotuloTrabalhos(3, 2), '3 (2 pendentes)');
  assert.strictEqual(rotuloTrabalhos(2, 0), '2 (todos entregues)');
  assert.strictEqual(rotuloTrabalhos(1, 0), '1 (entregue)');
});
