const pool = require('../config/database');
const axios = require('axios');
const { randomUUID } = require('node:crypto');
const { exigir, idPositivo, texto, hayChoque, respuestasValidas, progreso } = require('../domain/estudiante');
const { crearCertificado, crearAsignacionFamiliar } = require('../domain/pdf');
async function remoto(req, servicio, ruta) {
  try { return (await axios.get(`${process.env[servicio]}${ruta}`, { headers:{Authorization:req.headers.authorization},timeout:8000 })).data; }
  catch(e) { const status=[401,403,404,409].includes(e.response?.status)?e.response.status:503; const error=new Error(e.response?.data?.mensaje||'No se pudo consultar usuarios o catálogo'); error.status=status; throw error; }
}
async function perfil(req) {
  const {perfil:p}=await remoto(req,'USUARIOS_SERVICE_URL','/usuarios/me');
  exigir(p?.id_estudiante,403,'Se requiere un perfil de estudiante'); return p;
}
async function periodo(req) {
  const id=req.query.periodo===undefined?null:idPositivo(req.query.periodo,'Período');
  const r=await pool.query(id?'SELECT * FROM periodo_academico WHERE id_periodo=$1':"SELECT * FROM periodo_academico WHERE estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin ORDER BY anio DESC,semestre DESC LIMIT 1",id?[id]:[]);
  exigir(r.rowCount,id?404:409,id?'Período no encontrado':'No hay período vigente. Selecciona un período.'); return r.rows[0];
}
async function plan(req,p) {
  exigir(p.id_carrera&&p.id_plan,409,'El estudiante no tiene un plan asignado');
  const m=await remoto(req,'CATALOGO_SERVICE_URL',`/catalogo/carreras/${p.id_carrera}/malla?plan=${p.id_plan}`);
  exigir(m.malla.length,409,'El plan asignado no tiene asignaturas'); return m;
}
async function catalogo(req) { return (await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/asignaturas')).asignaturas; }
async function enriquecer(req,rows) {
  const mapa=new Map((await catalogo(req)).map(a=>[a.id_asignatura,a]));
  return rows.map(r=>({...r,codigo:mapa.get(r.id_asignatura)?.codigo??null,nombre:mapa.get(r.id_asignatura)?.nombre??null,creditos:mapa.get(r.id_asignatura)?.creditos??null}));
}
async function resultados(db,id) { return (await db.query(`SELECT c.id_asignatura,c.id_curso,r.nota,r.nota_minima FROM resultado_final r JOIN inscripcion i USING(id_inscripcion) JOIN curso c USING(id_curso) WHERE i.id_estudiante=$1`,[id])).rows; }
async function transaccion(fn) {
  const db=await pool.connect();
  try { await db.query('BEGIN'); const r=await fn(db); await db.query('COMMIT'); return r; }
  catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
}
async function auditar(db,req,accion,detalle) { await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[req.usuario.id_usuario,accion,JSON.stringify(detalle)]); }
const manejar=fn=>async(req,res)=> {
  try { req.body ??= {}; await fn(req,res); } catch(e) {
    console.error(e.message); res.status(e.status||(e.code==='23505'?409:500)).json({mensaje:e.status?e.message:e.code==='23505'?'La operación ya está registrada':'No se pudo completar la operación académica'});
  }
};
const estudiante=fn=>manejar(async(req,res)=> { exigir(req.usuario?.roles?.includes('ESTUDIANTE'),403,'Acceso exclusivo de estudiantes'); await fn(req,res,await perfil(req)); });
exports.obtenerPeriodos=estudiante(async(req,res)=>res.json({periodos:(await pool.query("SELECT *, (CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin AND estado='ACTIVO') AS vigente FROM periodo_academico ORDER BY anio DESC,semestre DESC")).rows}));
exports.obtenerAsignaturas=estudiante(async(req,res,p)=> {
  const per=await periodo(req); const r=await pool.query(`SELECT i.id_inscripcion,c.* FROM inscripcion i JOIN curso c USING(id_curso) WHERE i.id_estudiante=$1 AND i.estado IN ('ACTIVA','FINALIZADA') AND c.id_periodo=$2 ORDER BY c.id_curso`,[p.id_estudiante,per.id_periodo]);
  res.json({asignaturas:await enriquecer(req,r.rows)});
});
exports.obtenerHorario=estudiante(async(req,res,p)=> {
  const per=await periodo(req); const r=await pool.query(`SELECT c.id_curso,c.id_asignatura,c.seccion,h.* FROM inscripcion i JOIN curso c USING(id_curso) JOIN horario h USING(id_curso) WHERE i.id_estudiante=$1 AND i.estado IN ('ACTIVA','FINALIZADA') AND c.id_periodo=$2 ORDER BY h.dia_semana,h.hora_inicio`,[p.id_estudiante,per.id_periodo]); res.json({horario:r.rows});
});
exports.obtenerNotas=estudiante(async(req,res,p)=> {
  const per=await periodo(req);
  const r=await pool.query(`SELECT c.id_curso,c.id_asignatura,c.seccion,e.id_evaluacion,e.nombre AS evaluacion,e.porcentaje,cal.nota
    FROM inscripcion i JOIN curso c USING(id_curso) JOIN evaluacion e USING(id_curso)
    LEFT JOIN calificacion cal ON cal.id_evaluacion=e.id_evaluacion AND cal.id_estudiante=i.id_estudiante
    WHERE i.id_estudiante=$1 AND i.estado IN ('ACTIVA','FINALIZADA') AND c.id_periodo=$2 ORDER BY c.id_curso,e.fecha,e.id_evaluacion`,[p.id_estudiante,per.id_periodo]);
  const finales=await pool.query(`SELECT c.id_curso,c.id_asignatura,c.seccion,r.nota,r.nota_minima FROM resultado_final r JOIN inscripcion i USING(id_inscripcion) JOIN curso c USING(id_curso) WHERE i.id_estudiante=$1 AND c.id_periodo=$2`,[p.id_estudiante,per.id_periodo]);
  res.json({notas:r.rows,finales:finales.rows});
});
exports.obtenerAsistencia=estudiante(async(req,res,p)=> {
  const per=await periodo(req); const r=await pool.query(`SELECT c.id_curso,c.id_asignatura,cl.id_clase,cl.fecha,cl.hora_inicio,cl.hora_fin,COALESCE(a.estado,'PENDIENTE') AS estado,a.observacion
    FROM inscripcion i JOIN curso c USING(id_curso) JOIN clase cl USING(id_curso) LEFT JOIN asistencia a ON a.id_clase=cl.id_clase AND a.id_estudiante=i.id_estudiante
    WHERE i.id_estudiante=$1 AND i.estado IN ('ACTIVA','FINALIZADA') AND c.id_periodo=$2 AND cl.fecha<=CURRENT_DATE AND (cl.fecha>=i.fecha_inscripcion::date OR a.id_asistencia IS NOT NULL) ORDER BY cl.fecha DESC,cl.id_clase`,[p.id_estudiante,per.id_periodo]); res.json({asistencia:r.rows});
});
exports.obtenerOferta=estudiante(async(req,res,p)=> {
  const per=await periodo(req); const m=await plan(req,p); const cat=await catalogo(req);
  const r=await pool.query(`SELECT c.*,(p.inscripcion_abierta AND p.estado='ACTIVO') AS inscripcion_abierta,
    c.cupo_maximo-(SELECT count(*)::int FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.estado='ACTIVA') AS cupos_disponibles,
    EXISTS(SELECT 1 FROM inscripcion i WHERE i.id_curso=c.id_curso AND i.id_estudiante=$2 AND i.estado='ACTIVA') AS inscrito,
    COALESCE((SELECT json_agg(h ORDER BY h.dia_semana,h.hora_inicio) FROM horario h WHERE h.id_curso=c.id_curso),'[]') AS horarios
    FROM curso c JOIN periodo_academico p USING(id_periodo) WHERE c.id_periodo=$1 AND c.estado='ACTIVO' AND c.id_asignatura=ANY($3::int[]) ORDER BY c.id_asignatura,c.seccion`,[per.id_periodo,p.id_estudiante,m.malla.map(a=>a.id_asignatura)]);
  res.json({oferta:await enriquecer(req,r.rows.filter(c=>cat.some(a=>a.id_asignatura===c.id_asignatura&&a.estado==='ACTIVA'))),periodo:per});
});
exports.inscribir=estudiante(async(req,res,p)=> {
  const id=idPositivo(req.body.id_curso,'Curso'); const m=await plan(req,p); const cat=await catalogo(req);
  const inscripcion=await require('../domain/inscripcion').inscribirCurso({req,p,m,cat,id});
  res.status(201).json({inscripcion,mensaje:'Inscripción realizada'});
});
exports.obtenerAvance=estudiante(async(req,res,p)=> {
  const m=await plan(req,p); const finales=await resultados(pool,p.id_estudiante);
  const actuales=await pool.query(`SELECT c.id_asignatura FROM inscripcion i JOIN curso c USING(id_curso) JOIN periodo_academico pa USING(id_periodo)
    WHERE i.id_estudiante=$1 AND i.estado='ACTIVA' AND pa.estado='ACTIVO' AND CURRENT_DATE BETWEEN pa.fecha_inicio AND pa.fecha_fin AND NOT EXISTS(SELECT 1 FROM resultado_final r WHERE r.id_inscripcion=i.id_inscripcion)`,[p.id_estudiante]);
  res.json({plan:m.plan,...progreso(m.malla,finales,actuales.rows)});
});
exports.obtenerRestricciones=estudiante(async(req,res,p)=>res.json({restricciones:(await pool.query('SELECT * FROM restriccion WHERE id_estudiante=$1 ORDER BY activa DESC,fecha_creacion DESC',[p.id_estudiante])).rows}));
exports.obtenerSolicitudes=estudiante(async(req,res,p)=>res.json({solicitudes:(await pool.query(`SELECT s.*,r.tipo FROM solicitud_levantamiento s JOIN restriccion r USING(id_restriccion) WHERE r.id_estudiante=$1 ORDER BY s.fecha_creacion DESC`,[p.id_estudiante])).rows}));
exports.crearSolicitud=estudiante(async(req,res,p)=> {
  const id=idPositivo(req.body.id_restriccion,'Restricción'); const motivo=texto(req.body.motivo,10,2000,'Motivo');
  const solicitud=await transaccion(async db=> {
    const r=await db.query('SELECT * FROM restriccion WHERE id_restriccion=$1 AND id_estudiante=$2 FOR UPDATE',[id,p.id_estudiante]);
    exigir(r.rowCount,404,'Restricción no encontrada'); exigir(r.rows[0].activa,409,'La restricción ya está levantada');
    const s=await db.query('INSERT INTO solicitud_levantamiento(id_restriccion,motivo) VALUES($1,$2) RETURNING *',[id,motivo]);
    await auditar(db,req,'SOLICITUD_LEVANTAMIENTO',{id_solicitud:s.rows[0].id_solicitud}); return s.rows[0];
  }); res.status(201).json({solicitud});
});
exports.obtenerEncuestas=estudiante(async(req,res,p)=> {
  const per=await periodo(req); const r=await pool.query(`SELECT e.*,cd.id_curso,cd.id_docente,c.id_asignatura,
    EXISTS(SELECT 1 FROM respuesta_encuesta r WHERE r.id_encuesta=e.id_encuesta AND r.id_estudiante=$1) AS respondida,
    (CURRENT_DATE BETWEEN e.fecha_inicio AND e.fecha_fin) AS disponible,
    (SELECT json_agg(p ORDER BY p.orden) FROM pregunta_encuesta p WHERE p.id_encuesta=e.id_encuesta) AS preguntas
    FROM encuesta_docente e JOIN curso_docente cd USING(id_curso_docente) JOIN curso c USING(id_curso) JOIN inscripcion i ON i.id_curso=c.id_curso AND i.id_estudiante=$1
    WHERE e.activa AND i.estado IN ('ACTIVA','FINALIZADA') AND c.id_periodo=$2 ORDER BY e.fecha_fin,e.id_encuesta`,[p.id_estudiante,per.id_periodo]);
  res.json({encuestas:await enriquecer(req,r.rows)});
});
exports.responderEncuesta=estudiante(async(req,res,p)=> {
  const id=idPositivo(req.params.idEncuesta,'Encuesta');
  await transaccion(async db=> {
    const r=await db.query(`SELECT e.* FROM encuesta_docente e JOIN curso_docente cd USING(id_curso_docente) JOIN inscripcion i ON i.id_curso=cd.id_curso AND i.id_estudiante=$2
      WHERE e.id_encuesta=$1 AND e.activa AND i.estado IN ('ACTIVA','FINALIZADA') AND CURRENT_DATE BETWEEN e.fecha_inicio AND e.fecha_fin FOR SHARE OF e,i`,[id,p.id_estudiante]);
    exigir(r.rowCount,404,'Encuesta no disponible');
    const preguntas=(await db.query('SELECT id_pregunta FROM pregunta_encuesta WHERE id_encuesta=$1',[id])).rows;
    await db.query('INSERT INTO respuesta_encuesta(id_encuesta,id_estudiante,respuestas) VALUES($1,$2,$3)',[id,p.id_estudiante,JSON.stringify(respuestasValidas(preguntas,req.body.respuestas))]);
  }); res.status(201).json({mensaje:'Encuesta respondida. Gracias por participar.'});
});
exports.obtenerCertificados=estudiante(async(req,res)=>res.json({certificados:[{tipo:'INSCRIPCION',nombre:'Constancia de inscripción'},{tipo:'CALIFICACIONES',nombre:'Reporte de calificaciones'},{tipo:'ASIGNACION_FAMILIAR',nombre:'Certificado de asignación familiar'}],demostracion:true}));
exports.descargarCertificado=estudiante(async(req,res,p)=> {
  const tipo=req.params.tipo; exigir(['INSCRIPCION','CALIFICACIONES','ASIGNACION_FAMILIAR'].includes(tipo),404,'Certificado no disponible'); const per=await periodo(req);
  const filas=await pool.query(`SELECT c.id_curso,c.id_asignatura,c.seccion,i.estado,r.nota AS nota_final,
    (SELECT json_agg(json_build_object('evaluacion',e.nombre,'nota',cal.nota,'porcentaje',e.porcentaje) ORDER BY e.fecha,e.id_evaluacion) FROM evaluacion e LEFT JOIN calificacion cal ON cal.id_evaluacion=e.id_evaluacion AND cal.id_estudiante=i.id_estudiante WHERE e.id_curso=c.id_curso) AS evaluaciones
    FROM inscripcion i JOIN curso c USING(id_curso) LEFT JOIN resultado_final r USING(id_inscripcion)
    WHERE i.id_estudiante=$1 AND c.id_periodo=$2 AND i.estado IN ('ACTIVA','FINALIZADA') ORDER BY c.id_curso`,[p.id_estudiante,per.id_periodo]);
  exigir(filas.rowCount,409,'No hay inscripciones para emitir este documento en el período');
  const cursos=await enriquecer(req,filas.rows); const id=randomUUID();
  const lineas=[`Estudiante: ${p.nombres} ${p.apellido_paterno} ${p.apellido_materno||''}`,`R.U.T.: ${p.rut||'No registrado'}`,`Matrícula: ${p.numero_matricula}`,`Período: ${per.semestre}° semestre del año ${per.anio}`,''];
  for(const c of cursos) { lineas.push(`${c.codigo||c.id_asignatura} - ${c.nombre||'Asignatura'} - Sección ${c.seccion} (${c.estado})`); if(tipo==='CALIFICACIONES') { lineas.push(`Resultado final: ${c.nota_final??'Pendiente'}`); for(const e of c.evaluaciones||[]) lineas.push(`  ${e.evaluacion}: ${e.nota??'Pendiente'} (${e.porcentaje}%) - evaluación parcial`); } }
  let pdf;
  if(tipo==='ASIGNACION_FAMILIAR') {
    exigir(cursos.some(c=>c.estado==='ACTIVA'),409,'Se requiere una inscripción activa en el período para este certificado');
    exigir(p.rut,409,'El perfil no tiene un RUT registrado');
    const {carreras}=await remoto(req,'CATALOGO_SERVICE_URL','/catalogo/carreras');
    const carrera=carreras.find(c=>c.id_carrera===p.id_carrera);
    exigir(carrera,409,'La carrera del estudiante no está disponible');
    pdf=crearAsignacionFamiliar({perfil:p,periodo:per,carrera:carrera.nombre,referencia:id});
  } else pdf=crearCertificado({titulo:tipo==='INSCRIPCION'?'CONSTANCIA DE INSCRIPCIÓN':'REPORTE DE CALIFICACIONES',lineas,referencia:id});
  await pool.query('INSERT INTO emision_certificado(id_emision,id_estudiante,tipo,id_periodo) VALUES($1,$2,$3,$4)',[id,p.id_estudiante,tipo,per.id_periodo]);
  res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${tipo.toLowerCase()}-${per.anio}-${per.semestre}.pdf"`,'Cache-Control':'no-store'}).send(pdf);
});
async function administrador(req) {
  exigir(req.usuario?.roles?.some(r=>['ADMIN_UNIDAD','ADMIN_GENERAL'].includes(r)),403,'Se requiere un administrador'); return (await remoto(req,'USUARIOS_SERVICE_URL','/usuarios/me')).perfil;
}
function autorizarUnidad(req,p,id) { exigir(req.usuario.roles.includes('ADMIN_GENERAL')||(id!=null&&p.id_unidad_admin===id),403,'No tienes atribuciones sobre esta unidad'); }
exports.listarSolicitudesAdmin=manejar(async(req,res)=> {
  const p=await administrador(req); const general=req.usuario.roles.includes('ADMIN_GENERAL'); exigir(general||p.id_unidad_admin,403,'Administrador sin unidad');
  res.json({solicitudes:(await pool.query(`SELECT s.*,r.tipo,r.id_estudiante,r.id_unidad FROM solicitud_levantamiento s JOIN restriccion r USING(id_restriccion) WHERE ($1::boolean OR r.id_unidad=$2) ORDER BY s.fecha_creacion DESC`,[general,p.id_unidad_admin||null])).rows});
});
exports.resolverSolicitud=manejar(async(req,res)=> {
  const p=await administrador(req); const id=idPositivo(req.params.idSolicitud,'Solicitud'); exigir(['APROBADA','RECHAZADA'].includes(req.body.estado),400,'Estado inválido'); const motivo=texto(req.body.resolucion,10,2000,'Resolución');
  await transaccion(async db=> {
    const r=await db.query(`SELECT s.*,r.id_unidad,r.id_estudiante FROM solicitud_levantamiento s JOIN restriccion r USING(id_restriccion) WHERE s.id_solicitud=$1 FOR UPDATE OF s,r`,[id]);
    exigir(r.rowCount,404,'Solicitud no encontrada'); const s=r.rows[0]; autorizarUnidad(req,p,s.id_unidad); exigir(s.id_estudiante!==p.id_estudiante,403,'No puedes resolver tu propia solicitud'); exigir(s.estado==='PENDIENTE',409,'Solicitud ya resuelta');
    await db.query('UPDATE solicitud_levantamiento SET estado=$2,resolucion=$3,resuelta_por=$4,fecha_resolucion=now() WHERE id_solicitud=$1',[id,req.body.estado,motivo,req.usuario.id_usuario]);
    if(req.body.estado==='APROBADA') await db.query('UPDATE restriccion SET activa=false,fecha_levantamiento=now(),levantada_por=$2 WHERE id_restriccion=$1',[s.id_restriccion,req.usuario.id_usuario]);
    await auditar(db,req,'RESOLVER_SOLICITUD',{id_solicitud:id,estado:req.body.estado});
  }); res.json({mensaje:'Solicitud resuelta'});
});
exports.crearEncuesta=manejar(async(req,res)=> {
  const p=await administrador(req); const id=idPositivo(req.body.id_curso_docente,'Asignación docente'); const titulo=texto(req.body.titulo,3,200,'Título'); const {fecha_inicio,fecha_fin,preguntas}=req.body;
  const fechaValida=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  exigir(fechaValida(fecha_inicio)&&fechaValida(fecha_fin)&&fecha_fin>=fecha_inicio,400,'Fechas inválidas'); exigir(Array.isArray(preguntas)&&preguntas.length>=1&&preguntas.length<=30,400,'Incluye entre 1 y 30 preguntas'); const textos=preguntas.map(t=>texto(t,3,500,'Pregunta'));
  const encuesta=await transaccion(async db=> {
    const c=await db.query('SELECT c.id_unidad FROM curso_docente cd JOIN curso c USING(id_curso) WHERE cd.id_curso_docente=$1',[id]); exigir(c.rowCount,404,'Asignación no encontrada'); autorizarUnidad(req,p,c.rows[0].id_unidad);
    const r=await db.query('INSERT INTO encuesta_docente(id_curso_docente,titulo,fecha_inicio,fecha_fin,creada_por) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,titulo,fecha_inicio,fecha_fin,req.usuario.id_usuario]);
    for(let i=0;i<textos.length;i++) await db.query('INSERT INTO pregunta_encuesta(id_encuesta,texto,orden) VALUES($1,$2,$3)',[r.rows[0].id_encuesta,textos[i],i+1]);
    await auditar(db,req,'CREAR_ENCUESTA',{id_encuesta:r.rows[0].id_encuesta}); return r.rows[0];
  }); res.status(201).json({encuesta});
});
exports.configurarInscripcion=manejar(async(req,res)=> {
  exigir(req.usuario?.roles?.includes('ADMIN_GENERAL'),403,'Se requiere Administración General');
  const id=idPositivo(req.params.idPeriodo,'Período'); exigir(typeof req.body.abierta==='boolean',400,'Indica abierta como booleano');
  await transaccion(async db=> {
    const r=await db.query('UPDATE periodo_academico SET inscripcion_abierta=$2 WHERE id_periodo=$1 RETURNING id_periodo',[id,req.body.abierta]);
    exigir(r.rowCount,404,'Período no encontrado');await auditar(db,req,'CONFIGURAR_INSCRIPCION',{id_periodo:id,abierta:req.body.abierta});
  }); res.json({mensaje:'Disponibilidad de inscripción actualizada'});
});
exports.registrarResultado=manejar(async(req,res)=> {
  const p=await administrador(req); const id=idPositivo(req.params.idInscripcion,'Inscripción');const {nota,nota_minima}=req.body;
  exigir(typeof nota==='number'&&nota>=1&&nota<=7&&Math.abs(nota*10-Math.round(nota*10))<1e-8,400,'Nota final entre 1 y 7, con un decimal');
  exigir(typeof nota_minima==='number'&&nota_minima>=1&&nota_minima<=7&&Math.abs(nota_minima*10-Math.round(nota_minima*10))<1e-8,400,'Indica la nota mínima de aprobación con un decimal');
  await transaccion(async db=> {
    const r=await db.query(`SELECT i.*,c.id_unidad FROM inscripcion i JOIN curso c USING(id_curso) WHERE i.id_inscripcion=$1 FOR UPDATE OF i`,[id]);
    exigir(r.rowCount,404,'Inscripción no encontrada');autorizarUnidad(req,p,r.rows[0].id_unidad);
    exigir(r.rows[0].id_estudiante!==p.id_estudiante,403,'No puedes registrar tu propio resultado final');
    exigir(['ACTIVA','FINALIZADA'].includes(r.rows[0].estado),409,'Inscripción no válida para cierre');
    const anterior=(await db.query('SELECT * FROM resultado_final WHERE id_inscripcion=$1',[id])).rows[0]||null;
    await db.query(`INSERT INTO resultado_final(id_inscripcion,nota,nota_minima,registrado_por) VALUES($1,$2,$3,$4) ON CONFLICT(id_inscripcion) DO UPDATE SET nota=$2,nota_minima=$3,registrado_por=$4,fecha_registro=now()`,[id,nota,nota_minima,req.usuario.id_usuario]);
    await auditar(db,req,'REGISTRAR_RESULTADO_FINAL',{id_inscripcion:id,anterior,nota,nota_minima});
  }); res.json({mensaje:'Resultado final registrado'});
});
