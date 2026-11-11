const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const {randomUUID} = require('node:crypto');
const {exigir, idPositivo} = require('../domain/estudiante');
const {docente, curso, transaccion, auditar, consultar} = require('./docente.controller').contextoDocente;

const diaLocal = "(clock_timestamp() AT TIME ZONE 'America/Santiago')::date";
const clave = () => `${process.env.JWT_SECRET}:asistencia-qr`;
const normalizarRut = valor => typeof valor === 'string' && valor.length <= 20 ? valor.replace(/[.\s-]/g, '').toUpperCase() : '';
function tokenPara(sesion) {
  return jwt.sign({sesion:sesion.id_sesion, exp:Math.floor(new Date(sesion.expira).getTime()/1000)}, clave(),
    {algorithm:'HS256', audience:'banner-asistencia', noTimestamp:true});
}
function leerToken(token) {
  exigir(typeof token === 'string' && token.length <= 1000, 400, 'QR inválido');
  try {
    const datos = jwt.verify(token, clave(), {algorithms:['HS256'], audience:'banner-asistencia'});
    exigir(typeof datos.sesion === 'string' && /^[a-f0-9-]{36}$/.test(datos.sesion), 400, 'QR inválido');
    return datos.sesion;
  } catch (error) {
    exigir(false, 410, error.name === 'TokenExpiredError' ? 'El QR venció. Pide al docente que lo habilite nuevamente.' : 'El QR no es válido. Solicita uno nuevo al docente.');
  }
}
async function claseDelCurso(db, req, c, bloquear=false) {
  const clase = (await db.query(`SELECT *,fecha::text AS dia,fecha=${diaLocal} AS hoy,fecha BETWEEN $3::date AND $4::date AS en_periodo
    FROM clase WHERE id_clase=$1 AND id_curso=$2 ${bloquear?'FOR UPDATE':''}`,
  [idPositivo(req.params.idClase,'Clase'), c.id_curso,c.fecha_inicio,c.fecha_fin])).rows[0];
  exigir(clase, 404, 'Clase no encontrada en este curso');
  return clase;
}
function presentarSesion(sesion) {
  return sesion ? {...sesion, token:sesion.activa ? tokenPara(sesion) : null} : null;
}

exports.resumen = docente(async(req,res,p) => {
  const c = await curso(req,p);
  const clases = await pool.query(`SELECT id_clase,id_curso,fecha::text AS fecha,hora_inicio,hora_fin FROM clase WHERE id_curso=$1 AND fecha<=${diaLocal}
    ORDER BY fecha,hora_inicio,id_clase`, [c.id_curso]);
  const asistencias = await pool.query(`SELECT a.* FROM asistencia a JOIN clase cl USING(id_clase)
    WHERE cl.id_curso=$1 AND cl.fecha<=${diaLocal}`, [c.id_curso]);
  const hoy = (await pool.query(`SELECT ${diaLocal}::text AS fecha`)).rows[0].fecha;
  res.set('Cache-Control','no-store').json({clases:clases.rows, asistencias:asistencias.rows,fecha_hoy:hoy});
});
exports.obtener = docente(async(req,res,p) => {
  const c = await curso(req,p);
  const clase = await claseDelCurso(pool,req,c);
  const sesion = (await pool.query(`SELECT *,cerrada IS NULL AND expira>now() AS activa
    FROM sesion_asistencia_qr WHERE id_clase=$1 ORDER BY creada DESC LIMIT 1`, [clase.id_clase])).rows[0];
  res.set('Cache-Control','no-store').json({sesion:presentarSesion(sesion)});
});
exports.abrir = docente(async(req,res,p) => {
  const minutos = req.body.duracion_minutos ?? 10;
  exigir(Number.isInteger(minutos) && minutos>=1 && minutos<=30, 400, 'Duración del QR: entre 1 y 30 minutos');
  const sesion = await transaccion(async db => {
    const c = await curso(req,p,db,true);
    const clase = await claseDelCurso(db,req,c,true);
    exigir(clase.hoy,409,'Solo puedes habilitar el QR para una clase de hoy');
    exigir(clase.en_periodo,409,'La clase está fuera de las fechas del período');
    await db.query('UPDATE sesion_asistencia_qr SET cerrada=now() WHERE id_clase=$1 AND cerrada IS NULL',[clase.id_clase]);
    const nueva = (await db.query(`INSERT INTO sesion_asistencia_qr(id_sesion,id_clase,id_docente,creada_por,creada,expira)
      VALUES($1,$2,$3,$4,clock_timestamp(),LEAST(clock_timestamp()+$5::int*interval '1 minute',
      ((${diaLocal}+1)::timestamp AT TIME ZONE 'America/Santiago'))) RETURNING *,TRUE AS activa`,
    [randomUUID(),clase.id_clase,p.id_docente,req.usuario.id_usuario,minutos])).rows[0];
    await auditar(db,req,'DOCENTE_QR_ABRIR',{id_curso:c.id_curso,id_clase:clase.id_clase,id_sesion:nueva.id_sesion,nuevo:{nombre:'QR habilitado'},expira:nueva.expira});
    return nueva;
  });
  res.status(201).set('Cache-Control','no-store').json({sesion:presentarSesion(sesion)});
});
exports.cerrar = docente(async(req,res,p) => {
  exigir(req.body.marcar_ausentes === undefined || typeof req.body.marcar_ausentes === 'boolean',400,'Indica si deseas marcar los pendientes como ausentes');
  const resultado = await transaccion(async db => {
    const c = await curso(req,p,db,true);
    const clase = await claseDelCurso(db,req,c,true);
    const sesion = (await db.query(`UPDATE sesion_asistencia_qr SET cerrada=now() WHERE id_clase=$1 AND cerrada IS NULL RETURNING *`, [clase.id_clase])).rows[0];
    exigir(sesion,409,'No hay una sesión QR pendiente de cierre para esta clase');
    const nuevos = req.body.marcar_ausentes ? (await db.query(`INSERT INTO asistencia(id_clase,id_estudiante,estado,observacion)
      SELECT $1,i.id_estudiante,'AUSENTE','Sin marcación al cerrar la asistencia QR.' FROM inscripcion i
      WHERE i.id_curso=$2 AND i.estado='ACTIVA' AND i.fecha_inscripcion::date<=$3::date
      AND NOT EXISTS(SELECT 1 FROM asistencia a WHERE a.id_clase=$1 AND a.id_estudiante=i.id_estudiante)
      ON CONFLICT DO NOTHING RETURNING *`, [clase.id_clase,c.id_curso,clase.dia])).rows : [];
    for (const a of nuevos) await auditar(db,req,'DOCENTE_ASISTENCIA',{id_curso:c.id_curso,id_clase:clase.id_clase,
      id_estudiante:a.id_estudiante,anterior:null,nuevo:a});
    await auditar(db,req,'DOCENTE_QR_CERRAR',{id_curso:c.id_curso,id_clase:clase.id_clase,id_sesion:sesion.id_sesion,
      nuevo:{nombre:'QR cerrado'},ausentes_registrados:nuevos.length});
    return {ausentes_registrados:nuevos.length};
  });
  res.json({mensaje:'Sesión QR cerrada',...resultado});
});

const estudiante = fn => async(req,res) => {
  try {
    exigir(req.usuario?.roles?.includes('ESTUDIANTE'),403,'Inicia sesión con tu cuenta de estudiante');
    const id = leerToken(req.params.token);
    const {perfil:p} = await consultar(req,'USUARIOS_SERVICE_URL','/usuarios/me');
    exigir(p?.id_estudiante,403,'Se requiere un perfil de estudiante');
    await fn(req,res,p,id);
  } catch (error) {
    if (!error.status) console.error(error.message);
    res.status(error.status || 500).json({mensaje:error.status ? error.message : 'No se pudo completar el registro de asistencia'});
  }
};
async function validarSesion(db, id, estudiante, bloquear=false) {
  // Mismo orden de bloqueos que las escrituras docentes: curso, clase/sesión, asistencia.
  const datos = (await db.query(`SELECT c.*,cl.fecha::text AS dia,cl.id_clase,s.id_docente,s.expira,s.cerrada,
    s.expira>now() AS vigente,cl.fecha=${diaLocal} AS hoy,pa.estado AS estado_periodo
    FROM sesion_asistencia_qr s JOIN clase cl USING(id_clase) JOIN curso c USING(id_curso)
    JOIN periodo_academico pa USING(id_periodo) WHERE s.id_sesion=$1 ${bloquear?'FOR UPDATE OF c FOR SHARE OF pa':''}`, [id])).rows[0];
  exigir(datos,410,'La sesión QR no existe');
  // Se relee la sesión después del bloqueo del curso, por si un cierre esperaba concurrentemente.
  const sesion = (await db.query(`SELECT *,expira>clock_timestamp() AS vigente,${diaLocal}::text AS hoy FROM sesion_asistencia_qr WHERE id_sesion=$1 ${bloquear?'FOR UPDATE':''}`, [id])).rows[0];
  exigir(!sesion.cerrada && sesion.vigente && datos.dia===sesion.hoy,410,'La sesión QR venció o fue cerrada por el docente');
  exigir(datos.estado==='ACTIVO' && datos.estado_periodo==='ACTIVO',409,'El curso o período está cerrado');
  const asignacion = await db.query(`SELECT 1 FROM curso_docente WHERE id_curso=$1 AND id_docente=$2 AND activa ${bloquear?'FOR SHARE':''}`,
    [datos.id_curso,datos.id_docente]);
  exigir(asignacion.rowCount,410,'El docente ya no tiene asignado este curso');
  const inscripcion = await db.query(`SELECT 1 FROM inscripcion WHERE id_curso=$1 AND id_estudiante=$2
    AND estado='ACTIVA' AND fecha_inscripcion::date<=$3::date ${bloquear?'FOR SHARE':''}`, [datos.id_curso,estudiante,datos.dia]);
  exigir(inscripcion.rowCount,403,'No estás inscrito en este curso a la fecha de la clase');
  return datos;
}
exports.consultarEstudiante = estudiante(async(req,res,p,id) => {
  const datos = await validarSesion(pool,id,p.id_estudiante);
  const asistencia = (await pool.query('SELECT estado FROM asistencia WHERE id_clase=$1 AND id_estudiante=$2', [datos.id_clase,p.id_estudiante])).rows[0];
  const {asignaturas} = await consultar(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas');
  const asignatura = asignaturas.find(a=>a.id_asignatura===datos.id_asignatura);
  res.set('Cache-Control','no-store').json({clase:{id_clase:datos.id_clase,fecha:datos.dia,seccion:datos.seccion,
    nombre:asignatura?.nombre || 'Clase',codigo:asignatura?.codigo || ''},expira:datos.expira,
    estado:asistencia?.estado || null,tiene_rut:Boolean(p.rut)});
});
exports.marcar = estudiante(async(req,res,p,id) => {
  const rut = normalizarRut(req.body?.rut);
  exigir(p.rut,409,'Tu perfil no tiene RUT registrado. Solicita su actualización antes de marcar asistencia.');
  exigir(/^\d{7,8}[\dK]$/.test(rut) && rut===normalizarRut(p.rut),400,'El RUT debe coincidir con el de tu cuenta de estudiante');
  const resultado = await transaccion(async db => {
    const datos = await validarSesion(db,id,p.id_estudiante,true);
    const previa = (await db.query('SELECT * FROM asistencia WHERE id_clase=$1 AND id_estudiante=$2 FOR UPDATE', [datos.id_clase,p.id_estudiante])).rows[0];
    if (previa) return {registrada:false,estado:previa.estado,mensaje:'Ya tienes un registro para esta clase. Solo el docente puede modificarlo.'};
    const nueva = (await db.query(`INSERT INTO asistencia(id_clase,id_estudiante,estado,origen,id_sesion_qr)
      VALUES($1,$2,'PRESENTE','QR',$3) RETURNING *`, [datos.id_clase,p.id_estudiante,id])).rows[0];
    await auditar(db,req,'DOCENTE_ASISTENCIA',{id_curso:datos.id_curso,id_clase:datos.id_clase,
      id_estudiante:p.id_estudiante,origen:'QR',anterior:null,nuevo:{estado:'PRESENTE'},id_sesion:id});
    return {registrada:true,estado:nueva.estado,mensaje:'Tu asistencia quedó registrada correctamente.'};
  });
  res.json(resultado);
});
