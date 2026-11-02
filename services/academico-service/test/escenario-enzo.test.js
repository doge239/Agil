const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');
const {configurar} = require('../../auth-service/src/scripts/configurarEnzoItiDemo');
const {calcularAvance} = require('../src/domain/avance');

test('escenario de Enzo: ITI, 39 aprobados, 7 inscritos, Capstone futuro y horario sin modificar otros alumnos',async()=> {
  const [usuarios,catalogo,academico] = [new PGlite(),new PGlite(),new PGlite()];
  try {
    for (const [dominio,db] of [['usuarios',usuarios],['catalogo',catalogo],['academico',academico]]) {
      await db.exec(fs.readFileSync(path.resolve(__dirname,`../../../databases/${dominio}/init.sql`),'utf8'));
      const carpeta = path.resolve(__dirname,`../../../databases/migrations/${dominio}`);
      for (const archivo of fs.readdirSync(carpeta).filter(f=>f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(carpeta,archivo),'utf8'));
    }
    await academico.exec("UPDATE periodo_academico SET fecha_inicio=CURRENT_DATE-90,fecha_fin=CURRENT_DATE+90; INSERT INTO inscripcion(id_estudiante,id_curso) VALUES(99,1)");
    const otrosAntes = (await academico.query('SELECT * FROM inscripcion WHERE id_estudiante=99')).rows;
    const horariosAntes = (await academico.query('SELECT * FROM horario WHERE id_curso<=3 ORDER BY id_horario')).rows;
    await assert.rejects(configurar({usuarios,catalogo,academico,idUsuario:99}),/identidad/);
    const resultado = await configurar({usuarios,catalogo,academico,idUsuario:1});
    const p = (await usuarios.query('SELECT * FROM estudiante WHERE id_estudiante=1')).rows[0];
    assert.equal(p.id_plan,resultado.id_plan);
    const malla = (await catalogo.query('SELECT m.*,a.nombre AS asignatura,a.creditos FROM malla_curricular m JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1',[p.id_plan])).rows;
    const prerrequisitos = (await catalogo.query('SELECT * FROM prerrequisito')).rows;
    const electivos = (await catalogo.query('SELECT e.*,a.nombre FROM electivo_opcion e JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1',[p.id_plan])).rows;
    const elecciones = (await academico.query('SELECT * FROM eleccion_electivo WHERE id_estudiante=1')).rows;
    const finales = (await academico.query('SELECT c.id_asignatura,r.nota,r.nota_minima FROM resultado_final r JOIN inscripcion i USING(id_inscripcion) JOIN curso c USING(id_curso) WHERE id_estudiante=1')).rows;
    const actuales = (await academico.query("SELECT c.id_asignatura FROM inscripcion i JOIN curso c USING(id_curso) WHERE i.id_estudiante=1 AND i.estado='ACTIVA'")).rows;
    const avance = calcularAvance({malla,prerrequisitos,electivos},finales,actuales,elecciones);
    assert.equal(avance.asignaturas.length,47);
    assert.equal(avance.asignaturas.filter(a=>a.estado==='APROBADA').length,39);
    assert.equal(avance.asignaturas.filter(a=>a.estado==='EN_CURSO').length,7);
    assert.ok(avance.asignaturas.filter(a=>a.semestre===8).every(a=>a.estado==='PENDIENTE'&&a.nota===null));
    const clases = (await academico.query("SELECT h.* FROM horario h JOIN inscripcion i USING(id_curso) WHERE i.id_estudiante=1 AND i.estado='ACTIVA'")).rows;
    assert.equal(clases.length,11);
    const {hayChoque} = require('../src/domain/estudiante');
    assert.ok(clases.every((a,i)=>clases.every((b,j)=>i===j||!hayChoque(a,b))));
    assert.deepEqual((await academico.query('SELECT * FROM inscripcion WHERE id_estudiante=99')).rows,otrosAntes);
    assert.deepEqual((await academico.query('SELECT * FROM horario WHERE id_curso<=3 ORDER BY id_horario')).rows,horariosAntes);
    const conteoAntes = (await academico.query('SELECT (SELECT count(*) FROM inscripcion) AS inscripciones,(SELECT count(*) FROM horario) AS horarios,(SELECT count(*) FROM resultado_final) AS resultados')).rows;
    await configurar({usuarios,catalogo,academico,idUsuario:1});
    assert.deepEqual((await academico.query('SELECT (SELECT count(*) FROM inscripcion) AS inscripciones,(SELECT count(*) FROM horario) AS horarios,(SELECT count(*) FROM resultado_final) AS resultados')).rows,conteoAntes);
    assert.equal((await academico.query("SELECT count(*)::int AS n FROM auditoria_academica WHERE accion='CONFIGURAR_ESCENARIO_ITI'")).rows[0].n,1);
  } finally { for (const db of [usuarios,catalogo,academico]) await db.close(); }
});
