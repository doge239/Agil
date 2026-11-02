const pool = require('../config/database');
const axios = require('axios');
const { exigir, idPositivo, texto } = require('../domain/estudiante');

async function remoto(req, ruta, servicio='USUARIOS_SERVICE_URL') {
  try { return (await axios.get(`${process.env[servicio]}${ruta}`, { headers: { Authorization: req.headers.authorization }, timeout: 8000 })).data; }
  catch (e) { exigir(false, [400,401,403,404].includes(e.response?.status) ? e.response.status : 503, e.response?.data?.mensaje || 'Usuarios no disponible'); }
}
const general = fn => async (req, res) => {
  try {
    exigir(req.usuario?.roles?.includes('ADMIN_GENERAL'), 403, 'Se requiere Administración General');
    req.body ??= {};
    await fn(req, res);
  } catch (e) {
    if (!e.status) console.error(e.message);
    res.status(e.status || (e.code === '23505' ? 409 : 500)).json({ mensaje: e.status ? e.message : e.code === '23505' ? 'Ya existe un registro con esos datos' : 'No se pudo completar la operación institucional' });
  }
};
async function transaccion(fn) {
  const db = await pool.connect();
  try { await db.query('BEGIN'); const r = await fn(db); await db.query('COMMIT'); return r; }
  catch (e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
}
async function auditar(db, req, accion, detalle) {
  await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)', [req.usuario.id_usuario, accion, JSON.stringify(detalle)]);
}
function version(actual, recibida) {
  exigir(Number.isInteger(recibida) && recibida > 0, 400, 'Versión inválida');
  exigir(actual === recibida, 409, 'El registro cambió. Recarga antes de guardar.');
}
function fecha(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
exports.periodos = general(async (req,res) => res.json({ periodos: (await pool.query("SELECT *, (estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin) AS vigente FROM periodo_academico ORDER BY anio DESC,semestre DESC")).rows }));
exports.crearPeriodo = general(async (req,res) => {
  const { anio, semestre, fecha_inicio, fecha_fin } = req.body;
  exigir(Number.isInteger(anio) && anio >= 2000 && anio <= 2200 && [1,2].includes(semestre), 400, 'Año o semestre inválido');
  exigir(fecha(fecha_inicio) && fecha(fecha_fin) && fecha_inicio <= fecha_fin && Number(fecha_inicio.slice(0,4)) === anio, 400, 'Fechas inválidas para el año académico');
  const motivo = texto(req.body.motivo,10,2000,'Motivo');
  const periodo = await transaccion(async db => {
    const r = await db.query("INSERT INTO periodo_academico(anio,semestre,fecha_inicio,fecha_fin,estado,inscripcion_abierta) VALUES($1,$2,$3,$4,'ACTIVO',false) RETURNING *",[anio,semestre,fecha_inicio,fecha_fin]);
    await auditar(db,req,'GENERAL_CREAR_PERIODO',{nuevo:r.rows[0],motivo}); return r.rows[0];
  }); res.status(201).json({periodo});
});
exports.editarPeriodo = general(async (req,res) => {
  const id = idPositivo(req.params.idPeriodo,'Período'), motivo = texto(req.body.motivo,10,2000,'Motivo');
  exigir(['ACTIVO','CERRADO'].includes(req.body.estado) && typeof req.body.inscripcion_abierta === 'boolean',400,'Estado o disponibilidad inválidos');
  exigir(req.body.estado === 'ACTIVO' || !req.body.inscripcion_abierta,409,'Un período cerrado no admite inscripción');
  const periodo = await transaccion(async db => {
    const anterior = (await db.query('SELECT * FROM periodo_academico WHERE id_periodo=$1 FOR UPDATE',[id])).rows[0];
    exigir(anterior,404,'Período no encontrado'); version(anterior.version,req.body.version);
    const r = await db.query('UPDATE periodo_academico SET estado=$2,inscripcion_abierta=$3,version=version+1 WHERE id_periodo=$1 RETURNING *',[id,req.body.estado,req.body.inscripcion_abierta]);
    await auditar(db,req,'GENERAL_EDITAR_PERIODO',{anterior,nuevo:r.rows[0],motivo}); return r.rows[0];
  }); res.json({periodo});
});
exports.resumen = general(async (req,res) => res.json({ resumen: (await pool.query(`SELECT
  (SELECT count(*)::int FROM periodo_academico WHERE estado='ACTIVO') AS periodos_activos,
  (SELECT count(*)::int FROM periodo_academico WHERE inscripcion_abierta AND estado='ACTIVO') AS inscripciones_abiertas,
  (SELECT count(*)::int FROM restriccion WHERE activa AND id_unidad IS NULL) AS restricciones_globales,
  (SELECT count(*)::int FROM solicitud_levantamiento WHERE estado='PENDIENTE') AS solicitudes_pendientes,
  (SELECT count(*)::int FROM curso WHERE estado='ACTIVO') AS cursos_activos`)).rows[0] }));
exports.estudiantes = general(async (req,res) => {
  const q = req.query.q ?? ''; exigir(typeof q === 'string' && q.length <= 100,400,'Búsqueda inválida');
  res.json(await remoto(req,`/usuarios/general/estudiantes?q=${encodeURIComponent(q)}`));
});
exports.restricciones = general(async (req,res) => {
  const id = req.query.estudiante === undefined ? null : idPositivo(req.query.estudiante,'Estudiante');
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  exigir(Number.isSafeInteger(offset) && offset >= 0 && offset <= 1000000,400,'Página inválida');
  const r = await pool.query('SELECT *, count(*) OVER()::int AS total FROM restriccion WHERE ($1::int IS NULL OR id_estudiante=$1) ORDER BY activa DESC,id_restriccion DESC LIMIT 50 OFFSET $2',[id,offset]);
  res.json({restricciones:r.rows,total:r.rows[0]?.total ?? 0});
});
exports.crearRestriccion = general(async (req,res) => {
  const id = idPositivo(req.body.id_estudiante,'Estudiante'), tipo = texto(req.body.tipo,3,100,'Tipo'), descripcion = texto(req.body.descripcion,10,2000,'Descripción');
  const p = (await remoto(req,'/usuarios/me')).perfil;
  exigir(p.id_estudiante !== id,403,'No puedes administrar tus propias restricciones');
  const datos = await remoto(req,`/usuarios/general/estudiantes?id=${id}`);
  exigir(datos.estudiantes.length,404,'Estudiante no encontrado');
  const restriccion = await transaccion(async db => {
    await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[id]);
    const r = await db.query('INSERT INTO restriccion(id_estudiante,tipo,descripcion,id_unidad,creada_por) VALUES($1,$2,$3,NULL,$4) RETURNING *',[id,tipo,descripcion,req.usuario.id_usuario]);
    await auditar(db,req,'GENERAL_CREAR_RESTRICCION',{nuevo:r.rows[0]}); return r.rows[0];
  }); res.status(201).json({restriccion});
});
exports.levantarRestriccion = general(async (req,res) => {
  const id = idPositivo(req.params.idRestriccion,'Restricción'), motivo = texto(req.body.motivo,10,2000,'Motivo');
  const p = (await remoto(req,'/usuarios/me')).perfil;
  await transaccion(async db => {
    const r = (await db.query('SELECT * FROM restriccion WHERE id_restriccion=$1 FOR UPDATE',[id])).rows[0];
    exigir(r,404,'Restricción no encontrada'); exigir(r.id_estudiante !== p.id_estudiante,403,'No puedes levantar tu propia restricción');
    version(r.version,req.body.version); exigir(r.activa,409,'La restricción ya fue levantada');
    await db.query('UPDATE restriccion SET activa=false,fecha_levantamiento=now(),levantada_por=$2,motivo_levantamiento=$3,version=version+1 WHERE id_restriccion=$1',[id,req.usuario.id_usuario,motivo]);
    await db.query("UPDATE solicitud_levantamiento SET estado='APROBADA',resolucion=$2,resuelta_por=$3,fecha_resolucion=now() WHERE id_restriccion=$1 AND estado='PENDIENTE'",[id,motivo,req.usuario.id_usuario]);
    await auditar(db,req,'GENERAL_LEVANTAR_RESTRICCION',{anterior:r,motivo});
  }); res.json({mensaje:'Restricción levantada'});
});
exports.auditoria = general(async (req,res) => {
  const accion = req.query.accion ?? '', offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  exigir(typeof accion === 'string' && accion.length <= 100 && Number.isSafeInteger(offset) && offset >= 0 && offset <= 1000000,400,'Filtro inválido');
  const r = await pool.query("SELECT *,count(*) OVER()::int AS total FROM auditoria_academica WHERE ($1='' OR accion=$1) ORDER BY id_auditoria DESC LIMIT 50 OFFSET $2",[accion,offset]);
  res.json({auditoria:r.rows,total:r.rows[0]?.total ?? 0});
});

exports.cursos = general(async(req,res)=>{
  const periodo=req.query.periodo===undefined?null:idPositivo(req.query.periodo,'Período');
  const unidad=req.query.unidad===undefined?null:idPositivo(req.query.unidad,'Unidad');
  const asignaturas=(await remoto(req,'/catalogo/asignaturas','CATALOGO_SERVICE_URL')).asignaturas;
  const unidades=(await remoto(req,'/catalogo/general/unidades','CATALOGO_SERVICE_URL')).unidades;
  const r=await pool.query(`SELECT c.*,p.anio,p.semestre,p.estado AS estado_periodo,
    (SELECT count(*)::int FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado='ACTIVA') AS inscritos,
    COALESCE((SELECT json_agg(h ORDER BY h.dia_semana,h.hora_inicio) FROM horario h WHERE h.id_curso=c.id_curso),'[]') AS horarios
    FROM curso c JOIN periodo_academico p USING(id_periodo)
    WHERE ($1::int IS NULL OR c.id_periodo=$1) AND ($2::int IS NULL OR c.id_unidad=$2) ORDER BY p.anio DESC,p.semestre DESC,c.id_curso`,[periodo,unidad]);
  res.json({cursos:r.rows.map(c=>({...c,nombre:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.nombre??`Asignatura #${c.id_asignatura}`,codigo:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.codigo??'',unidad:unidades.find(u=>u.id_unidad===c.id_unidad)?.nombre??`Unidad #${c.id_unidad}`}))});
});
exports.crearCurso = general(async(req,res)=>{
  const b=req.body,asignatura=idPositivo(b.id_asignatura,'Asignatura'),unidad=idPositivo(b.id_unidad,'Unidad'),periodo=idPositivo(b.id_periodo,'Período'),seccion=idPositivo(b.seccion,'Sección'),cupo=idPositivo(b.cupo_maximo,'Cupo'),motivo=texto(b.motivo,10,2000,'Motivo');
  const oferta=await remoto(req,`/catalogo/general/oferta?unidad=${unidad}`,'CATALOGO_SERVICE_URL');
  exigir(oferta.asignaturas.some(a=>a.id_asignatura===asignatura),409,'La asignatura no pertenece a un plan activo de la unidad');
  const curso=await transaccion(async db=>{
    exigir((await db.query("SELECT 1 FROM periodo_academico WHERE id_periodo=$1 AND estado='ACTIVO' FOR SHARE",[periodo])).rowCount,409,'Período cerrado o inexistente');
    const nuevo=(await db.query('INSERT INTO curso(id_asignatura,id_unidad,id_periodo,seccion,cupo_maximo) VALUES($1,$2,$3,$4,$5) RETURNING *',[asignatura,unidad,periodo,seccion,cupo])).rows[0];
    await auditar(db,req,'GENERAL_CREAR_CURSO',{nuevo,motivo});return nuevo;
  });res.status(201).json({curso});
});
exports.editarCurso = general(async(req,res)=>{
  const id=idPositivo(req.params.idCurso,'Curso'),cupo=idPositivo(req.body.cupo_maximo,'Cupo'),motivo=texto(req.body.motivo,10,2000,'Motivo');
  exigir(['ACTIVO','INACTIVO'].includes(req.body.estado),400,'Estado inválido');
  const curso=await transaccion(async db=>{
    const anterior=(await db.query('SELECT c.*,p.estado AS estado_periodo FROM curso c JOIN periodo_academico p USING(id_periodo) WHERE c.id_curso=$1 FOR UPDATE OF c FOR SHARE OF p',[id])).rows[0];
    exigir(anterior,404,'Curso no encontrado');exigir(anterior.estado_periodo==='ACTIVO',409,'El período está cerrado');version(anterior.version,req.body.version);
    const inscritos=(await db.query("SELECT count(*)::int AS n FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'",[id])).rows[0].n;
    exigir(cupo>=inscritos,409,'El cupo no puede ser menor que los inscritos');exigir(req.body.estado==='ACTIVO'||inscritos===0,409,'No puedes desactivar un curso con inscripciones activas');
    const nuevo=(await db.query('UPDATE curso SET cupo_maximo=$2,estado=$3,cupo_actual=$4,version=version+1 WHERE id_curso=$1 RETURNING *',[id,cupo,req.body.estado,inscritos])).rows[0];
    await auditar(db,req,'GENERAL_EDITAR_CURSO',{anterior,nuevo,motivo});return nuevo;
  });res.json({curso});
});
