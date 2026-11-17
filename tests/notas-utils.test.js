const test = require('node:test');
const assert = require('node:assert');
const { resumoMateria, formatarPontos, textoSituacao } = require('../frontend/assets/js/notas-utils.js');

let seq = 0;
function item({ tipo = 'prova', valor = 30, nota = null, simulado = false, concluido = true } = {}) {
  seq += 1;
  return { id: seq, tipo, titulo: `I${seq}`, data: '2026-11-01', valor, nota, simulado, concluido };
}
const materia = (itens, notaMinima = 60, notaTotal = 100) => ({ id: 1, nome: 'M', cor: '#fff', notaMinima, notaTotal, itens });

test('obtidos e falta simples', () => {
  const r = resumoMateria(materia([item({ nota: 25 }), item({ tipo: 'trabalho', valor: 20, nota: 18 }), item({ valor: 50, concluido: false })]));
  assert.strictEqual(r.configurada, true);
  assert.strictEqual(r.obtidos, 43);
  assert.strictEqual(r.bonus, 0);
  assert.strictEqual(r.final, 43);
  assert.strictEqual(r.falta, 17);
  assert.strictEqual(r.situacao, 'falta');
});

test('bônus de simulado soma e aprova', () => {
  const r = resumoMateria(materia([item({ valor: 60, nota: 55 }), item({ valor: 10, nota: 8, simulado: true })]));
  assert.strictEqual(r.bonus, 8);
  assert.strictEqual(r.final, 63);
  assert.strictEqual(r.falta, 0);
  assert.strictEqual(r.situacao, 'aprovado');
});

test('bônus limitado ao total', () => {
  const r = resumoMateria(materia([item({ valor: 100, nota: 97 }), item({ valor: 10, nota: 8, simulado: true })]));
  assert.strictEqual(r.final, 100);
});

test('nota de item não concluído é ignorada e o item conta em jogo', () => {
  const r = resumoMateria(materia([item({ nota: 25, concluido: false })]));
  assert.strictEqual(r.obtidos, 0);
  assert.strictEqual(r.emJogo, 30);
  assert.deepStrictEqual(r.concluidos, []);
});

test('em jogo e distribuídos ignoram simulados e itens sem valor', () => {
  const r = resumoMateria(materia([
    item({ concluido: false }),
    item({ nota: null }),
    item({ valor: 10, simulado: true, concluido: false }),
    item({ valor: null, concluido: false }),
    item({ valor: 20, nota: 15 }),
  ]));
  assert.strictEqual(r.emJogo, 60);
  assert.strictEqual(r.distribuidos, 80);
  assert.strictEqual(r.excedeTotal, false);
});

test('impossível quando falta mais do que está em jogo', () => {
  const r = resumoMateria(materia([item({ valor: 40, nota: 20 }), item({ valor: 30, concluido: false })]));
  assert.strictEqual(r.falta, 40);
  assert.strictEqual(r.emJogo, 30);
  assert.strictEqual(r.situacao, 'impossivel');
});

test('aprovado tem prioridade sobre impossível', () => {
  const r = resumoMateria(materia([item({ valor: 50, nota: 50 }), item({ valor: 10, nota: 10, simulado: true })]));
  assert.strictEqual(r.emJogo, 0);
  assert.strictEqual(r.situacao, 'aprovado');
});

test('excedeTotal quando os valores passam do total', () => {
  const r = resumoMateria(materia([item({ valor: 60, concluido: false }), item({ valor: 50, concluido: false })]));
  assert.strictEqual(r.distribuidos, 110);
  assert.strictEqual(r.excedeTotal, true);
});

test('matéria sem mínimo e total', () => {
  const r = resumoMateria(materia([item({ nota: 20 }), item({ valor: 10, nota: 5, simulado: true })], null, null));
  assert.strictEqual(r.configurada, false);
  assert.strictEqual(r.obtidos, 20);
  assert.strictEqual(r.final, 25);
  assert.strictEqual(r.falta, null);
  assert.strictEqual(r.situacao, null);
  assert.strictEqual(r.excedeTotal, false);
});

test('decimais sem erro de ponto flutuante', () => {
  const r = resumoMateria(materia([item({ valor: 1, nota: 0.1 }), item({ valor: 1, nota: 0.2 })], 0.5, 2));
  assert.strictEqual(r.obtidos, 0.3);
  assert.strictEqual(r.falta, 0.2);
});

test('concluidos na ordem recebida', () => {
  const a = item({ nota: 1 }); const b = item({ concluido: false }); const c = item();
  assert.deepStrictEqual(resumoMateria(materia([a, b, c])).concluidos, [a, c]);
});

test('formatarPontos', () => {
  assert.strictEqual(formatarPontos(30), '30');
  assert.strictEqual(formatarPontos(7.5), '7,5');
  assert.strictEqual(formatarPontos(0), '0');
});

test('textoSituacao', () => {
  assert.deepStrictEqual(textoSituacao({ configurada: true, situacao: 'falta', falta: 0.5 }), { texto: 'Falta 0,5 ponto', classe: 'neutro' });
  assert.deepStrictEqual(textoSituacao({ configurada: true, situacao: 'falta', falta: 1 }), { texto: 'Falta 1 ponto', classe: 'neutro' });
  assert.deepStrictEqual(textoSituacao({ configurada: true, situacao: 'falta', falta: 18 }), { texto: 'Faltam 18 pontos', classe: 'neutro' });
  assert.deepStrictEqual(textoSituacao({ configurada: true, situacao: 'aprovado', falta: 0 }), { texto: 'Aprovado', classe: 'ok' });
  assert.deepStrictEqual(textoSituacao({ configurada: true, situacao: 'impossivel', falta: 40 }), { texto: 'Não dá mais', classe: 'perigo' });
  assert.strictEqual(textoSituacao({ configurada: false, situacao: null, falta: null }), null);
});

test('rotuloPontos: singular abaixo de 2', () => {
  const { rotuloPontos } = require('../frontend/assets/js/notas-utils.js');
  assert.strictEqual(rotuloPontos(0), '0 pontos');
  assert.strictEqual(rotuloPontos(0.5), '0,5 ponto');
  assert.strictEqual(rotuloPontos(1), '1 ponto');
  assert.strictEqual(rotuloPontos(1.5), '1,5 ponto');
  assert.strictEqual(rotuloPontos(2), '2 pontos');
  assert.strictEqual(rotuloPontos(42), '42 pontos');
});
