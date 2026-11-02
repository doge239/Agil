const pool = require('../config/database');
const axios = require('axios');
const { exigir, idPositivo, texto } = require('../domain/estudiante');

async function consultar(req, variable, ruta) {
  try {
    return (await axios.get(`${process.env[variable]}${ruta}`, {
      headers: { Authorization: req.headers.authorization }, timeout: 8000,
    })).data;
  } catch (e) {
    const status = [401,403,404].includes(e.response?.status) ? e.response.status : 503;
    exigir(false, status, e.response?.data?.mensaje || 'No se pudo consultar el servicio académico');
  }
}
const docente = fn => async (req,res) => {
  try {
    exigir(req.usuario?.roles?.includes('DOCENTE'),403,'Se requiere el perfil Docente');
    const { perfil } = await consultar(req,'USUARIOS_SERVICE_URL','/usuarios/me');
    exigir(perfil?.id_docente,403,'No tienes un perfil docente asociado');
    req.body ??= {};
    await fn(req,res,perfil);
  } catch (e) {
    if (!e.status) console.error(e.message);
    res.status(e.status || (e.code==='23505'?409:500)).json({mensaje:e.status?e.message:e.code==='23505'?'El registro ya existe':'No se pudo completar la operación docente'});
  }
};
async function transaccion(fn) {
  const db=await pool.connect();
  try { await db.query('BEGIN');const r=await fn(db);await db.query('COMMIT');return r; }
  catch(e) { await db.query('ROLLBACK');throw e; } finally { db.release(); }
}
async function curso(req,p,db=pool,escritura=false) {
  const id=idPositivo(req.params.idCurso,'Curso');
  const r=await db.query(`SELECT c.*,pa.estado AS estado_periodo,pa.fecha_inicio,pa.fecha_fin
    FROM curso c JOIN periodo_academico pa USING(id_periodo)
    JOIN curso_docente cd ON cd.id_curso=c.id_curso AND cd.id_docente=$2
    WHERE c.id_curso=$1 ${escritura?'FOR UPDATE OF c FOR SHARE OF cd,pa':''}`,[id,p.id_docente]);
  exigir(r.rowCount,403,'No tienes asignado este curso');
  if(escritura) exigir(r.rows[0].estado==='ACTIVO'&&r.rows[0].estado_periodo==='ACTIVO',409,'El curso o período está cerrado para modificaciones');
  return r.rows[0];
}
async function auditar(db,req,accion,detalle) {
  await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[req.usuario.id_usuario,accion,JSON.stringify(detalle)]);
}
function fecha(value) {
  exigir(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,400,'Fecha inválida');
  return value;
}
function decimal(value,min,max,nombre) {
  exigir(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max&&Math.abs(value*10-Math.round(value*10))<1e-8,400,`${nombre}: entre ${min} y ${max}, con hasta un decimal`);
  return value;
}
function version(value) {
  exigir(Number.isInteger(value)&&value>=0,400,'Versión del registro inválida'); return value;
}
function lote(value) {
  exigir(Array.isArray(value)&&value.length>0&&value.length<=1000,400,'Envía entre 1 y 1000 registros');
  exigir(value.every(v=>typeof v?.id_estudiante==='number'),400,'Los identificadores de estudiantes deben ser numéricos');
  const ids=value.map(v=>idPositivo(v?.id_estudiante,'Estudiante'));
  exigir(new Set(ids).size===ids.length,400,'Hay estudiantes duplicados en el envío');return ids;
}
async function comprobarInscritos(db,idCurso,ids,{sinCierre=false,fechaClase=null}={}) {
  const r=await db.query(`SELECT i.id_estudiante,i.estado,i.fecha_inscripcion::date::text AS fecha_inscripcion,
    EXISTS(SELECT 1 FROM resultado_final r WHERE r.id_inscripcion=i.id_inscripcion) AS cerrado
    FROM inscripcion i WHERE i.id_curso=$1 AND i.id_estudiante=ANY($2::int[]) FOR SHARE OF i`,[idCurso,ids]);
  exigir(ids.every(id=>r.rows.some(i=>i.id_estudiante===id&&i.estado==='ACTIVA')),409,'Solo puedes registrar estudiantes con inscripción activa en este curso');
  if(sinCierre) exigir(!r.rows.some(i=>i.cerrado),409,'Hay estudiantes con resultado final cerrado. Solicita revisión administrativa.');
  if(fechaClase) exigir(r.rows.every(i=>i.fecha_inscripcion<=fechaClase),409,'La clase es anterior a la inscripción de un estudiante');
}
exports.periodos=docente(async(req,res)=>res.json({periodos:(await pool.query("SELECT *, (estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin) AS vigente FROM periodo_academico ORDER BY anio DESC,semestre DESC")).rows}));
exports.cursos=docente(async(req,res,p)=> {
  const id=req.query.periodo===undefined?null:idPositivo(req.query.periodo,'Período');
  const r=await pool.query(`SELECT c.*,pa.anio,pa.semestre,pa.estado AS estado_periodo,
    (SELECT count(*)::int FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado IN ('ACTIVA','FINALIZADA')) AS inscritos,
    COALESCE((SELECT json_agg(h ORDER BY h.dia_semana,h.hora_inicio) FROM horario h WHERE h.id_curso=c.id_curso),'[]') AS horarios
    FROM curso c JOIN curso_docente cd USING(id_curso) JOIN periodo_academico pa USING(id_periodo)
    WHERE cd.id_docente=$1 AND ($2::int IS NULL OR c.id_periodo=$2) ORDER BY pa.anio DESC,pa.semestre DESC,c.id_curso`,[p.id_docente,id]);
  const {asignaturas}=await consultar(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas');
  res.json({cursos:r.rows.map(c=>({...c,nombre:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.nombre??`Asignatura #${c.id_asignatura}`,codigo:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.codigo??''}))});
});
exports.inscripciones=docente(async(req,res,p)=> {
  const c=await curso(req,p);
  const r=await pool.query(`SELECT id_inscripcion,id_estudiante,estado,fecha_inscripcion FROM inscripcion WHERE id_curso=$1 AND estado IN ('ACTIVA','FINALIZADA') ORDER BY id_estudiante`,[c.id_curso]);
  res.json({inscripciones:r.rows});
});
exports.estudiantes=docente(async(req,res,p)=> {
  const c=await curso(req,p);
  const datos=await consultar(req,'USUARIOS_SERVICE_URL',`/usuarios/docente/cursos/${c.id_curso}/estudiantes`);
  res.json(datos);
});
exports.evaluaciones=docente(async(req,res,p)=> {
  const c=await curso(req,p);
  res.json({evaluaciones:(await pool.query('SELECT * FROM evaluacion WHERE id_curso=$1 ORDER BY fecha NULLS LAST,id_evaluacion',[c.id_curso])).rows});
});
exports.guardarEvaluacion=docente(async(req,res,p)=> {
  const id=req.params.idEvaluacion?idPositivo(req.params.idEvaluacion,'Evaluación'):null;
  const nombre=texto(req.body.nombre,3,100,'Nombre');
  const porcentaje=decimal(req.body.porcentaje,0.1,100,'Ponderación');
  const fechaEvaluacion=req.body.fecha==null||req.body.fecha===''?null:fecha(req.body.fecha);
  const evaluacion=await transaccion(async db=> {
    const c=await curso(req,p,db,true);
    let anterior=null;
    if(id) {
      anterior=(await db.query('SELECT * FROM evaluacion WHERE id_evaluacion=$1 AND id_curso=$2 FOR UPDATE',[id,c.id_curso])).rows[0];
      exigir(anterior,404,'Evaluación no encontrada en este curso');
      exigir(anterior.version===version(req.body.version),409,'La evaluación cambió. Actualiza antes de guardar.');
      const cierres=await db.query('SELECT 1 FROM resultado_final r JOIN inscripcion i USING(id_inscripcion) WHERE i.id_curso=$1 LIMIT 1',[c.id_curso]);
      exigir(!cierres.rowCount,409,'No puedes cambiar evaluaciones de un curso con resultados finales cerrados');
    }
    const suma=(await db.query('SELECT COALESCE(sum(porcentaje),0) AS total FROM evaluacion WHERE id_curso=$1 AND ($2::int IS NULL OR id_evaluacion<>$2)',[c.id_curso,id])).rows[0].total;
    exigir(Math.round(Number(suma)*10)+Math.round(porcentaje*10)<=1000,409,'La suma de ponderaciones no puede superar 100%');
    const r=id?await db.query('UPDATE evaluacion SET nombre=$3,porcentaje=$4,fecha=$5,version=version+1 WHERE id_evaluacion=$1 AND id_curso=$2 RETURNING *',[id,c.id_curso,nombre,porcentaje,fechaEvaluacion]):await db.query('INSERT INTO evaluacion(id_curso,nombre,porcentaje,fecha) VALUES($1,$2,$3,$4) RETURNING *',[c.id_curso,nombre,porcentaje,fechaEvaluacion]);
    await auditar(db,req,'DOCENTE_EVALUACION',{id_curso:c.id_curso,anterior,nuevo:r.rows[0]});return r.rows[0];
  });res.status(id?200:201).json({evaluacion});
});
exports.notas=docente(async(req,res,p)=> {
  const c=await curso(req,p);const id=idPositivo(req.params.idEvaluacion,'Evaluación');
  exigir((await pool.query('SELECT 1 FROM evaluacion WHERE id_evaluacion=$1 AND id_curso=$2',[id,c.id_curso])).rowCount,404,'Evaluación no encontrada en este curso');
  res.json({notas:(await pool.query(`SELECT i.id_estudiante,cal.nota,COALESCE(cal.version,0) AS version,
    EXISTS(SELECT 1 FROM resultado_final r WHERE r.id_inscripcion=i.id_inscripcion) AS cerrado,i.estado
    FROM inscripcion i LEFT JOIN calificacion cal ON cal.id_estudiante=i.id_estudiante AND cal.id_evaluacion=$2
    WHERE i.id_curso=$1 AND i.estado IN ('ACTIVA','FINALIZADA') ORDER BY i.id_estudiante`,[c.id_curso,id])).rows});
});
exports.guardarNotas=docente(async(req,res,p)=> {
  const id=idPositivo(req.params.idEvaluacion,'Evaluación');const ids=lote(req.body.notas);
  for(const n of req.body.notas){decimal(n.nota,1,7,'Nota');version(n.version);}
  await transaccion(async db=> {
    const c=await curso(req,p,db,true);
    exigir((await db.query('SELECT 1 FROM evaluacion WHERE id_evaluacion=$1 AND id_curso=$2 FOR UPDATE',[id,c.id_curso])).rowCount,404,'Evaluación no encontrada en este curso');
    await comprobarInscritos(db,c.id_curso,ids,{sinCierre:true});
    const anteriores=(await db.query('SELECT * FROM calificacion WHERE id_evaluacion=$1 AND id_estudiante=ANY($2::int[]) FOR UPDATE',[id,ids])).rows;
    for(const n of req.body.notas) {
      const anterior=anteriores.find(a=>a.id_estudiante===n.id_estudiante)||null;
      exigir((anterior?.version??0)===n.version,409,'Una nota cambió. Actualiza antes de guardar.');
      await db.query(`INSERT INTO calificacion(id_evaluacion,id_estudiante,nota,id_docente_registro) VALUES($1,$2,$3,$4)
        ON CONFLICT(id_evaluacion,id_estudiante) DO UPDATE SET nota=$3,id_docente_registro=$4,fecha_registro=now(),version=calificacion.version+1`,[id,n.id_estudiante,n.nota,p.id_docente]);
      await auditar(db,req,'DOCENTE_NOTA',{id_curso:c.id_curso,id_evaluacion:id,id_estudiante:n.id_estudiante,anterior,nuevo:n.nota});
    }
  });res.json({mensaje:'Calificaciones guardadas'});
});
exports.historial=docente(async(req,res,p)=> {
  const c=await curso(req,p);
  res.json({historial:(await pool.query(`SELECT id_auditoria,accion,detalle,fecha FROM auditoria_academica
    WHERE detalle->>'id_curso'=$1 AND accion IN ('DOCENTE_NOTA','DOCENTE_EVALUACION','DOCENTE_ASISTENCIA','DOCENTE_CLASE') ORDER BY id_auditoria DESC LIMIT 200`,[String(c.id_curso)])).rows});
});
exports.clases=docente(async(req,res,p)=> {
  const c=await curso(req,p);res.json({clases:(await pool.query('SELECT * FROM clase WHERE id_curso=$1 ORDER BY fecha DESC,hora_inicio DESC,id_clase DESC',[c.id_curso])).rows});
});
exports.crearClase=docente(async(req,res,p)=> {
  const fechaClase=fecha(req.body.fecha);const {hora_inicio,hora_fin}=req.body;
  exigir(typeof hora_inicio==='string'&&typeof hora_fin==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(hora_inicio)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(hora_fin)&&hora_fin>hora_inicio,400,'Horario de clase inválido');
  const clase=await transaccion(async db=> {
    const c=await curso(req,p,db,true);
    const duplicada=await db.query('SELECT 1 FROM clase WHERE id_curso=$1 AND fecha=$2 AND hora_inicio=$3 AND hora_fin=$4',[c.id_curso,fechaClase,hora_inicio,hora_fin]);
    exigir(!duplicada.rowCount,409,'La clase ya está registrada');
    const r=await db.query('INSERT INTO clase(id_curso,fecha,hora_inicio,hora_fin,id_docente_creacion) VALUES($1,$2,$3,$4,$5) RETURNING *',[c.id_curso,fechaClase,hora_inicio,hora_fin,p.id_docente]);
    await auditar(db,req,'DOCENTE_CLASE',{id_curso:c.id_curso,nuevo:r.rows[0]});return r.rows[0];
  });res.status(201).json({clase});
});
exports.asistencias=docente(async(req,res,p)=> {
  const c=await curso(req,p);const id=idPositivo(req.params.idClase,'Clase');
  const clase=(await pool.query('SELECT *,fecha::text AS dia FROM clase WHERE id_clase=$1 AND id_curso=$2',[id,c.id_curso])).rows[0];
  exigir(clase,404,'Clase no encontrada en este curso');
  res.json({asistencias:(await pool.query(`SELECT i.id_estudiante,a.estado,a.observacion,COALESCE(a.version,0) AS version,i.estado AS estado_inscripcion
    FROM inscripcion i LEFT JOIN asistencia a ON a.id_clase=$2 AND a.id_estudiante=i.id_estudiante
    WHERE i.id_curso=$1 AND i.estado IN ('ACTIVA','FINALIZADA') AND (i.fecha_inscripcion::date<=$3::date OR a.id_asistencia IS NOT NULL) ORDER BY i.id_estudiante`,[c.id_curso,id,clase.dia])).rows});
});
exports.guardarAsistencias=docente(async(req,res,p)=> {
  const id=idPositivo(req.params.idClase,'Clase');const ids=lote(req.body.asistencias);
  for(const a of req.body.asistencias) {
    exigir(['PRESENTE','AUSENTE','JUSTIFICADO','ATRASADO'].includes(a.estado),400,'Estado de asistencia inválido');version(a.version);
    exigir(a.observacion==null||(typeof a.observacion==='string'&&a.observacion.length<=500),400,'Observación: máximo 500 caracteres');
  }
  await transaccion(async db=> {
    const c=await curso(req,p,db,true);
    const cl=(await db.query('SELECT *,fecha::text AS dia,fecha<=CURRENT_DATE AS realizada FROM clase WHERE id_clase=$1 AND id_curso=$2 FOR UPDATE',[id,c.id_curso])).rows[0];
    exigir(cl,404,'Clase no encontrada en este curso');exigir(cl.realizada,409,'No puedes registrar asistencia de una clase futura');
    await comprobarInscritos(db,c.id_curso,ids,{fechaClase:cl.dia});
    const anteriores=(await db.query('SELECT * FROM asistencia WHERE id_clase=$1 AND id_estudiante=ANY($2::int[]) FOR UPDATE',[id,ids])).rows;
    for(const a of req.body.asistencias) {
      const anterior=anteriores.find(r=>r.id_estudiante===a.id_estudiante)||null;
      exigir((anterior?.version??0)===a.version,409,'Una asistencia cambió. Actualiza antes de guardar.');
      await db.query(`INSERT INTO asistencia(id_clase,id_estudiante,estado,observacion) VALUES($1,$2,$3,$4)
        ON CONFLICT(id_clase,id_estudiante) DO UPDATE SET estado=$3,observacion=$4,version=asistencia.version+1`,[id,a.id_estudiante,a.estado,a.observacion?.trim()||null]);
      await auditar(db,req,'DOCENTE_ASISTENCIA',{id_curso:c.id_curso,id_clase:id,id_estudiante:a.id_estudiante,anterior,nuevo:a});
    }
  });res.json({mensaje:'Asistencia guardada'});
});
