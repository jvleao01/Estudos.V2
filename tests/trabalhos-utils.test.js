const test = require('node:test');
const assert = require('node:assert');
const { diasAte, seloPrazo, separarConcluidos } = require('../frontend/assets/js/trabalhos-utils.js');

// 23h30: pega erros de fuso (parse UTC) e de arredondamento.
const hoje = new Date(2026, 10, 13, 23, 30);

test('diasAte conta dias de calendário a partir de hoje', () => {
  assert.strictEqual(diasAte('2026-11-13', hoje), 0);
  assert.strictEqual(diasAte('2026-11-14', hoje), 1);
  assert.strictEqual(diasAte('2026-11-12', hoje), -1);
  assert.strictEqual(diasAte('2026-12-13', hoje), 30);
});

test('seloPrazo: futuro e hoje', () => {
  assert.deepStrictEqual(seloPrazo(0, 'prova'), { texto: 'Hoje', urgente: true });
  assert.deepStrictEqual(seloPrazo(1, 'trabalho'), { texto: 'Amanhã', urgente: true });
  assert.deepStrictEqual(seloPrazo(7, 'trabalho'), { texto: 'Faltam 7 dias', urgente: true });
  assert.deepStrictEqual(seloPrazo(8, 'prova'), { texto: 'Faltam 8 dias', urgente: false });
});

test('seloPrazo: vencido, com singular', () => {
  assert.deepStrictEqual(seloPrazo(-1, 'trabalho'), { texto: 'Atrasado há 1 dia', urgente: true });
  assert.deepStrictEqual(seloPrazo(-3, 'trabalho'), { texto: 'Atrasado há 3 dias', urgente: true });
  assert.deepStrictEqual(seloPrazo(-1, 'prova'), { texto: 'Passou há 1 dia', urgente: true });
  assert.deepStrictEqual(seloPrazo(-3, 'prova'), { texto: 'Passou há 3 dias', urgente: true });
});

test('separarConcluidos preserva a ordem', () => {
  const p1 = { id: 1, concluido: false };
  const c1 = { id: 2, concluido: true };
  const p2 = { id: 3, concluido: false };
  assert.deepStrictEqual(separarConcluidos([p1, c1, p2]), { pendentes: [p1, p2], concluidos: [c1] });
});
