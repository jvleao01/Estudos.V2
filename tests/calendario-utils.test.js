const test = require('node:test');
const assert = require('node:assert');
const {
  pascoa, feriados, gradeDoMes, diasDoMes, mesVizinho, rotuloMes, rotuloDia,
} = require('../frontend/assets/js/calendario-utils.js');

test('pascoa em anos conhecidos', () => {
  assert.strictEqual(pascoa(2024), '2024-03-31');
  assert.strictEqual(pascoa(2025), '2025-04-20');
  assert.strictEqual(pascoa(2026), '2026-04-05');
  assert.strictEqual(pascoa(2027), '2027-03-28');
});

test('feriados de 2026 (nacionais, móveis e BH)', () => {
  const f = feriados(2026);
  assert.strictEqual(f.get('2026-02-16'), 'Carnaval');
  assert.strictEqual(f.get('2026-02-17'), 'Carnaval');
  assert.strictEqual(f.get('2026-04-03'), 'Sexta-feira Santa');
  assert.strictEqual(f.get('2026-06-04'), 'Corpus Christi');
  assert.strictEqual(f.get('2026-11-20'), 'Consciência Negra');
  assert.strictEqual(f.get('2026-08-15'), 'Assunção de Nossa Senhora');
  assert.strictEqual(f.get('2026-12-08'), 'Imaculada Conceição');
  assert.strictEqual(f.get('2026-01-01'), 'Confraternização Universal');
  assert.strictEqual(f.size, 15);
});

test('gradeDoMes: semanas de domingo a sábado', () => {
  const nov = gradeDoMes(2026, 11);
  assert.strictEqual(nov[0][0], '2026-11-01'); // 01/11/2026 é domingo
  const ago = gradeDoMes(2026, 8); // 01/08/2026 é sábado
  assert.deepStrictEqual(ago[0], [null, null, null, null, null, null, '2026-08-01']);
  assert.ok(gradeDoMes(2028, 2).flat().includes('2028-02-29'));
  for (const g of [nov, ago, gradeDoMes(2028, 2)]) for (const semana of g) assert.strictEqual(semana.length, 7);
  assert.strictEqual(nov.flat().filter(Boolean).length, 30);
});

function dados(extra = {}) {
  return {
    semestres: [{ semestre: '2026.2', inicio: '2026-11-04', fim: '2026-11-25' }],
    aulas: [{ materiaId: 1, nome: 'Cálculo', cor: '#6c8cff', semestre: '2026.2', dias: [3] }],
    desmarcadas: [],
    provas: [],
    trabalhos: [],
    ...extra,
  };
}

test('diasDoMes: aulas só dentro do semestre, inclusive nos limites', () => {
  const dias = diasDoMes(2026, 11, dados());
  const comAula = [...dias].filter(([, d]) => d.aulas.length).map(([iso]) => iso);
  assert.deepStrictEqual(comAula, ['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
  assert.strictEqual(dias.size, 30);
  assert.deepStrictEqual(dias.get('2026-11-04').aulas, [{ materiaId: 1, nome: 'Cálculo', cor: '#6c8cff', desmarcada: false }]);
});

test('diasDoMes: feriado sem aula, mas com prova', () => {
  const prova = { id: 9, materiaId: 2, materia: { nome: 'Física', cor: '#2ec4b6' }, titulo: 'P1', data: '2026-11-20', concluido: false, simulado: false };
  const d = dados({
    aulas: [{ materiaId: 2, nome: 'Física', cor: '#2ec4b6', semestre: '2026.2', dias: [5] }],
    provas: [prova],
  });
  const dia = diasDoMes(2026, 11, d).get('2026-11-20');
  assert.strictEqual(dia.feriado, 'Consciência Negra');
  assert.deepStrictEqual(dia.aulas, []);
  assert.deepStrictEqual(dia.provas, [prova]);
  assert.strictEqual(diasDoMes(2026, 11, d).get('2026-11-13').aulas.length, 1);
});

test('diasDoMes: aula desmarcada continua listada', () => {
  const d = dados({ desmarcadas: [{ materiaId: 1, data: '2026-11-11' }] });
  const dias = diasDoMes(2026, 11, d);
  assert.strictEqual(dias.get('2026-11-11').aulas[0].desmarcada, true);
  assert.strictEqual(dias.get('2026-11-18').aulas[0].desmarcada, false);
});

test('diasDoMes: trabalhos no dia da entrega', () => {
  const t = { id: 3, materiaId: 1, materia: { nome: 'Cálculo', cor: '#6c8cff' }, titulo: 'Lista', data: '2026-11-30', concluido: true };
  assert.deepStrictEqual(diasDoMes(2026, 11, dados({ trabalhos: [t] })).get('2026-11-30').trabalhos, [t]);
});

test('mesVizinho atravessa o ano', () => {
  assert.strictEqual(mesVizinho('2026-01', -1), '2025-12');
  assert.strictEqual(mesVizinho('2026-12', 1), '2027-01');
  assert.strictEqual(mesVizinho('2026-11', 1), '2026-12');
});

test('rótulos', () => {
  assert.strictEqual(rotuloMes('2026-11'), 'Novembro 2026');
  assert.strictEqual(rotuloDia('2026-11-18'), 'Quarta, 18/11');
  assert.strictEqual(rotuloDia('2026-11-01'), 'Domingo, 01/11');
});

test('feriados que caem no mesmo dia juntam os nomes', () => {
  // 2000: Páscoa em 23/04, Sexta-feira Santa em 21/04 (Tiradentes)
  assert.strictEqual(pascoa(2000), '2000-04-23');
  assert.strictEqual(feriados(2000).get('2000-04-21'), 'Tiradentes · Sexta-feira Santa');
});
