// Requiere un PostgreSQL desechable, sin estas cuatro bases. Nunca usa las bases del proyecto.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {Client} = require('pg');
const {preparar} = require('../src/scripts/crearDatosPresentacion');
const {alinear} = require('../src/scripts/alinearDocentePresentacion');

test('datos de presentación: instalación nueva, integridad, preservación e idempotencia',
  {skip:!process.env.TEST_DATABASE_HOST, timeout:90000}, async () => {
    const host = process.env.TEST_DATABASE_HOST;
    const config = {host, port:5432, user:'postgres', password:'postgres'};
    const admin = new Client({...config, database:'postgres'});
    const nombres = ['auth','usuarios','catalogo','academico'];
    const clientes = Object.fromEntries(nombres.map(nombre => [nombre, new Client({...config, database:`${nombre}_db`})]));
    const raizDatos = '/app/databases';
    try {
      await admin.connect();
      for (const nombre of nombres) {
        // CREATE falla si existe: protege cualquier instancia que no sea desechable y vacía.
        await admin.query(`CREATE DATABASE ${nombre}_db`);
        const db = clientes[nombre];
        await db.connect();
        await db.query(fs.readFileSync(path.join(raizDatos, nombre, 'init.sql'), 'utf8'));
        if (nombre !== 'auth') for (const archivo of fs.readdirSync(path.join(raizDatos, 'migrations', nombre)).filter(f => f.endsWith('.sql')).sort()) {
          await db.query(fs.readFileSync(path.join(raizDatos, 'migrations', nombre, archivo), 'utf8'));
        }
      }
      const variables = Object.fromEntries(nombres.flatMap(nombre => [[`${nombre.toUpperCase()}_DB_HOST`,host],
        [`${nombre.toUpperCase()}_DB_PORT`,'5432']]));
      for (const archivo of ['crearUsuario','crearAdminGeneralDemo','configurarEnzoItiDemo','crearEstudianteItiDemo',
        'crearDocenteDemo','crearAdminUnidadDemo']) {
        const resultado = spawnSync(process.execPath, [path.join(__dirname, '../src/scripts', `${archivo}.js`)],
          {encoding:'utf8', env:{...process.env,...variables,DB_HOST:host,DB_PORT:'5432',DB_NAME:'auth_db',DB_USER:'postgres',DB_PASSWORD:'postgres'}});
        assert.equal(resultado.status, 0, `${archivo}: ${resultado.stderr || resultado.stdout}`);
      }
      async function snapshot() {
        const datos = {};
        for (const [nombre, db] of Object.entries(clientes)) {
          const tablas = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
          for (const {tablename} of tablas) datos[`${nombre}.${tablename}`] =
            (await db.query(`SELECT to_jsonb(t)::text AS fila FROM "${tablename}" t ORDER BY to_jsonb(t)::text`)).rows.map(r => r.fila);
        }
        return datos;
      }
      const anterior = await snapshot();
      await preparar(clientes);
      const cargado = await snapshot();
      for (const [tabla, filas] of Object.entries(anterior)) for (const fila of filas) {
        assert.ok(cargado[tabla].includes(fila), `Se alteró un registro previo en ${tabla}`);
      }
      const db = clientes.academico;
      const idPrincipal = (await clientes.usuarios.query("SELECT id_estudiante FROM estudiante WHERE numero_matricula='20260001'")).rows[0].id_estudiante;
      const estados = (await db.query('SELECT DISTINCT estado FROM asistencia WHERE id_estudiante=$1', [idPrincipal])).rows.map(r => r.estado);
      for (const estado of ['PRESENTE','AUSENTE','JUSTIFICADO','ATRASADO']) assert.ok(estados.includes(estado), estado);
      assert.equal(Number((await db.query(`SELECT count(*) AS total FROM asistencia a JOIN clase c USING(id_clase)
        JOIN curso cu ON cu.id_curso=c.id_curso
        JOIN inscripcion i ON i.id_curso=c.id_curso AND i.id_estudiante=a.id_estudiante
        WHERE cu.seccion IN (97,98,99) AND (c.fecha<i.fecha_inscripcion::date OR c.fecha>CURRENT_DATE)`)).rows[0].total), 0);
      assert.equal((await db.query('SELECT id_curso FROM evaluacion GROUP BY id_curso HAVING sum(porcentaje)>100')).rowCount, 0);
      assert.equal((await db.query(`SELECT c.id_curso FROM curso c WHERE cupo_actual<>(SELECT count(*)
        FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado='ACTIVA')`)).rowCount, 0);
      assert.equal((await db.query(`SELECT s.estado FROM solicitud_levantamiento s JOIN restriccion r USING(id_restriccion)
        WHERE r.id_estudiante=$1 GROUP BY s.estado`, [idPrincipal])).rowCount, 3);
      assert.equal((await db.query(`SELECT 1 FROM respuesta_encuesta r JOIN encuesta_docente e USING(id_encuesta)
        JOIN curso_docente cd USING(id_curso_docente) JOIN curso c USING(id_curso)
        WHERE c.seccion=98 AND r.id_estudiante=$1`, [idPrincipal])).rowCount, 1);
      assert.equal((await db.query(`SELECT 1 FROM lista_espera l JOIN curso c USING(id_curso)
        WHERE c.seccion=97 AND l.estado='ESPERA' AND c.cupo_actual=c.cupo_maximo`)).rowCount, 2);
      assert.equal((await db.query(`SELECT 1 FROM resultado_final r JOIN inscripcion i USING(id_inscripcion)
        WHERE i.id_estudiante=$1`, [idPrincipal])).rowCount, 39);
      assert.ok((await db.query("SELECT 1 FROM auditoria_academica WHERE accion='DOCENTE_NOTA' AND detalle->>'demostracion'='true'")).rowCount > 0);
      // Simula trabajo realizado durante una presentación y comprueba que no se restablece.
      await db.query("UPDATE calificacion SET nota=7,version=version+1 WHERE id_calificacion=(SELECT max(id_calificacion) FROM calificacion)");
      await db.query("UPDATE asistencia SET observacion='Editado durante la presentación',version=version+1 WHERE id_asistencia=(SELECT max(id_asistencia) FROM asistencia)");
      await clientes.auth.query("UPDATE usuario SET password_hash='clave-cambiada-en-la-prueba' WHERE correo='demo.estudiante1@ucn.cl'");
      const editado = await snapshot();
      await preparar(clientes);
      assert.deepEqual(await snapshot(), editado, 'La segunda ejecución duplicó datos o sobrescribió cambios');
      const antesAlinear=await snapshot();
      const respondidas=(await db.query(`SELECT e.id_encuesta,e.id_curso_docente FROM encuesta_docente e
        WHERE EXISTS(SELECT 1 FROM respuesta_encuesta r WHERE r.id_encuesta=e.id_encuesta) ORDER BY e.id_encuesta`)).rows;
      await alinear(clientes);
      const docentes=(await clientes.usuarios.query(`SELECT d.id_docente,p.correo_institucional FROM docente d JOIN persona p USING(id_persona)
        WHERE p.correo_institucional IN ('docente@ucn.cl','docente.iti@ucn.cl')`)).rows;
      const principal=docentes.find(d=>d.correo_institucional==='docente@ucn.cl').id_docente;
      const secundaria=docentes.find(d=>d.correo_institucional==='docente.iti@ucn.cl').id_docente;
      const delAlumno=(await db.query(`SELECT c.id_curso FROM inscripcion i JOIN curso c USING(id_curso)
        JOIN periodo_academico p USING(id_periodo) WHERE i.id_estudiante=$1 AND i.estado='ACTIVA'
        AND p.estado='ACTIVO' AND CURRENT_DATE BETWEEN p.fecha_inicio AND p.fecha_fin ORDER BY c.id_curso`,[idPrincipal])).rows;
      const delDocente=(await db.query(`SELECT c.id_curso FROM curso_docente cd JOIN curso c USING(id_curso)
        JOIN periodo_academico p USING(id_periodo) WHERE cd.id_docente=$1 AND cd.activa
        AND p.estado='ACTIVO' AND CURRENT_DATE BETWEEN p.fecha_inicio AND p.fecha_fin ORDER BY c.id_curso`,[principal])).rows;
      assert.equal(delDocente.length,7);assert.deepEqual(delDocente,delAlumno);
      assert.ok((await db.query('SELECT 1 FROM curso_docente cd JOIN curso c USING(id_curso) WHERE cd.id_docente=$1 AND cd.activa AND c.seccion=97',[secundaria])).rowCount>0);
      const alineado=await snapshot();
      for(const tabla of ['calificacion','asistencia','inscripcion','resultado_final','respuesta_encuesta'])assert.deepEqual(alineado[`academico.${tabla}`],antesAlinear[`academico.${tabla}`],`Cambió ${tabla} al alinear al docente`);
      assert.deepEqual((await db.query(`SELECT e.id_encuesta,e.id_curso_docente FROM encuesta_docente e
        WHERE EXISTS(SELECT 1 FROM respuesta_encuesta r WHERE r.id_encuesta=e.id_encuesta) ORDER BY e.id_encuesta`)).rows,respondidas);
      const repetirDocente=spawnSync(process.execPath,[path.join(__dirname,'../src/scripts/crearDocenteDemo.js')],
        {encoding:'utf8',env:{...process.env,...variables,DB_HOST:host,DB_PORT:'5432',DB_NAME:'auth_db',DB_USER:'postgres',DB_PASSWORD:'postgres'}});
      assert.equal(repetirDocente.status,0,repetirDocente.stderr);
      await preparar(clientes);await alinear(clientes);
      assert.deepEqual(await snapshot(),alineado,'El arranque repetido volvió a asignar cursos anteriores o restableció datos');
      console.log('Verificados: docente principal con los mismos siete ramos, cuenta secundaria, datos conservados y alineación repetible.');
      console.log('Verificados: registros previos intactos, asistencia visible, ponderaciones, cupos, solicitudes, encuestas, lista de espera y 39 aprobaciones.');
    } finally {
      for (const db of Object.values(clientes)) { await db.query('ROLLBACK').catch(() => {}); await db.end().catch(() => {}); }
      await admin.end().catch(() => {});
    }
  });
