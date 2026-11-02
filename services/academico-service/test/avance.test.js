const {test} = require('node:test');
const assert = require('node:assert/strict');
const {calcularAvance} = require('../src/domain/avance');
const asignatura = (id,extra={}) => ({id_asignatura:id,asignatura:`Ramo ${id}`,semestre:1,creditos:5,obligatoria:true,requisitos_estado:'CONFIRMADOS',...extra});
const aprobado = id => ({id_asignatura:id,nota:5,nota_minima:4});
const malla = [asignatura(1),asignatura(2),asignatura(3,{semestre:2})];
const plan = {malla,prerrequisitos:[{id_asignatura:3,id_asignatura_requisito:1},{id_asignatura:3,id_asignatura_requisito:2}]};

test('dos requisitos: ambos aprobados habilitan; uno inscrito no acredita', () => {
  const completo = calcularAvance(plan,[aprobado(1),aprobado(2)],[]);
  assert.equal(completo.asignaturas[2].disponibilidad,'DISPONIBLE');
  const parcial = calcularAvance(plan,[aprobado(1)],[{id_asignatura:2}]);
  assert.equal(parcial.asignaturas[2].disponibilidad,'BLOQUEADA');
  assert.deepEqual(parcial.asignaturas[2].pendientes.map(r => r.id_asignatura),[2]);
  assert.equal(parcial.asignaturas[1].estado,'EN_CURSO');
  assert.deepEqual(parcial.asignaturas[0].habilita[0].otros_pendientes.map(r => r.id_asignatura),[2]);
});
test('reprobar permite repetir si cumple requisitos; una aprobación prevalece y no duplica créditos', () => {
  const fallo = {...aprobado(3),nota:3};
  const repetible = calcularAvance(plan,[aprobado(1),aprobado(2),fallo],[]);
  assert.equal(repetible.asignaturas[2].estado,'REPROBADA');
  assert.equal(repetible.asignaturas[2].disponibilidad,'DISPONIBLE');
  const varios = calcularAvance(plan,[fallo,aprobado(3),fallo],[{id_asignatura:3}]);
  assert.equal(varios.asignaturas[2].estado,'APROBADA');
  assert.equal(varios.asignaturas[2].nota,5);
  assert.equal(varios.creditos_aprobados,5);
  assert.equal(varios.asignaturas_aprobadas,1);
});
test('niveles incluyen espacios de electivos; no se duplican por la opción elegida', () => {
  const p = {malla:[asignatura(1),asignatura(2,{espacio_electivo:true,obligatoria:false}),asignatura(3,{semestre:2,requisito_nivel:1})],electivos:[{id_espacio:2,id_asignatura:20,nombre:'Electivo elegido'}]};
  const elecciones = [{id_espacio:2,id_asignatura:20}];
  const parcial = calcularAvance(p,[aprobado(1)],[],elecciones);
  assert.equal(parcial.asignaturas[2].disponibilidad,'BLOQUEADA');
  const completo = calcularAvance(p,[aprobado(1),aprobado(20),aprobado(20)],[],elecciones);
  assert.equal(completo.asignaturas[2].disponibilidad,'DISPONIBLE');
  assert.equal(completo.creditos_aprobados,10);
  assert.equal(completo.creditos_totales,15);
  assert.equal(completo.asignaturas.length,3);
  assert.equal(completo.asignaturas[1].elegida.nombre,'Electivo elegido');
});
test('requisitos desconocidos no se confunden con requisitos vacíos ni créditos desconocidos con cero', () => {
  const r = calcularAvance({malla:[asignatura(1),asignatura(2,{requisitos_estado:'POR_CONFIRMAR',creditos:null})]},[],[]);
  assert.equal(r.asignaturas[0].disponibilidad,'DISPONIBLE');
  assert.equal(r.asignaturas[1].disponibilidad,'POR_CONFIRMAR');
  assert.equal(r.creditos_totales,null);
  assert.equal(r.porcentaje,null);
  assert.equal(r.porcentaje_asignaturas,0);
  assert.ok(r.asignaturas.every(a => a.estado==='PENDIENTE' && a.nota===null));
});
test('no se acredita una elección que no pertenece al espacio del plan', () => {
  const r = calcularAvance({malla:[asignatura(1,{espacio_electivo:true})],electivos:[{id_espacio:1,id_asignatura:10}]},[aprobado(99)],[],[{id_espacio:1,id_asignatura:99}]);
  assert.equal(r.asignaturas_aprobadas,0);
  assert.equal(r.asignaturas[0].elegida,null);
});
test('migraciones ITI conservan el plan anterior y generan 47 espacios sin duplicar electivos', async () => {
  const {PGlite} = require('@electric-sql/pglite');
  const fs = require('node:fs');
  const path = require('node:path');
  const db = new PGlite();
  try {
    for (const archivo of ['catalogo/init.sql','migrations/catalogo/001_avance_iti.sql','migrations/catalogo/002_plan_iti.sql']) {
      await db.exec(fs.readFileSync(path.resolve(__dirname,'../../../databases',archivo),'utf8'));
    }
    assert.equal((await db.query('SELECT count(*)::int AS n FROM malla_curricular WHERE id_plan=1')).rows[0].n,3);
    const planId = (await db.query("SELECT id_plan FROM plan_estudio WHERE referencia='ITI-REFERENCIA-2026'")).rows[0].id_plan;
    const malla = (await db.query('SELECT m.*,a.nombre AS asignatura,a.codigo,a.creditos FROM malla_curricular m JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1 ORDER BY semestre,orden',[planId])).rows;
    const prerrequisitos = (await db.query('SELECT * FROM prerrequisito')).rows;
    const electivos = (await db.query('SELECT e.*,a.nombre FROM electivo_opcion e JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1',[planId])).rows;
    assert.equal(malla.length,47);
    assert.deepEqual([...new Set(malla.map(a=>a.semestre))],[1,2,3,4,5,6,7,8]);
    assert.equal(electivos.length,4);
    const practica = malla.find(a=>a.referencia==='46');
    assert.equal(practica.codigo,null);
    assert.equal(practica.creditos,null);
    const sinHistorial = calcularAvance({malla,prerrequisitos,electivos},[],[]);
    assert.equal(sinHistorial.asignaturas_aprobadas,0);
    assert.equal(sinHistorial.asignaturas.find(a=>a.referencia==='46').disponibilidad,'POR_CONFIRMAR');
    assert.equal(sinHistorial.asignaturas.find(a=>a.referencia==='0').disponibilidad,'DISPONIBLE');
    assert.equal(sinHistorial.asignaturas.find(a=>a.referencia==='45').prerrequisitos.length,46);
  } finally { await db.close(); }
});
