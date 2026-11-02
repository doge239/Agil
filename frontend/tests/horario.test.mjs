import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BLOQUES, asignarColores, bloqueParaHorario, seSuperponen } from '../src/utils/horario.ts'

test('cada bloque A–F conserva el intervalo de la referencia', () => {
  assert.deepEqual(BLOQUES.map(b => b.letra), ['A', 'B', 'C', 'D', 'E', 'F'])
  for (const b of BLOQUES) assert.equal(bloqueParaHorario(b.hora_inicio, b.hora_fin), b.letra)
})
test('horas fuera de bloque nunca se redondean a otra hora', () => {
  assert.equal(bloqueParaHorario('09:40:00', '11:10:00'), 'ESPECIAL')
  assert.equal(bloqueParaHorario('11:30:00', '13:00:00'), 'ESPECIAL')
  assert.equal(bloqueParaHorario('08:30:00', '09:00:00'), 'A')
})
test('cruces se detectan por horas reales, incluso entre filas distintas', () => {
  const a = { dia_semana: 'Miércoles', hora_inicio: '09:40', hora_fin: '11:10' }
  assert.equal(seSuperponen(a, { dia_semana: 'miercoles', hora_inicio: '09:55', hora_fin: '11:25' }), true)
  assert.equal(seSuperponen(a, { dia_semana: 'Miércoles', hora_inicio: '11:10', hora_fin: '12:40' }), false)
  assert.equal(seSuperponen(a, { dia_semana: 'Martes', hora_inicio: '09:55', hora_fin: '11:25' }), false)
})
test('colores no dependen del orden de las sesiones y siete ramos tienen colores distintos', () => {
  assert.deepEqual(asignarColores([1, 2, 20]), asignarColores([20, 2, 1]))
  assert.equal(asignarColores([20, 20]).size, 1)
  assert.equal(new Set(asignarColores([1, 9, 17, 25, 33, 41, 49]).values()).size, 7)
})
