const test = require('node:test');
const assert = require('node:assert');
const {
  decorridoMs, arredondarMinutos, formatarRelogio, dataHoraLocalISO, dataLocalISO,
} = require('../frontend/assets/js/cronometro-utils.js');

const S = 1000;
const MIN = 60 * S;

test('decorridoMs soma o acumulado com o trecho rodando', () => {
  assert.strictEqual(decorridoMs({ acumuladoMs: 0, inicioTrecho: 1000 }, 61000), 60000);
  assert.strictEqual(decorridoMs({ acumuladoMs: 5000, inicioTrecho: 10000 }, 12000), 7000);
});

test('decorridoMs pausado ignora o relógio', () => {
  assert.strictEqual(decorridoMs({ acumuladoMs: 5000, inicioTrecho: null }, 999999), 5000);
});

test('arredondarMinutos vai ao minuto mais próximo', () => {
  assert.strictEqual(arredondarMinutos(0), 0);
  assert.strictEqual(arredondarMinutos(29 * S), 0);
  assert.strictEqual(arredondarMinutos(30 * S), 1);
  assert.strictEqual(arredondarMinutos(55 * MIN + 54 * S), 56);
  assert.strictEqual(arredondarMinutos(90 * MIN), 90);
});

test('formatarRelogio', () => {
  assert.strictEqual(formatarRelogio(0), '00:00:00');
  assert.strictEqual(formatarRelogio(999), '00:00:00');
  assert.strictEqual(formatarRelogio(55 * MIN + 54 * S), '00:55:54');
  assert.strictEqual(formatarRelogio(90 * MIN), '01:30:00');
  assert.strictEqual(formatarRelogio(100 * 60 * MIN), '100:00:00');
});

test('datas locais em ISO', () => {
  assert.strictEqual(dataHoraLocalISO(new Date(2026, 0, 5, 7, 3, 9)), '2026-01-05T07:03:09');
  assert.strictEqual(dataLocalISO(new Date(2026, 10, 13, 23, 59)), '2026-11-13');
});
