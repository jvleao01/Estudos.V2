const test = require('node:test');
const assert = require('node:assert');
const {
  formatMinutos, rankMaterias, proximasProvas, rotuloDias, totalMinutos,
} = require('../frontend/assetes/js/dashboard-utils.js');
const { getDashboardData } = require('../frontend/assetes/js/data.js');

test('formatMinutos', () => {
  assert.strictEqual(formatMinutos(0), '0min');
  assert.strictEqual(formatMinutos(45), '45min');
  assert.strictEqual(formatMinutos(90), '1h 30min');
  assert.strictEqual(formatMinutos(120), '2h');
});

test('rankMaterias ordena decrescente e preserva empate', () => {
  const m = [
    { id: 1, minutosSemana: 30 },
    { id: 2, minutosSemana: 60 },
    { id: 3, minutosSemana: 30 },
  ];
  assert.deepStrictEqual(rankMaterias(m).map((x) => x.id), [2, 1, 3]);
  assert.deepStrictEqual(m.map((x) => x.id), [1, 2, 3], 'não muta a entrada');
});

test('proximasProvas descarta passadas, ordena e marca urgente', () => {
  const materias = [{ id: 1, nome: 'Cálculo', cor: '#f00', minutosSemana: 0 }];
  const provas = [
    { materiaId: 1, titulo: 'P4', data: '2026-11-17' },
    { materiaId: 1, titulo: 'Passada', data: '2026-11-12' },
    { materiaId: 1, titulo: 'P3', data: '2026-11-16' },
    { materiaId: 1, titulo: 'Hoje', data: '2026-11-13' },
  ];
  const r = proximasProvas(provas, materias, new Date(2026, 10, 13, 22, 30));
  assert.deepStrictEqual(r.map((p) => p.titulo), ['Hoje', 'P3', 'P4']);
  assert.deepStrictEqual(r.map((p) => p.diasRestantes), [0, 3, 4]);
  assert.deepStrictEqual(r.map((p) => p.urgente), [true, true, false]);
  assert.strictEqual(r[0].materia.nome, 'Cálculo');
});

test('proximasProvas respeita limite e lista vazia', () => {
  assert.deepStrictEqual(proximasProvas([], [], new Date(2026, 10, 13)), []);
  const provas = Array.from({ length: 8 }, (_, i) => ({ materiaId: 1, titulo: `P${i}`, data: '2026-12-01' }));
  assert.strictEqual(proximasProvas(provas, [{ id: 1 }], new Date(2026, 10, 13)).length, 5);
});

test('rotuloDias', () => {
  assert.strictEqual(rotuloDias(0), 'Hoje');
  assert.strictEqual(rotuloDias(1), 'Amanhã');
  assert.strictEqual(rotuloDias(5), 'em 5 dias');
});

test('totalMinutos', () => {
  assert.strictEqual(totalMinutos([]), 0);
  assert.strictEqual(totalMinutos([{ minutosSemana: 30 }, { minutosSemana: 45 }]), 75);
});

test('getDashboardData segue o contrato', () => {
  const d = getDashboardData();
  assert.strictEqual(d.materias.length, 6);
  assert.strictEqual(d.porDia.length, 7);
  assert.strictEqual(d.provas.length, 4);
  for (const m of d.materias) assert.match(m.cor, /^#[0-9a-f]{6}$/i);
  assert.strictEqual(new Set(d.materias.map((m) => m.cor)).size, 6, 'cores únicas');
});
