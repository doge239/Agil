const pool=require('../config/database');
const {exigir,hayChoque}=require('../domain/estudiante');
const {calcularAvance}=require('./avance');
async function resultados(db,id){return (await db.query("SELECT c.id_asignatura,r.nota,r.nota_minima FROM resultado_final r JOIN inscripcion i USING(id_inscripcion) JOIN curso c USING(id_curso) WHERE i.id_estudiante=$1 AND i.estado IN ('ACTIVA','FINALIZADA')",[id])).rows;}
async function auditar(db,req,accion,detalle){await db.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[req.usuario.id_usuario,accion,JSON.stringify(detalle)]);}
async function validarElegibilidad({db,p,m,cat,c,autorizar=()=>{}}){
    autorizar(c);
    const elecciones=(await db.query('SELECT * FROM eleccion_electivo WHERE id_estudiante=$1 AND id_plan=$2',[p.id_estudiante,p.id_plan])).rows;
    const finales=await resultados(db,p.id_estudiante);
    const avance=calcularAvance(m,finales,[],elecciones);
    const asignatura=avance.asignaturas.find(a=>(a.elegida?.id_asignatura??a.id_asignatura)===c.id_asignatura);
    exigir(asignatura&&cat.some(a=>a.id_asignatura===c.id_asignatura&&a.estado==='ACTIVA'),403,'Asignatura no disponible en tu plan');
    const restricciones=await db.query('SELECT 1 FROM restriccion WHERE id_estudiante=$1 AND activa AND (id_unidad IS NULL OR id_unidad=$2)',[p.id_estudiante,c.id_unidad]);
    exigir(!restricciones.rowCount,409,'Tienes restricciones activas. Puedes solicitar su levantamiento.');
    const previas=await db.query(`SELECT cu.id_asignatura,cu.id_periodo FROM inscripcion i JOIN curso cu USING(id_curso) WHERE i.id_estudiante=$1 AND i.estado='ACTIVA'`,[p.id_estudiante]);
    exigir(!previas.rows.some(i=>i.id_periodo===c.id_periodo&&i.id_asignatura===c.id_asignatura),409,'Ya estás inscrito en esta asignatura durante el período');
    exigir(asignatura.estado!=='APROBADA',409,'La asignatura ya está aprobada');
    exigir(asignatura.disponibilidad!=='POR_CONFIRMAR',409,'Los requisitos de esta asignatura están por confirmar');
    exigir(asignatura.disponibilidad==='DISPONIBLE',409,'No cumples los prerrequisitos');
    const horarios=await db.query('SELECT * FROM horario WHERE id_curso=$1',[c.id_curso]);
    const actuales=await db.query(`SELECT h.* FROM horario h JOIN curso c USING(id_curso) JOIN inscripcion i USING(id_curso) WHERE i.id_estudiante=$1 AND i.estado='ACTIVA' AND c.id_periodo=$2`,[p.id_estudiante,c.id_periodo]);
    exigir(!horarios.rows.some(a=>actuales.rows.some(b=>hayChoque(a,b))),409,'Existe un choque de horario');
    return (await db.query("SELECT count(*)::int AS n FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'",[c.id_curso])).rows[0].n;
}
async function cursoBloqueado(db,id){
 const r=await db.query(`SELECT c.*,pa.inscripcion_abierta,pa.estado AS estado_periodo FROM curso c JOIN periodo_academico pa USING(id_periodo) WHERE c.id_curso=$1 FOR UPDATE OF c,pa`,[id]);
 exigir(r.rowCount,404,'Curso no encontrado');
 const c=r.rows[0];
 exigir(c.estado==='ACTIVO'&&c.estado_periodo==='ACTIVO'&&c.inscripcion_abierta,409,'La inscripción no está abierta para este curso');
 return c;
}
async function transaccion(fn){
 const db=await pool.connect();
 try{await db.query('BEGIN');const r=await fn(db);await db.query('COMMIT');return r;}
 catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
async function inscribirCurso({req,p,m,cat,id,tipo='ESTUDIANTE',motivo=null,autorizar=()=>{}}){
 return transaccion(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[p.id_estudiante]);
    const c=await cursoBloqueado(db,id);
    const ocupacion=await validarElegibilidad({db,p,m,cat,c,autorizar});
    exigir(ocupacion<c.cupo_maximo,409,'El curso ya no tiene cupos');
    const nueva=await db.query(`INSERT INTO inscripcion(id_estudiante,id_curso,tipo_inscripcion) VALUES($1,$2,$3) ON CONFLICT(id_estudiante,id_curso) DO UPDATE SET estado='ACTIVA',fecha_inscripcion=now(),tipo_inscripcion=$3 WHERE inscripcion.estado='ANULADA' RETURNING *`,[p.id_estudiante,id,tipo]);
    exigir(nueva.rowCount,409,'Ya existe una inscripción para este curso');
    await db.query('UPDATE curso SET cupo_actual=$2 WHERE id_curso=$1',[id,ocupacion+1]);
    const espera=await db.query(`UPDATE lista_espera SET estado='CANCELADA',fecha_cambio=now()
      WHERE id_estudiante=$1 AND id_curso=$2 AND estado='ESPERA' RETURNING id_lista_espera`,[p.id_estudiante,id]);
    if(espera.rowCount)await auditar(db,req,'LISTA_ESPERA_CANCELAR_POR_INSCRIPCION',{
      id_lista_espera:espera.rows[0].id_lista_espera,id_estudiante:p.id_estudiante,id_curso:id,
    });
    await auditar(db,req,'INSCRIPCION_'+tipo,{id_curso:id,id_estudiante:p.id_estudiante,motivo});
    return nueva.rows[0];
 });
}
async function agregarListaEspera({req,p,m,cat,id}){
 return transaccion(async db=>{
   await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[p.id_estudiante]);
   const c=await cursoBloqueado(db,id);
   const ocupacion=await validarElegibilidad({db,p,m,cat,c});
   exigir(ocupacion>=c.cupo_maximo,409,'El curso aún tiene cupos disponibles');
   const existente=await db.query("SELECT 1 FROM lista_espera WHERE id_estudiante=$1 AND id_curso=$2 AND estado='ESPERA'",[p.id_estudiante,id]);
   exigir(!existente.rowCount,409,'Ya estás en la lista de espera de este curso');
   const r=await db.query(`INSERT INTO lista_espera(id_estudiante,id_curso,id_carrera,id_plan)
     VALUES($1,$2,$3,$4) RETURNING *`,[p.id_estudiante,id,p.id_carrera,p.id_plan]);
   await auditar(db,req,'LISTA_ESPERA_AGREGAR',{id_curso:id,id_estudiante:p.id_estudiante,id_lista_espera:r.rows[0].id_lista_espera});
   return r.rows[0];
 });
}
async function retirarInscripcion({req,p,id}){
 return transaccion(async db=>{
   await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[p.id_estudiante]);
   const c=await cursoBloqueado(db,id);
   const r=await db.query("UPDATE inscripcion SET estado='ANULADA' WHERE id_estudiante=$1 AND id_curso=$2 AND estado='ACTIVA' RETURNING *",[p.id_estudiante,id]);
   exigir(r.rowCount,404,'No tienes una inscripción activa en este curso');
   const ocupacion=(await db.query("SELECT count(*)::int AS n FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA'",[id])).rows[0].n;
   await db.query('UPDATE curso SET cupo_actual=$2 WHERE id_curso=$1',[id,ocupacion]);
   await auditar(db,req,'INSCRIPCION_RETIRAR',{id_curso:id,id_estudiante:p.id_estudiante,id_inscripcion:r.rows[0].id_inscripcion});
   return {inscripcion:r.rows[0],curso:c};
 });
}
async function cancelarListaEspera({req,p,id}){
 return transaccion(async db=>{
   await db.query('SELECT pg_advisory_xact_lock(17001,$1)',[p.id_estudiante]);
   await db.query('SELECT id_curso FROM curso WHERE id_curso=$1 FOR UPDATE',[id]);
   const r=await db.query(`UPDATE lista_espera SET estado='CANCELADA',fecha_cambio=now()
     WHERE id_estudiante=$1 AND id_curso=$2 AND estado='ESPERA' RETURNING id_lista_espera`,[p.id_estudiante,id]);
   exigir(r.rowCount,404,'No tienes un lugar activo en la lista de espera');
   await auditar(db,req,'LISTA_ESPERA_CANCELAR',{id_curso:id,id_estudiante:p.id_estudiante,id_lista_espera:r.rows[0].id_lista_espera});
   return r.rows[0];
 });
}
module.exports={inscribirCurso,agregarListaEspera,retirarInscripcion,cancelarListaEspera,validarElegibilidad,auditar,cursoBloqueado,transaccion};
