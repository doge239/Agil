// Datos sintéticos compartidos. Solo agrega registros; nunca reinicia bases ni resultados.
require('dotenv').config();
const {Client} = require('pg');
const bcrypt = require('bcrypt');
const VERSION = 'PRESENTACION_BANNER_V1';

async function identidad(auth, usuarios, {correo, nombres, apellido, rol, unidad, plan, matricula}) {
  await auth.query('BEGIN');
  let cuenta = (await auth.query('SELECT * FROM usuario WHERE correo=$1', [correo])).rows[0];
  if (!cuenta) {
    const tipo = (await auth.query('SELECT id_rol FROM rol WHERE nombre=$1', [rol])).rows[0];
    if (!tipo) throw new Error(`Falta el rol ${rol}`);
    cuenta = (await auth.query('INSERT INTO usuario(correo,password_hash) VALUES($1,$2) RETURNING *',
      [correo, await bcrypt.hash('123456', 10)])).rows[0];
    await auth.query('INSERT INTO usuario_rol(id_usuario,id_rol) VALUES($1,$2)', [cuenta.id_usuario, tipo.id_rol]);
  } else {
    const compatible = await auth.query(`SELECT 1 FROM usuario_rol JOIN rol USING(id_rol)
      WHERE id_usuario=$1 AND nombre=$2`, [cuenta.id_usuario, rol]);
    if (!cuenta.activo || !compatible.rowCount) throw new Error(`La cuenta ${correo} tiene otro perfil o está inactiva`);
  }
  await auth.query('COMMIT');
  await usuarios.query('BEGIN');
  await usuarios.query(`INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional)
    VALUES($1,$2,$3,$4) ON CONFLICT(id_usuario) DO NOTHING`, [cuenta.id_usuario, nombres, apellido, correo]);
  const persona = (await usuarios.query('SELECT * FROM persona WHERE id_usuario=$1', [cuenta.id_usuario])).rows[0];
  if (persona.correo_institucional !== correo || persona.nombres !== nombres || persona.apellido_paterno !== apellido) {
    throw new Error(`La identidad existente de ${correo} no corresponde a la presentación`);
  }
  let perfil;
  if (rol === 'DOCENTE') {
    await usuarios.query('INSERT INTO docente(id_persona,id_unidad) VALUES($1,$2) ON CONFLICT(id_persona) DO NOTHING',
      [persona.id_persona, unidad]);
    perfil = (await usuarios.query('SELECT * FROM docente WHERE id_persona=$1', [persona.id_persona])).rows[0];
    if (perfil.id_unidad !== unidad) throw new Error(`El docente ${correo} pertenece a otra unidad`);
  } else {
    await usuarios.query(`INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan,anio_ingreso)
      VALUES($1,$2,$3,$4,2026) ON CONFLICT(id_persona) DO NOTHING`,
    [persona.id_persona, matricula, plan.id_carrera, plan.id_plan]);
    perfil = (await usuarios.query('SELECT * FROM estudiante WHERE id_persona=$1', [persona.id_persona])).rows[0];
    if (perfil.numero_matricula !== matricula || perfil.id_plan !== plan.id_plan || perfil.id_carrera !== plan.id_carrera) {
      throw new Error(`El estudiante ${correo} ya tiene otro plan o matrícula`);
    }
  }
  if (rol === 'ESTUDIANTE' && !persona.rut && /^DEMO-PRES-00[1-3]$/.test(matricula)) {
    // Identificadores sintéticos, exclusivos de las tres cuentas de presentación.
    const cuerpo = String(90000000 + Number(matricula.slice(-1)));
    const suma = [...cuerpo].reverse().reduce((total,digito,i)=>total+Number(digito)*(2+i%6),0);
    const resto = 11-suma%11;
    const rut = `${cuerpo}-${resto===11?'0':resto===10?'K':resto}`;
    await usuarios.query('UPDATE persona SET rut=$2 WHERE id_persona=$1 AND rut IS NULL',[persona.id_persona,rut]);
  }
  await usuarios.query('COMMIT');
  return {...cuenta, ...perfil};
}

async function catalogoPresentacion(db, unidad, actor) {
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(17007,2)');
  const previo = await db.query('SELECT 1 FROM auditoria_catalogo WHERE accion=$1', [VERSION]);
  if (!previo.rowCount) {
    // Códigos reservados para esta demostración; una colisión aborta sin modificar lo anterior.
    const carrera = (await db.query(`INSERT INTO carrera(id_unidad,codigo,nombre)
      VALUES($1,'DEMO-SW','Ingeniería de Software — Demostración') RETURNING *`, [unidad])).rows[0];
    const plan = (await db.query(`INSERT INTO plan_estudio(id_carrera,nombre,anio_inicio,gestionado)
      VALUES($1,'Plan de presentación 2026',2026,TRUE) RETURNING *`, [carrera.id_carrera])).rows[0];
    const ids = [];
    for (const [i, nombre] of ['Fundamentos de Programación','Diseño de Software','Calidad de Software','Proyecto Integrador'].entries()) {
      const asignatura = (await db.query(`INSERT INTO asignatura(codigo,nombre,creditos,descripcion)
        VALUES($1,$2,5,'Asignatura sintética para probar la administración del catálogo y la malla.') RETURNING *`,
      [`DEMO-SW${i + 1}`, nombre])).rows[0];
      ids.push(asignatura.id_asignatura);
      await db.query('INSERT INTO malla_curricular(id_plan,id_asignatura,semestre,orden) VALUES($1,$2,$3,$4)',
        [plan.id_plan, asignatura.id_asignatura, i + 1, i + 1]);
      if (i) await db.query('INSERT INTO prerrequisito_plan(id_plan,id_asignatura,id_asignatura_requisito) VALUES($1,$2,$3)',
        [plan.id_plan, ids[i], ids[i - 1]]);
    }
    await db.query('INSERT INTO auditoria_catalogo(id_usuario,accion,detalle) VALUES($1,$2,$3)',
      [actor, VERSION, JSON.stringify({demostracion:true, id_carrera:carrera.id_carrera, id_plan:plan.id_plan,
        descripcion:'Alta de carrera, plan publicado, cuatro asignaturas y tres prerrequisitos de presentación.'})]);
  }
  await db.query('COMMIT');
}

async function contenidoCurso(db, curso, docente, actor, indice, periodo) {
  const inscritos = (await db.query(`SELECT * FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'
    AND NOT EXISTS(SELECT 1 FROM resultado_final r WHERE r.id_inscripcion=inscripcion.id_inscripcion)
    ORDER BY id_estudiante`, [curso.id_curso])).rows;
  if (!inscritos.length) return;
  // Respeta la ponderación de cualquier evaluación anterior.
  const usado = Number((await db.query('SELECT COALESCE(sum(porcentaje),0) AS total FROM evaluacion WHERE id_curso=$1',
    [curso.id_curso])).rows[0].total);
  const disponible = Math.floor((100 - usado) * 10);
  if (disponible >= 3) {
    const primera = Math.max(1, Math.floor(disponible * .3));
    const pesos = [primera, primera, disponible - primera * 2];
    for (const [n, nombre] of ['Prueba aplicada','Trabajo práctico','Proyecto final'].entries()) {
      const evaluacion = (await db.query(`INSERT INTO evaluacion(id_curso,nombre,porcentaje,fecha)
        VALUES($1,$2,$3,LEAST($4::date + $5::int,$6::date)) RETURNING *`,
      [curso.id_curso, `Demo · ${nombre}`, pesos[n] / 10, periodo.hoy, n === 2 ? 14 : 0, periodo.fin])).rows[0];
      // El proyecto queda pendiente para poder ingresar notas durante la presentación.
      if (n < 2) for (const [j, estudiante] of inscritos.entries()) {
        await db.query(`INSERT INTO calificacion(id_evaluacion,id_estudiante,nota,id_docente_registro)
          VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [evaluacion.id_evaluacion, estudiante.id_estudiante, [5.5,6.2,4.8,3.7,6.5][(indice + j + n) % 5], docente]);
      }
    }
  }
  const horario = (await db.query('SELECT * FROM horario WHERE id_curso=$1 ORDER BY id_horario LIMIT 1', [curso.id_curso])).rows[0];
  const dias = {'Lunes':1,'Martes':2,'Miércoles':3,'Jueves':4,'Viernes':5,'Sábado':6,'Domingo':7};
  const desde = (await db.query(`SELECT GREATEST($2::date,min(fecha_inscripcion)::date)::text AS fecha
    FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'`, [curso.id_curso, periodo.inicio])).rows[0].fecha;
  let fechas = (await db.query(`SELECT fecha::date::text AS fecha FROM generate_series($1::date,$2::date,interval '1 day') fecha
    WHERE EXTRACT(ISODOW FROM fecha)=$3 ORDER BY fecha DESC LIMIT 6`,
  [desde, periodo.hoy, dias[horario?.dia_semana] || 1])).rows;
  // Una instalación recién creada todavía no tiene semanas de historial.
  if (!fechas.length) fechas = [{fecha:periodo.hoy}];
  for (const [n, {fecha}] of fechas.entries()) {
    const inicio = horario?.hora_inicio || '14:30';
    const fin = horario?.hora_fin || '16:00';
    let clase = (await db.query(`SELECT * FROM clase WHERE id_curso=$1 AND fecha=$2 AND hora_inicio=$3 AND hora_fin=$4`,
      [curso.id_curso, fecha, inicio, fin])).rows[0];
    if (!clase) clase = (await db.query(`INSERT INTO clase(id_curso,fecha,hora_inicio,hora_fin,id_docente_creacion)
      VALUES($1,$2,$3,$4,$5) RETURNING *`, [curso.id_curso, fecha, inicio, fin, docente])).rows[0];
    for (const [j, estudiante] of inscritos.entries()) {
      const elegible = await db.query('SELECT $1::date >= $2::timestamp::date AS ok', [fecha, estudiante.fecha_inscripcion]);
      if (!elegible.rows[0].ok) continue;
      const estado = ['PRESENTE','PRESENTE','AUSENTE','JUSTIFICADO','ATRASADO','PENDIENTE','PRESENTE'][(indice + n + j) % 7];
      if (estado !== 'PENDIENTE') await db.query(`INSERT INTO asistencia(id_clase,id_estudiante,estado,observacion)
        VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [clase.id_clase, estudiante.id_estudiante, estado, `Dato de demostración: ${estado.toLowerCase()}.`]);
    }
  }
  const asignacion = (await db.query('SELECT * FROM curso_docente WHERE id_curso=$1 AND id_docente=$2 AND activa',
    [curso.id_curso, docente])).rows[0];
  if (asignacion) {
    const encuesta = (await db.query(`INSERT INTO encuesta_docente(id_curso_docente,titulo,fecha_inicio,fecha_fin,creada_por)
      VALUES($1,'Demo · Encuesta de experiencia docente',$2,$3,$4) RETURNING *`,
    [asignacion.id_curso_docente, periodo.inicio, periodo.fin, actor])).rows[0];
    const preguntas = [];
    for (const [n, texto] of ['Explica los contenidos con claridad','Responde las dudas de los estudiantes',
      'Las actividades ayudan a aprender','Entrega retroalimentación oportuna'].entries()) {
      preguntas.push((await db.query('INSERT INTO pregunta_encuesta(id_encuesta,texto,orden) VALUES($1,$2,$3) RETURNING *',
        [encuesta.id_encuesta, texto, n + 1])).rows[0]);
    }
    // Una respondida y las demás disponibles para contestar en vivo.
    if (indice === 0) await db.query('INSERT INTO respuesta_encuesta(id_encuesta,id_estudiante,respuestas) VALUES($1,$2,$3)',
      [encuesta.id_encuesta, inscritos[0].id_estudiante, JSON.stringify(Object.fromEntries(preguntas.map((p,n) => [p.id_pregunta,n % 2 ? 4 : 5])))]);
  }
  await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
    [actor, 'DATOS_PRESENTACION_CURSO', JSON.stringify({id_curso:curso.id_curso, demostracion:true,
      descripcion:'Carga sintética de evaluaciones, notas, clases, asistencia y encuesta; no representa actividad real.'})]);
}

async function historialPresentacion(db, actor, periodo) {
  const accion = `${VERSION}_HISTORIAL`;
  if ((await db.query("SELECT 1 FROM auditoria_academica WHERE accion=$1 AND detalle->>'id_periodo'=$2",
    [accion, String(periodo)])).rowCount) return;
  // El historial del portal filtra estas acciones. Se identifica la importación en cada detalle.
  const cursos = (await db.query(`SELECT DISTINCT c.id_curso FROM curso c JOIN auditoria_academica a
    ON a.detalle->>'id_curso'=c.id_curso::text WHERE a.accion='DATOS_PRESENTACION_CURSO' AND c.id_periodo=$1`, [periodo])).rows;
  for (const {id_curso} of cursos) {
    const evaluaciones = (await db.query("SELECT * FROM evaluacion WHERE id_curso=$1 AND nombre LIKE 'Demo · %'", [id_curso])).rows;
    for (const e of evaluaciones) {
      await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
        [actor, 'DOCENTE_EVALUACION', JSON.stringify({id_curso, id_evaluacion:e.id_evaluacion, anterior:null,
          nuevo:{nombre:e.nombre, porcentaje:e.porcentaje}, demostracion:true, origen:'Importación de datos sintéticos de presentación'})]);
      const notas = (await db.query('SELECT * FROM calificacion WHERE id_evaluacion=$1', [e.id_evaluacion])).rows;
      for (const n of notas) await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
        [actor, 'DOCENTE_NOTA', JSON.stringify({id_curso, id_evaluacion:e.id_evaluacion, id_estudiante:n.id_estudiante,
          anterior:null, nuevo:{nota:n.nota}, demostracion:true, origen:'Importación de datos sintéticos de presentación'})]);
    }
    const asistencias = (await db.query(`SELECT a.* FROM asistencia a JOIN clase c USING(id_clase)
      WHERE c.id_curso=$1 AND a.observacion LIKE 'Dato de demostración:%'`, [id_curso])).rows;
    for (const a of asistencias) await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
      [actor, 'DOCENTE_ASISTENCIA', JSON.stringify({id_curso, id_clase:a.id_clase, id_estudiante:a.id_estudiante,
        anterior:null, nuevo:{estado:a.estado}, demostracion:true, origen:'Importación de datos sintéticos de presentación'})]);
  }
  await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
    [actor, accion, JSON.stringify({id_periodo:periodo, demostracion:true, descripcion:'Historial de importación para el portal docente'})]);
}

async function preparar({auth, usuarios, catalogo, academico}) {
  // Un bloqueo de sesión evita que dos ejecuciones creen cuentas simultáneamente.
  await auth.query('SELECT pg_advisory_lock(17007,1)');
  try {
    const plan = (await catalogo.query(`SELECT p.*,c.id_unidad FROM plan_estudio p JOIN carrera c USING(id_carrera)
      WHERE p.referencia='ITI-REFERENCIA-2026'`)).rows[0];
    if (!plan) throw new Error('Primero debe prepararse la malla ITI');
    const actor = (await auth.query("SELECT id_usuario FROM usuario WHERE correo='admin.general@ucn.cl' AND activo")).rows[0];
    const adminUnidad = (await auth.query("SELECT id_usuario FROM usuario WHERE correo='admin.unidad@ucn.cl' AND activo")).rows[0];
    if (!actor || !adminUnidad) throw new Error('Primero deben prepararse las cuentas administrativas de demostración');
    const docente = await identidad(auth, usuarios, {correo:'docente.iti@ucn.cl', nombres:'Docente', apellido:'Presentación ITI',
      rol:'DOCENTE', unidad:plan.id_unidad});
    const docenteBase = (await usuarios.query(`SELECT d.* FROM docente d JOIN persona p USING(id_persona)
      WHERE p.correo_institucional='docente@ucn.cl'`)).rows[0];
    if (!docenteBase || docenteBase.id_unidad !== plan.id_unidad) throw new Error('Falta el docente de demostración de EIC');
    const estudiantes = [];
    for (const [i, nombres] of ['Camila','Diego','Valentina'].entries()) {
      estudiantes.push(await identidad(auth, usuarios, {correo:`demo.estudiante${i + 1}@ucn.cl`, nombres,
        apellido:'Presentación', rol:'ESTUDIANTE', plan, matricula:`DEMO-PRES-00${i + 1}`}));
    }
    await catalogoPresentacion(catalogo, plan.id_unidad, actor.id_usuario);
    await academico.query('BEGIN');
    const periodo = (await academico.query(`SELECT *,CURRENT_DATE::text AS hoy,fecha_inicio::text AS inicio,fecha_fin::text AS fin
      FROM periodo_academico WHERE estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
      ORDER BY anio DESC,semestre DESC LIMIT 1`)).rows[0];
    if (!periodo) throw new Error('Se necesita un período vigente; no se modifican fechas ni se abre la inscripción');
    const previo = await academico.query(`SELECT 1 FROM auditoria_academica WHERE accion=$1 AND detalle->>'id_periodo'=$2`,
      [VERSION, String(periodo.id_periodo)]);
    if (previo.rowCount) {
      await historialPresentacion(academico, actor.id_usuario, periodo.id_periodo);
      await academico.query('COMMIT');
      console.log('Presentación ya preparada para este período; se conservan los cambios posteriores.');
      return;
    }
    const principales = (await academico.query(`SELECT DISTINCT c.* FROM curso c JOIN inscripcion i USING(id_curso)
      WHERE c.id_periodo=$1 AND c.seccion IN (98,99) AND i.estado='ACTIVA' ORDER BY c.seccion,c.id_curso`,
    [periodo.id_periodo])).rows;
    for (const [i, curso] of principales.entries()) {
      // El docente ITI no comparte los horarios incompatibles de los antiguos cursos ICI.
      const idDocente = curso.seccion === 98 ? docente.id_docente : docenteBase.id_docente;
      await academico.query('INSERT INTO curso_docente(id_curso,id_docente) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [curso.id_curso, idDocente]);
      await contenidoCurso(academico, curso, idDocente, actor.id_usuario, i, periodo);
    }
    // Sección independiente: no agrega compañeros a la sección 98 reservada por el escenario de Enzo.
    const asignaturas = (await catalogo.query(`SELECT m.* FROM malla_curricular m WHERE id_plan=$1 AND semestre=1
      ORDER BY orden,id_asignatura LIMIT 5`, [plan.id_plan])).rows;
    if (asignaturas.length !== 5) throw new Error('Faltan asignaturas del primer semestre ITI');
    const horarios = [['Martes','14:30','16:00'],['Jueves','14:30','16:00'],['Miércoles','16:15','17:45'],
      ['Viernes','14:30','16:00'],['Lunes','16:15','17:45']];
    const cursosNuevos = [];
    for (const [i, asignatura] of asignaturas.entries()) {
      const curso = (await academico.query(`INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo,cupo_actual)
        VALUES($1,$2,$3,97,$4,$5) RETURNING *`,
      [asignatura.id_asignatura, periodo.id_periodo, plan.id_unidad, i === 3 ? 1 : 35, [3,2,1,1,0][i]])).rows[0];
      cursosNuevos.push(curso.id_curso);
      await academico.query('INSERT INTO horario(id_curso,dia_semana,hora_inicio,hora_fin,sala) VALUES($1,$2,$3,$4,$5)',
        [curso.id_curso, ...horarios[i], `DEMO-${101 + i}`]);
      await academico.query('INSERT INTO curso_docente(id_curso,id_docente) VALUES($1,$2)', [curso.id_curso, docenteBase.id_docente]);
      for (const estudiante of estudiantes.slice(0, [3,2,1,1,0][i])) {
        await academico.query(`INSERT INTO inscripcion(id_estudiante,id_curso,fecha_inscripcion,tipo_inscripcion)
          VALUES($1,$2,$3::date,'ESTUDIANTE')`, [estudiante.id_estudiante, curso.id_curso, periodo.inicio]);
      }
      await contenidoCurso(academico, curso, docenteBase.id_docente, actor.id_usuario, i, periodo);
      if (i === 3) for (const estudiante of estudiantes.slice(1)) await academico.query(`INSERT INTO lista_espera
        (id_estudiante,id_curso,id_carrera,id_plan) VALUES($1,$2,$3,$4)`,
      [estudiante.id_estudiante, curso.id_curso, plan.id_carrera, plan.id_plan]);
    }
    const principal = (await usuarios.query(`SELECT e.* FROM estudiante e JOIN persona p USING(id_persona)
      WHERE p.correo_institucional='estudiante@ucn.cl' AND e.numero_matricula='20260001'`)).rows[0];
    if (!principal) throw new Error('Falta el estudiante principal de demostración');
    for (const [tipo, estado, global] of [['Demo · Validación de antecedentes','PENDIENTE',false],
      ['Demo · Documento validado','APROBADA',false], ['Demo · Respaldo insuficiente','RECHAZADA',false],
      ['Demo · Revisión institucional','PENDIENTE',true], ['Demo · Solicitud por enviar',null,false]]) {
      const aprobada = estado === 'APROBADA';
      const responsable = global ? actor.id_usuario : adminUnidad.id_usuario;
      const restriccion = (await academico.query(`INSERT INTO restriccion(id_estudiante,tipo,descripcion,id_unidad,
        activa,creada_por,fecha_levantamiento,levantada_por,motivo_levantamiento)
        VALUES($1,$2,'Restricción sintética para mostrar el flujo de solicitudes de la presentación.',$3,$4,$5,
        CASE WHEN $6::boolean THEN now() ELSE NULL END,CASE WHEN $6::boolean THEN $5::int ELSE NULL END,
        CASE WHEN $6::boolean THEN 'Antecedentes de demostración revisados y aceptados.' ELSE NULL END) RETURNING *`,
      [principal.id_estudiante, tipo, global ? null : plan.id_unidad, !aprobada, responsable, aprobada])).rows[0];
      if (estado) await academico.query(`INSERT INTO solicitud_levantamiento(id_restriccion,motivo,estado,
        resuelta_por,fecha_resolucion,resolucion) VALUES($1,'Solicitud de demostración: se adjuntan antecedentes para revisión.',$2,$3,
        CASE WHEN $2::text<>'PENDIENTE' THEN now() ELSE NULL END,$4)`,
      [restriccion.id_restriccion, estado, estado === 'PENDIENTE' ? null : responsable,
        estado === 'PENDIENTE' ? null : aprobada ? 'Documentación de demostración validada correctamente.' : 'Falta documentación de respaldo para aprobar esta solicitud de ejemplo.']);
    }
    await historialPresentacion(academico, actor.id_usuario, periodo.id_periodo);
    await academico.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',
      [actor.id_usuario, VERSION, JSON.stringify({demostracion:true, id_periodo:periodo.id_periodo,
        cursos:cursosNuevos, descripcion:'Datos sintéticos de presentación para los cuatro módulos. No se modifican registros anteriores.'})]);
    await academico.query('COMMIT');
    console.log('Datos de presentación agregados: notas, asistencia, encuestas, solicitudes, nóminas, oferta y lista de espera.');
  } finally {
    await auth.query('SELECT pg_advisory_unlock(17007,1)');
  }
}

async function main() {
  const docker = process.env.DB_HOST === 'auth-db';
  const nombres = ['auth','usuarios','catalogo','academico'];
  const clientes = nombres.map((nombre,i) => new Client({
    host:process.env[`${nombre.toUpperCase()}_DB_HOST`] || (docker ? `${nombre}-db` : 'localhost'),
    port:Number(process.env[`${nombre.toUpperCase()}_DB_PORT`] || (docker ? 5432 : 5433 + i)),
    database:`${nombre}_db`, user:process.env.DB_USER || 'postgres', password:process.env.DB_PASSWORD || 'postgres',
  }));
  try {
    for (const db of clientes) await db.connect();
    await preparar(Object.fromEntries(nombres.map((nombre,i) => [nombre, clientes[i]])));
  } catch (error) {
    for (const db of clientes) await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    for (const db of clientes) await db.end().catch(() => {});
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {preparar};
