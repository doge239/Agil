const pool = require('../config/database');
function exigir(ok,status,mensaje) { if(!ok) throw Object.assign(new Error(mensaje),{status}); }
function id(v) { exigir(/^[1-9]\d*$/.test(String(v))&&Number.isSafeInteger(Number(v))&&Number(v)<=2147483647,400,'Identificador inválido');return Number(v); }
function texto(v,min,max) { exigir(typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max,400,`Texto requerido de ${min} a ${max} caracteres`);return v.trim(); }
function codigo(v) { const c=texto(v,1,20).toUpperCase();exigir(/^[A-Z0-9][A-Z0-9._-]*$/.test(c),400,'Código inválido');return c; }
function entero(v,min,max,nombre) { exigir(Number.isInteger(v)&&v>=min&&v<=max,400,`${nombre} inválido`);return v; }
function version(p,v) { exigir(Number.isInteger(v)&&v>0,400,'Versión inválida');exigir(p.version===v,409,'El registro cambió. Recarga antes de guardar.'); }
const general=fn=>async(req,res)=>{
  try { exigir(req.usuario?.roles?.includes('ADMIN_GENERAL'),403,'Se requiere Administración General');req.body??={};await fn(req,res); }
  catch(e) { if(!e.status)console.error(e.message);res.status(e.status||(['23505','23503'].includes(e.code)?409:500)).json({mensaje:e.status?e.message:e.code==='23505'?'Código o registro duplicado':e.code==='23503'?'El registro está relacionado o no existe':'No se pudo completar la operación de catálogo'}); }
};
async function tx(req,accion,fn) {
  const db=await pool.connect();
  try { await db.query('BEGIN');const {dato,detalle}=await fn(db);await db.query('INSERT INTO auditoria_catalogo(id_usuario,accion,detalle) VALUES($1,$2,$3)',[req.usuario.id_usuario,accion,JSON.stringify({...detalle,motivo:texto(req.body.motivo,10,2000)})]);await db.query('COMMIT');return dato; }
  catch(e) { await db.query('ROLLBACK');throw e; } finally {db.release();}
}
async function fila(db,tabla,clave,valor) { const p=(await db.query(`SELECT * FROM ${tabla} WHERE ${clave}=$1 FOR UPDATE`,[valor])).rows[0];exigir(p,404,'Registro no encontrado');return p; }
exports.unidades=general(async(req,res)=>res.json({unidades:(await pool.query('SELECT * FROM unidad_academica ORDER BY nombre')).rows}));
exports.carreras=general(async(req,res)=>res.json({carreras:(await pool.query('SELECT c.*,u.nombre AS unidad_academica FROM carrera c JOIN unidad_academica u USING(id_unidad) ORDER BY c.nombre')).rows}));
exports.guardarCarrera=general(async(req,res)=>{
  const b=req.body, datos=[id(b.id_unidad),codigo(b.codigo),texto(b.nombre,3,150),b.estado];
  exigir(['ACTIVA','INACTIVA'].includes(b.estado),400,'Estado inválido');
  const carrera=await tx(req,'GENERAL_GUARDAR_CARRERA',async db=>{
    exigir((await db.query('SELECT 1 FROM unidad_academica WHERE id_unidad=$1 AND activo FOR SHARE',[datos[0]])).rowCount,409,'La unidad no está activa');
    let anterior=null,r;
    if(req.params.idCarrera){
      anterior=await fila(db,'carrera','id_carrera',id(req.params.idCarrera));version(anterior,b.version);
      if(anterior.id_unidad!==datos[0])exigir(!(await db.query('SELECT 1 FROM plan_estudio WHERE id_carrera=$1 LIMIT 1',[anterior.id_carrera])).rowCount,409,'La carrera ya tiene planes; conserva su unidad');
      r=await db.query('UPDATE carrera SET id_unidad=$2,codigo=$3,nombre=$4,estado=$5,version=version+1 WHERE id_carrera=$1 RETURNING *',[anterior.id_carrera,...datos]);
    }else r=await db.query('INSERT INTO carrera(id_unidad,codigo,nombre,estado) VALUES($1,$2,$3,$4) RETURNING *',datos);
    return {dato:r.rows[0],detalle:{anterior,nuevo:r.rows[0]}};
  });res.status(req.params.idCarrera?200:201).json({carrera});
});
exports.asignaturas=general(async(req,res)=>res.json({asignaturas:(await pool.query('SELECT * FROM asignatura ORDER BY nombre')).rows}));
exports.guardarAsignatura=general(async(req,res)=>{
  const b=req.body;exigir(['ACTIVA','INACTIVA'].includes(b.estado),400,'Estado inválido');
  // Datos desconocidos heredados se pueden conservar; las nuevas asignaturas requieren código y créditos.
  const c=b.codigo===null?null:codigo(b.codigo),creditos=b.creditos===null?null:entero(b.creditos,0,60,'Créditos');
  const nombre=texto(b.nombre,3,150),descripcion=b.descripcion==null?null:texto(b.descripcion,0,4000);
  const asignatura=await tx(req,'GENERAL_GUARDAR_ASIGNATURA',async db=>{
    let anterior=null,r;
    if(req.params.idAsignatura){
      anterior=await fila(db,'asignatura','id_asignatura',id(req.params.idAsignatura));version(anterior,b.version);
      if(anterior.codigo!==c||anterior.creditos!==creditos)exigir(!(await db.query('SELECT 1 FROM malla_curricular WHERE id_asignatura=$1 LIMIT 1',[anterior.id_asignatura])).rowCount,409,'Código y créditos están usados en una malla; crea otra asignatura para cambiarlos');
      exigir((c!==null||anterior.codigo===null)&&(creditos!==null||anterior.creditos===null),400,'No puedes eliminar código o créditos conocidos');
      r=await db.query('UPDATE asignatura SET codigo=$2,nombre=$3,creditos=$4,descripcion=$5,estado=$6,version=version+1 WHERE id_asignatura=$1 RETURNING *',[anterior.id_asignatura,c,nombre,creditos,descripcion,b.estado]);
    }else{
      exigir(c!==null&&creditos!==null,400,'Código y créditos obligatorios');
      r=await db.query('INSERT INTO asignatura(codigo,nombre,creditos,descripcion,estado) VALUES($1,$2,$3,$4,$5) RETURNING *',[c,nombre,creditos,descripcion,b.estado]);
    }
    return {dato:r.rows[0],detalle:{anterior,nuevo:r.rows[0]}};
  });res.status(req.params.idAsignatura?200:201).json({asignatura});
});
exports.planes=general(async(req,res)=>res.json({planes:(await pool.query('SELECT * FROM plan_estudio WHERE id_carrera=$1 ORDER BY anio_inicio DESC,id_plan DESC',[id(req.params.idCarrera)])).rows}));
exports.crearPlan=general(async(req,res)=>{
  const carrera=id(req.params.idCarrera),nombre=texto(req.body.nombre,3,100),anio=entero(req.body.anio_inicio,2000,2200,'Año');
  const plan=await tx(req,'GENERAL_CREAR_PLAN',async db=>{
    exigir((await db.query("SELECT 1 FROM carrera WHERE id_carrera=$1 AND estado='ACTIVA' FOR SHARE",[carrera])).rowCount,409,'Carrera no activa');
    const p=(await db.query("INSERT INTO plan_estudio(id_carrera,nombre,anio_inicio,estado,gestionado) VALUES($1,$2,$3,'BORRADOR',true) RETURNING *",[carrera,nombre,anio])).rows[0];
    if(req.body.id_plan_origen!=null){
      const origen=await fila(db,'plan_estudio','id_plan',id(req.body.id_plan_origen));exigir(origen.id_carrera===carrera,400,'El plan origen pertenece a otra carrera');
      await db.query('INSERT INTO malla_curricular(id_plan,id_asignatura,semestre,obligatoria,orden,requisitos_estado,requisito_nivel,espacio_electivo,fuente,referencia) SELECT $1,id_asignatura,semestre,obligatoria,orden,requisitos_estado,requisito_nivel,espacio_electivo,fuente,referencia FROM malla_curricular WHERE id_plan=$2',[p.id_plan,origen.id_plan]);
      await db.query('INSERT INTO electivo_opcion(id_plan,id_espacio,id_asignatura) SELECT $1,id_espacio,id_asignatura FROM electivo_opcion WHERE id_plan=$2',[p.id_plan,origen.id_plan]);
      const tabla=origen.gestionado?'prerrequisito_plan':'prerrequisito';
      if(!origen.gestionado)exigir(!(await db.query('SELECT 1 FROM prerrequisito r WHERE r.id_asignatura IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$1) AND r.id_asignatura_requisito NOT IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$1) LIMIT 1',[origen.id_plan])).rowCount,409,'El origen contiene requisitos fuera de su malla; crea un borrador vacío y revisa esos requisitos');
      await db.query(`INSERT INTO prerrequisito_plan(id_plan,id_asignatura,id_asignatura_requisito) SELECT $1,r.id_asignatura,r.id_asignatura_requisito FROM ${tabla} r WHERE ${origen.gestionado?'r.id_plan=$2':'r.id_asignatura IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$2)'} AND r.id_asignatura_requisito IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$2)`,[p.id_plan,origen.id_plan]);
    }
    return {dato:p,detalle:{nuevo:p,id_plan_origen:req.body.id_plan_origen??null}};
  });res.status(201).json({plan});
});
async function contenido(db,plan){
  const m=(await db.query('SELECT m.*,a.codigo,a.nombre,a.estado AS estado_asignatura FROM malla_curricular m JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1 ORDER BY semestre,orden,id_malla',[plan.id_plan])).rows;
  const r=await db.query(plan.gestionado?'SELECT * FROM prerrequisito_plan WHERE id_plan=$1':'SELECT * FROM prerrequisito WHERE id_asignatura IN (SELECT id_asignatura FROM malla_curricular WHERE id_plan=$1)',[plan.id_plan]);
  const e=(await db.query('SELECT * FROM electivo_opcion WHERE id_plan=$1',[plan.id_plan])).rows;
  return m.map(a=>({...a,prerrequisitos:r.rows.filter(r=>r.id_asignatura===a.id_asignatura).map(r=>r.id_asignatura_requisito),opciones:e.filter(e=>e.id_espacio===a.id_asignatura).map(e=>e.id_asignatura)}));
}
exports.malla=general(async(req,res)=>{
  const p=(await pool.query('SELECT * FROM plan_estudio WHERE id_plan=$1',[id(req.params.idPlan)])).rows[0];exigir(p,404,'Plan no encontrado');
  res.json({plan:p,malla:await contenido(pool,p)});
});
function validarMalla(malla){
  exigir(Array.isArray(malla)&&malla.length<=200,400,'Incluye hasta 200 asignaturas');
  exigir(malla.every(a=>a&&Number.isInteger(a.id_asignatura)),400,'Asignatura inválida');
  const ids=new Set(malla.map(a=>id(a.id_asignatura)));exigir(ids.size===malla.length,400,'Asignaturas duplicadas');
  for(const a of malla){
    entero(a.semestre,1,20,'Semestre');entero(a.orden,0,200,'Orden');
    exigir(typeof a.obligatoria==='boolean'&&typeof a.espacio_electivo==='boolean'&&['CONFIRMADOS','POR_CONFIRMAR'].includes(a.requisitos_estado),400,'Datos curriculares inválidos');
    if(a.requisito_nivel!=null)exigir(Number.isInteger(a.requisito_nivel)&&a.requisito_nivel>=1&&a.requisito_nivel<=7&&a.requisito_nivel<a.semestre,400,'El nivel requerido debe ser anterior al semestre');
    exigir(Array.isArray(a.prerrequisitos)&&a.prerrequisitos.length<=200&&new Set(a.prerrequisitos).size===a.prerrequisitos.length,400,'Prerrequisitos inválidos');
    for(const r of a.prerrequisitos){id(r);exigir(ids.has(r)&&malla.find(m=>m.id_asignatura===r).semestre<a.semestre,400,'Los prerrequisitos deben estar en semestres anteriores de la misma malla');}
    exigir(Array.isArray(a.opciones)&&a.opciones.length<=100&&new Set(a.opciones).size===a.opciones.length,400,'Opciones electivas inválidas');
    exigir(a.espacio_electivo||a.opciones.length===0,400,'Solo los espacios electivos admiten opciones');
    for(const op of a.opciones){id(op);exigir(!ids.has(op),400,'Una opción electiva no puede duplicar un espacio de la malla');}
    if(a.fuente!=null)texto(a.fuente,0,2000);
  }
}
exports.guardarMalla=general(async(req,res)=>{
  const malla=req.body.malla;validarMalla(malla);
  const plan=await tx(req,'GENERAL_GUARDAR_MALLA',async db=>{
    const p=await fila(db,'plan_estudio','id_plan',id(req.params.idPlan));version(p,req.body.version);exigir(p.estado==='BORRADOR'&&p.gestionado,409,'Copia el plan publicado a un borrador para modificar su estructura');
    const asignaturas=[...new Set(malla.flatMap(a=>[a.id_asignatura,...a.opciones]))];
    exigir((await db.query("SELECT 1 FROM asignatura WHERE id_asignatura=ANY($1::int[]) AND estado='ACTIVA' FOR SHARE",[asignaturas])).rowCount===asignaturas.length,409,'Hay asignaturas inexistentes o inactivas');
    const anterior=await contenido(db,p);
    await db.query('DELETE FROM prerrequisito_plan WHERE id_plan=$1',[p.id_plan]);await db.query('DELETE FROM electivo_opcion WHERE id_plan=$1',[p.id_plan]);await db.query('DELETE FROM malla_curricular WHERE id_plan=$1',[p.id_plan]);
    for(const a of malla)await db.query('INSERT INTO malla_curricular(id_plan,id_asignatura,semestre,orden,obligatoria,requisitos_estado,requisito_nivel,espacio_electivo,fuente) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[p.id_plan,a.id_asignatura,a.semestre,a.orden,a.obligatoria,a.requisitos_estado,a.requisito_nivel??null,a.espacio_electivo,a.fuente??null]);
    for(const a of malla){
      for(const r of a.prerrequisitos)await db.query('INSERT INTO prerrequisito_plan VALUES($1,$2,$3)',[p.id_plan,a.id_asignatura,r]);
      for(const op of a.opciones)await db.query('INSERT INTO electivo_opcion VALUES($1,$2,$3)',[p.id_plan,a.id_asignatura,op]);
    }
    const nuevo=(await db.query('UPDATE plan_estudio SET version=version+1 WHERE id_plan=$1 RETURNING *',[p.id_plan])).rows[0];
    return {dato:nuevo,detalle:{id_plan:p.id_plan,anterior,nuevo:malla}};
  });res.json({plan});
});
exports.editarPlan=general(async(req,res)=>{
  exigir(['BORRADOR','ACTIVO','INACTIVO'].includes(req.body.estado),400,'Estado inválido');
  const plan=await tx(req,'GENERAL_EDITAR_PLAN',async db=>{
    const p=await fila(db,'plan_estudio','id_plan',id(req.params.idPlan));version(p,req.body.version);
    exigir(req.body.estado!=='BORRADOR'||p.estado==='BORRADOR',409,'Un plan publicado no puede volver a borrador');
    if(p.gestionado&&req.body.estado==='ACTIVO'){
      const m=await contenido(db,p);exigir(m.length,409,'La malla no puede estar vacía');validarMalla(m);
      exigir((await db.query("SELECT 1 FROM carrera WHERE id_carrera=$1 AND estado='ACTIVA' FOR SHARE",[p.id_carrera])).rowCount,409,'Carrera inactiva');
      const ids=[...new Set(m.flatMap(a=>[a.id_asignatura,...a.opciones]))];
      exigir((await db.query("SELECT 1 FROM asignatura WHERE id_asignatura=ANY($1::int[]) AND estado='ACTIVA' FOR SHARE",[ids])).rowCount===ids.length,409,'La malla contiene asignaturas inactivas');
    }
    const nuevo=(await db.query('UPDATE plan_estudio SET estado=$2,version=version+1 WHERE id_plan=$1 RETURNING *',[p.id_plan,req.body.estado])).rows[0];
    return {dato:nuevo,detalle:{anterior:p,nuevo}};
  });res.json({plan});
});
exports.oferta=general(async(req,res)=>res.json({asignaturas:(await pool.query("SELECT DISTINCT a.* FROM asignatura a JOIN malla_curricular m USING(id_asignatura) JOIN plan_estudio p USING(id_plan) JOIN carrera c USING(id_carrera) JOIN unidad_academica u USING(id_unidad) WHERE c.id_unidad=$1 AND u.activo AND c.estado='ACTIVA' AND p.estado='ACTIVO' AND a.estado='ACTIVA' ORDER BY a.nombre",[id(req.query.unidad)])).rows}));
exports.auditoria=general(async(req,res)=>{
  const accion=req.query.accion??'',offset=req.query.offset===undefined?0:Number(req.query.offset);
  exigir(typeof accion==='string'&&accion.length<=100&&Number.isSafeInteger(offset)&&offset>=0&&offset<=1000000,400,'Filtro inválido');
  const r=await pool.query("SELECT *,count(*) OVER()::int AS total FROM auditoria_catalogo WHERE ($1='' OR accion=$1) ORDER BY id_auditoria DESC LIMIT 50 OFFSET $2",[accion,offset]);res.json({auditoria:r.rows,total:r.rows[0]?.total??0});
});
