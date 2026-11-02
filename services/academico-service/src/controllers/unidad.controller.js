const pool=require('../config/database');
const axios=require('axios');
const {exigir,idPositivo,texto,hayChoque}=require('../domain/estudiante');
async function remoto(req,variable,ruta) {
  try{return (await axios.get(`${process.env[variable]}${ruta}`,{headers:{Authorization:req.headers.authorization},timeout:8000})).data;}
  catch(e){exigir(false,[400,401,403,404,409].includes(e.response?.status)?e.response.status:503,e.response?.data?.mensaje||'Servicio no disponible');}
}
const unidad=fn=>async(req,res)=> {
  try{
    exigir(req.usuario?.roles?.includes('ADMIN_UNIDAD'),403,'Se requiere Administración de Unidad');
    const {perfil:p}=await remoto(req,'USUARIOS_SERVICE_URL','/usuarios/me');exigir(p?.id_unidad_admin,403,'Administrador sin unidad asignada');
    req.body??={};await fn(req,res,p);
  }catch(e){if(!e.status)console.error(e.message);res.status(e.status||(e.code==='23505'?409:500)).json({mensaje:e.status?e.message:e.code==='23505'?'Ya existe un registro con esos datos':'No se pudo completar la operación de unidad'});}
};
async function transaccion(fn){const db=await pool.connect();try{await db.query('BEGIN');const r=await fn(db);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
async function auditar(db,req,accion,detalle){await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[req.usuario.id_usuario,accion,JSON.stringify(detalle)]);}
async function curso(req,p,db=pool,escritura=false){
  const id=idPositivo(req.params.idCurso,'Curso');const r=await db.query(`SELECT c.*,pa.estado AS estado_periodo FROM curso c JOIN periodo_academico pa USING(id_periodo) WHERE c.id_curso=$1 AND c.id_unidad=$2 ${escritura?'FOR UPDATE OF c FOR SHARE OF pa':''}`,[id,p.id_unidad_admin]);
  exigir(r.rowCount,403,'El curso no pertenece a tu unidad');if(escritura)exigir(r.rows[0].estado_periodo==='ACTIVO',409,'El período está cerrado');return r.rows[0];
}
async function estudiante(req,id){const datos=await remoto(req,'USUARIOS_SERVICE_URL',`/usuarios/unidad/estudiantes?id=${id}`);exigir(datos.estudiantes.length,403,'El estudiante no pertenece a tu unidad');return datos.estudiantes[0];}
function version(actual,recibida){exigir(Number.isInteger(recibida)&&recibida>0,400,'Versión inválida');exigir(actual===recibida,409,'El registro cambió. Recarga antes de guardar.');}
async function asignaturasUnidad(req,p){
  const {carreras}=await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/carreras');
  const ids=new Set();
  for(const c of carreras.filter(c=>c.id_unidad===p.id_unidad_admin&&c.estado==='ACTIVA')){
    try{
      const m=await remoto(req,'CATALOGO_SERVICE_URL',`/catalogo/carreras/${c.id_carrera}/malla`);
      for(const plan of m.planes.filter(p=>p.estado==='ACTIVO')){
        const datos=plan.id_plan===m.plan.id_plan?m:await remoto(req,'CATALOGO_SERVICE_URL',`/catalogo/carreras/${c.id_carrera}/malla?plan=${plan.id_plan}`);
        datos.malla.forEach(a=>ids.add(a.id_asignatura));
      }
    }catch(e){if(e.status!==404)throw e;}
  }
  const {asignaturas}=await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas');return asignaturas.filter(a=>ids.has(a.id_asignatura)&&a.estado==='ACTIVA');
}
exports.periodos=unidad(async(req,res)=>res.json({periodos:(await pool.query("SELECT *, (estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin) AS vigente FROM periodo_academico ORDER BY anio DESC,semestre DESC")).rows}));
exports.asignaturas=unidad(async(req,res,p)=>res.json({asignaturas:await asignaturasUnidad(req,p)}));
exports.buscar=unidad(async(req,res)=>{
  const ruta=req.path.endsWith('/docentes')?'docentes':'estudiantes';const query=new URLSearchParams();
  if(req.query.q!==undefined){exigir(typeof req.query.q==='string'&&req.query.q.length<=100,400,'Búsqueda inválida');query.set('q',req.query.q);}
  res.json(await remoto(req,'USUARIOS_SERVICE_URL',`/usuarios/unidad/${ruta}?${query}`));
});
exports.cursos=unidad(async(req,res,p)=> {
  const periodo=req.query.periodo===undefined?null:idPositivo(req.query.periodo,'Período');
  const {asignaturas}=await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas');
  const docentes=(await remoto(req,'USUARIOS_SERVICE_URL','/usuarios/unidad/docentes')).docentes;
  const r=await pool.query(`SELECT c.*,pa.anio,pa.semestre,pa.estado AS estado_periodo,
    (SELECT count(*)::int FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado='ACTIVA') AS inscritos,
    COALESCE((SELECT json_agg(cd.id_docente) FROM curso_docente cd WHERE cd.id_curso=c.id_curso AND cd.activa),'[]') AS docentes,
    COALESCE((SELECT json_agg(h ORDER BY h.dia_semana,h.hora_inicio) FROM horario h WHERE h.id_curso=c.id_curso),'[]') AS horarios
    FROM curso c JOIN periodo_academico pa USING(id_periodo) WHERE c.id_unidad=$1 AND ($2::int IS NULL OR c.id_periodo=$2) ORDER BY c.id_curso`,[p.id_unidad_admin,periodo]);
  res.json({cursos:r.rows.map(c=>({...c,nombre:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.nombre??`Asignatura #${c.id_asignatura}`,codigo:asignaturas.find(a=>a.id_asignatura===c.id_asignatura)?.codigo??''})),docentes});
});
exports.crearCurso=unidad(async(req,res,p)=> {
  const idAsignatura=idPositivo(req.body.id_asignatura,'Asignatura'),idPeriodo=idPositivo(req.body.id_periodo,'Período'),seccion=idPositivo(req.body.seccion,'Sección'),cupo=idPositivo(req.body.cupo_maximo,'Cupo');
  exigir((await asignaturasUnidad(req,p)).some(a=>a.id_asignatura===idAsignatura),403,'La asignatura no pertenece a la oferta de tu unidad');
  const nuevo=await transaccion(async db=>{
    const per=await db.query("SELECT 1 FROM periodo_academico WHERE id_periodo=$1 AND estado='ACTIVO' FOR SHARE",[idPeriodo]);exigir(per.rowCount,409,'Período no disponible para crear cursos');
    const r=await db.query('INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES($1,$2,$3,$4,$5) RETURNING *',[idAsignatura,idPeriodo,p.id_unidad_admin,seccion,cupo]);
    await auditar(db,req,'UNIDAD_CREAR_CURSO',{id_curso:r.rows[0].id_curso,nuevo:r.rows[0]});return r.rows[0];
  });res.status(201).json({curso:nuevo});
});
exports.editarCurso=unidad(async(req,res,p)=>{
  const cupo=idPositivo(req.body.cupo_maximo,'Cupo');exigir(['ACTIVO','INACTIVO'].includes(req.body.estado),400,'Estado inválido');
  const {curso:nuevo,cupoAumentado}=await transaccion(async db=>{
    const c=await curso(req,p,db,true);version(c.version,req.body.version);
    const inscritos=(await db.query("SELECT count(*)::int AS n FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'",[c.id_curso])).rows[0].n;
    exigir(cupo>=inscritos,409,'El cupo no puede ser menor que los inscritos');exigir(req.body.estado==='ACTIVO'||inscritos===0,409,'No puedes desactivar un curso con inscripciones activas');
    const r=await db.query('UPDATE curso SET cupo_maximo=$2,estado=$3,cupo_actual=$4,version=version+1 WHERE id_curso=$1 RETURNING *',[c.id_curso,cupo,req.body.estado,inscritos]);
    await auditar(db,req,'UNIDAD_EDITAR_CURSO',{id_curso:c.id_curso,anterior:c,nuevo:r.rows[0]});
    return {curso:r.rows[0],cupoAumentado:cupo>c.cupo_maximo};
  });
  let promovidos=0,promocionPendiente=false;
  if(cupoAumentado)try{
    promovidos=await require('../domain/lista-espera').promoverListaEspera(req,nuevo.id_curso);
  }catch(e){
    console.error(`Cupo actualizado; promoción pendiente para curso ${nuevo.id_curso}: ${e.message}`);
    promocionPendiente=true;
  }
  res.json({curso:nuevo,promovidos,promocion_pendiente:promocionPendiente});
});
exports.docente=unidad(async(req,res,p)=>{
  const id=idPositivo(req.params.idDocente,'Docente');const datos=await remoto(req,'USUARIOS_SERVICE_URL',`/usuarios/unidad/docentes?id=${id}`);exigir(datos.docentes.length,403,'El docente no pertenece a tu unidad');
  const motivo=texto(req.body.motivo,10,1000,'Motivo');
  await transaccion(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(17004,$1)',[id]);const c=await curso(req,p,db,true);const asignar=req.method==='PUT';
    if(asignar){
      exigir(c.estado==='ACTIVO',409,'El curso está inactivo');
      const propios=(await db.query('SELECT * FROM horario WHERE id_curso=$1',[c.id_curso])).rows;
      const otros=(await db.query(`SELECT h.* FROM horario h JOIN curso c USING(id_curso) JOIN curso_docente cd USING(id_curso) WHERE cd.id_docente=$1 AND cd.activa AND c.id_periodo=$2 AND c.id_curso<>$3 AND c.estado='ACTIVO'`,[id,c.id_periodo,c.id_curso])).rows;
      exigir(!propios.some(a=>otros.some(b=>hayChoque(a,b))),409,'El docente tiene un choque de horario');
      await db.query('INSERT INTO curso_docente(id_curso,id_docente) VALUES($1,$2) ON CONFLICT(id_curso,id_docente) DO UPDATE SET activa=true,fecha_asignacion=CURRENT_DATE',[c.id_curso,id]);
    }else{
      const r=await db.query('UPDATE curso_docente SET activa=false WHERE id_curso=$1 AND id_docente=$2 AND activa RETURNING id_curso_docente',[c.id_curso,id]);exigir(r.rowCount,404,'No existe una asignación activa');
    }
    await auditar(db,req,asignar?'UNIDAD_ASIGNAR_DOCENTE':'UNIDAD_RETIRAR_DOCENTE',{id_curso:c.id_curso,id_docente:id,motivo});
  });res.json({mensaje:'Asignación docente actualizada'});
});
exports.horarios=unidad(async(req,res,p)=>{
  exigir(Array.isArray(req.body.horarios)&&req.body.horarios.length<=20,400,'Incluye hasta 20 horarios');const horarios=req.body.horarios;
  for(const h of horarios){exigir(['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].includes(h.dia_semana)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.hora_inicio)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.hora_fin)&&h.hora_fin>h.hora_inicio,400,'Horario inválido');exigir(h.sala==null||(typeof h.sala==='string'&&h.sala.length<=50),400,'Sala inválida');}
  exigir(!horarios.some((h,i)=>horarios.slice(i+1).some(o=>hayChoque(h,o))),409,'Los horarios del curso se superponen');
  await transaccion(async db=>{
    const c=await curso(req,p,db,true);version(c.version,req.body.version);
    exigir(!(await db.query("SELECT 1 FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA' LIMIT 1",[c.id_curso])).rowCount,409,'No se puede cambiar el horario con inscripciones activas');
    exigir(!(await db.query('SELECT 1 FROM curso_docente WHERE id_curso=$1 AND activa LIMIT 1',[c.id_curso])).rowCount,409,'Retira las asignaciones docentes antes de cambiar el horario');
    const anterior=(await db.query('SELECT * FROM horario WHERE id_curso=$1',[c.id_curso])).rows;await db.query('DELETE FROM horario WHERE id_curso=$1',[c.id_curso]);
    for(const h of horarios)await db.query('INSERT INTO horario(id_curso,dia_semana,hora_inicio,hora_fin,sala) VALUES($1,$2,$3,$4,$5)',[c.id_curso,h.dia_semana,h.hora_inicio,h.hora_fin,h.sala||null]);
    await db.query('UPDATE curso SET version=version+1 WHERE id_curso=$1',[c.id_curso]);await auditar(db,req,'UNIDAD_HORARIO',{id_curso:c.id_curso,anterior,nuevo:horarios});
  });res.json({mensaje:'Horario actualizado'});
});
exports.inscribir=unidad(async(req,res,p)=>{
  const id=idPositivo(req.params.idCurso,'Curso'),idEstudiante=idPositivo(req.body.id_estudiante,'Estudiante'),motivo=texto(req.body.motivo,10,1000,'Motivo');
  await curso(req,p);const e=await estudiante(req,idEstudiante);exigir(e.id_carrera&&e.id_plan,409,'El estudiante no tiene plan asignado');
  const m=await remoto(req,'CATALOGO_SERVICE_URL',`/catalogo/carreras/${e.id_carrera}/malla?plan=${e.id_plan}`),cat=(await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas')).asignaturas;
  const inscripcion=await require('../domain/inscripcion').inscribirCurso({req,p:e,m,cat,id,tipo:'ADMIN_UNIDAD',motivo,autorizar:c=>exigir(c.id_unidad===p.id_unidad_admin,403,'Curso ajeno a tu unidad')});
  res.status(201).json({inscripcion,mensaje:'Inscripción manual realizada'});
});
exports.restricciones=unidad(async(req,res,p)=>res.json({restricciones:(await pool.query('SELECT * FROM restriccion WHERE id_unidad=$1 ORDER BY activa DESC,fecha_creacion DESC',[p.id_unidad_admin])).rows}));
exports.crearRestriccion=unidad(async(req,res,p)=>{
  const id=idPositivo(req.body.id_estudiante,'Estudiante');await estudiante(req,id);const tipo=texto(req.body.tipo,3,100,'Tipo'),descripcion=texto(req.body.descripcion,10,2000,'Descripción');
  exigir(id!==p.id_estudiante,403,'No puedes administrar tus propias restricciones');
  const restriccion=await transaccion(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[id]);
    const r=await db.query('INSERT INTO restriccion(id_estudiante,tipo,descripcion,id_unidad,creada_por) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,tipo,descripcion,p.id_unidad_admin,req.usuario.id_usuario]);
    await auditar(db,req,'UNIDAD_CREAR_RESTRICCION',{nuevo:r.rows[0]});return r.rows[0];
  });res.status(201).json({restriccion});
});
exports.levantarRestriccion=unidad(async(req,res,p)=>{
  const id=idPositivo(req.params.idRestriccion,'Restricción'),motivo=texto(req.body.motivo,10,2000,'Motivo');
  await transaccion(async db=>{
    const r=(await db.query('SELECT * FROM restriccion WHERE id_restriccion=$1 AND id_unidad=$2 FOR UPDATE',[id,p.id_unidad_admin])).rows[0];
    exigir(r,403,'La restricción no pertenece a tu unidad');exigir(r.id_estudiante!==p.id_estudiante,403,'No puedes levantar tu propia restricción');version(r.version,req.body.version);exigir(r.activa,409,'La restricción ya fue levantada');
    await db.query('UPDATE restriccion SET activa=false,fecha_levantamiento=now(),levantada_por=$2,motivo_levantamiento=$3,version=version+1 WHERE id_restriccion=$1',[id,req.usuario.id_usuario,motivo]);
    await db.query("UPDATE solicitud_levantamiento SET estado='APROBADA',resolucion=$2,resuelta_por=$3,fecha_resolucion=now() WHERE id_restriccion=$1 AND estado='PENDIENTE'",[id,motivo,req.usuario.id_usuario]);
    await auditar(db,req,'UNIDAD_LEVANTAR_RESTRICCION',{id_restriccion:id,anterior:r,motivo});
  });res.json({mensaje:'Restricción levantada'});
});
