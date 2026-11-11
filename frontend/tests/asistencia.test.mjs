import {test} from 'node:test'
import assert from 'node:assert/strict'
import {resumirAsistencia,estadoAsistencia} from '../src/utils/asistencia.ts'

test('justificación suma asistencia sin convertirse en presente y excluye pendientes',()=>{
  assert.deepEqual(resumirAsistencia(['PRESENTE','JUSTIFICADO','AUSENTE','PENDIENTE',null].map(estado=>({estado}))),
    {asistidas:2,confirmadas:3,porcentaje:67})
  assert.equal(estadoAsistencia('JUSTIFICADO').estado,'JUSTIFICADO')
})
test('todas las clases justificadas dan 100%; solo pendientes no da un porcentaje falso',()=>{
  assert.equal(resumirAsistencia([{estado:'JUSTIFICADO'},{estado:'JUSTIFICADO'}]).porcentaje,100)
  assert.deepEqual(resumirAsistencia([{estado:null},{estado:'PENDIENTE'}]),{asistidas:0,confirmadas:0,porcentaje:null})
  assert.equal(resumirAsistencia([{estado:'ATRASADO'},{estado:'JUSTIFICADO'}]).porcentaje,100)
})
