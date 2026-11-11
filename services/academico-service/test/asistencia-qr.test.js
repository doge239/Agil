const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const express=require('express');
const jwt=require('jsonwebtoken');
let db,usuarios,catalogo,server,base,clase;
const token=(id,roles)=>jwt.sign({id_usuario:id,roles},'qr-test-secret',{expiresIn:'5m'});
async function pedir(ruta,{id=10,roles=['DOCENTE'],method='GET',body,auth=true,bearer}={}) {
  const r=await fetch(base+'/api/academico'+ruta,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${bearer||token(id,roles)}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
}
const alumno=(id,extra={})=>({id,roles:['ESTUDIANTE'],...extra});
const ruta=()=>`/docente/cursos/1/clases/${clase}/qr`;
function sustituir(archivo,pg) {
  const nombre=require.resolve(archivo);
  const pool={query:async(sql,args=[])=>{const r=await pg.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0}}};
  pool.connect=async()=>({...pool,release(){}});
  require.cache[nombre]={id:nombre,filename:nombre,loaded:true,exports:pool};
}
before(async()=>{
  process.env.JWT_SECRET='qr-test-secret';
  db=new PGlite();usuarios=new PGlite();catalogo=new PGlite();
  const root=path.resolve(__dirname,'../../..');
  for(const [dominio,pg] of [['academico',db],['usuarios',usuarios],['catalogo',catalogo]]) {
    await pg.exec(fs.readFileSync(path.join(root,'databases',dominio,'init.sql'),'utf8'));
    const carpeta=path.join(root,'databases/migrations',dominio);
    for(const archivo of fs.readdirSync(carpeta).filter(f=>f.endsWith('.sql')).sort())await pg.exec(fs.readFileSync(path.join(carpeta,archivo),'utf8'));
  }
  await usuarios.exec(`INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional,rut) VALUES
    (2,'Segundo','Estudiante','segundo@test','11.111.111-1'),(10,'Docente','Asignado','docente@test',NULL),
    (11,'Docente','Ajeno','ajeno@test',NULL),(3,'Otro','Estudiante','otro@test','12.345.678-5');
    INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan) VALUES(2,'QR-2',1,1),(5,'QR-3',1,1);
    INSERT INTO docente(id_persona,id_unidad) VALUES(3,1),(4,1);`);
  await db.exec(`UPDATE periodo_academico SET fecha_inicio=CURRENT_DATE-100,fecha_fin=CURRENT_DATE+100;
    UPDATE inscripcion SET fecha_inscripcion=CURRENT_DATE-30;
    INSERT INTO inscripcion(id_estudiante,id_curso,fecha_inscripcion) VALUES(2,1,CURRENT_DATE-10);
    INSERT INTO curso_docente(id_curso,id_docente) VALUES(1,1);`);
  clase=(await db.query("INSERT INTO clase(id_curso,fecha,hora_inicio,hora_fin) VALUES(1,(now() AT TIME ZONE 'America/Santiago')::date,'08:00','09:30') RETURNING id_clase")).rows[0].id_clase;
  sustituir('../src/config/database',db);sustituir('../../usuarios-service/src/config/database',usuarios);sustituir('../../catalogo-service/src/config/database',catalogo);
  const app=express();app.use(express.json());app.use('/academico',require('../src/routes/academico.routes'));
  app.use('/usuarios',require('../../usuarios-service/src/routes/usuarios.routes'));app.use('/catalogo',require('../../catalogo-service/src/routes/catalogo.routes'));
  app.use(require('../../../gateway/src/app'));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;
  process.env.USUARIOS_SERVICE_URL=base;process.env.CATALOGO_SERVICE_URL=base;process.env.ACADEMICO_SERVICE_URL=base;
});

test('eliminar una clase exige permiso y confirmación, conserva auditoría y revierte errores',async t=>{
  const hoy=(await db.query("SELECT (now() AT TIME ZONE 'America/Santiago')::date::text AS fecha")).rows[0].fecha;
  const creada=await pedir('/docente/cursos/1/clases',{method:'POST',body:{fecha:hoy,hora_inicio:'12:15',hora_fin:'13:15'}});
  assert.equal(creada.status,201);
  const id=creada.data.clase.id_clase;
  await db.query("INSERT INTO asistencia(id_clase,id_estudiante,estado) VALUES($1,1,'PRESENTE'),($1,2,'JUSTIFICADO')",[id]);
  const abierta=await pedir(`/docente/cursos/1/clases/${id}/qr`,{method:'POST'});
  assert.equal(abierta.status,201);
  const qr=abierta.data.sesion.token;
  const rutaEliminar=`/docente/cursos/1/clases/${id}`;
  const obtener=async()=> (await pedir('/docente/cursos/1/clases')).data.clases.find(c=>c.id_clase===id);
  let previa=await obtener();
  const cuerpo=()=>({confirmar:true,motivo:'Clase de prueba registrada por error',revision_asistencia:previa.revision_asistencia});
  await t.test('permiso, curso, confirmación y motivo son obligatorios',async()=>{
    assert.equal(previa.asistencias_registradas,2);
    assert.equal((await pedir(rutaEliminar,{auth:false,method:'DELETE',body:cuerpo()})).status,401);
    assert.equal((await pedir(rutaEliminar,alumno(1,{method:'DELETE',body:cuerpo()}))).status,403);
    assert.equal((await pedir(rutaEliminar,{id:11,method:'DELETE',body:cuerpo()})).status,403);
    assert.equal((await pedir(rutaEliminar,{method:'DELETE',body:{...cuerpo(),confirmar:false}})).status,400);
    assert.equal((await pedir(rutaEliminar,{method:'DELETE',body:{...cuerpo(),motivo:'corto'}})).status,400);
    assert.equal((await pedir('/docente/cursos/1/clases/2',{method:'DELETE',body:cuerpo()})).status,404);
    assert.equal((await db.query('SELECT * FROM asistencia WHERE id_clase=$1',[id])).rows.length,2);
  });
  await t.test('una asistencia modificada y un período cerrado bloquean la eliminación',async()=>{
    await db.query("UPDATE asistencia SET observacion='Cambio concurrente',version=version+1 WHERE id_clase=$1 AND id_estudiante=1",[id]);
    assert.equal((await pedir(rutaEliminar,{method:'DELETE',body:cuerpo()})).status,409);
    previa=await obtener();
    await db.exec("UPDATE periodo_academico SET estado='CERRADO' WHERE id_periodo=1");
    assert.equal((await pedir(rutaEliminar,{method:'DELETE',body:cuerpo()})).status,409);
    await db.exec("UPDATE periodo_academico SET estado='ACTIVO' WHERE id_periodo=1");
  });
  await t.test('elimina solo la clase seleccionada, sus asistencias y sesiones QR',async()=>{
    const otrasAntes=(await db.query('SELECT * FROM asistencia WHERE id_clase<>$1 ORDER BY id_asistencia',[id])).rows;
    const r=await pedir(rutaEliminar,{method:'DELETE',body:cuerpo()});
    assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.asistencias_eliminadas,2);
    for(const tabla of ['clase','asistencia','sesion_asistencia_qr'])assert.equal((await db.query(`SELECT 1 FROM ${tabla} WHERE id_clase=$1`,[id])).rows.length,0);
    assert.deepEqual((await db.query('SELECT * FROM asistencia WHERE id_clase<>$1 ORDER BY id_asistencia',[id])).rows,otrasAntes);
    const a=(await db.query("SELECT detalle FROM auditoria_academica WHERE accion='DOCENTE_ELIMINAR_CLASE' AND detalle->>'id_clase'=$1",[String(id)])).rows[0].detalle;
    assert.equal(a.anterior.asistencias.length,2);assert.equal(a.anterior.sesiones.length,1);assert.equal(a.motivo,cuerpo().motivo);
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(1))).status,410);
    assert.equal((await pedir(rutaEliminar,{method:'DELETE',body:cuerpo()})).status,404);
    assert(!(await pedir('/docente/cursos/1/clases')).data.clases.some(c=>c.id_clase===id));
    assert(!(await pedir('/asistencia',alumno(1))).data.asistencia.some(c=>c.id_clase===id));
    assert((await pedir('/docente/cursos/1/historial')).data.historial.some(a=>a.accion==='DOCENTE_ELIMINAR_CLASE'));
  });
  await t.test('un error al borrar revierte las asistencias y la auditoría',async()=>{
    const idFallo=(await db.query("INSERT INTO clase(id_curso,fecha,hora_inicio,hora_fin) VALUES(1,CURRENT_DATE,'16:10','17:10') RETURNING id_clase")).rows[0].id_clase;
    await db.query("INSERT INTO asistencia(id_clase,id_estudiante,estado) VALUES($1,1,'PRESENTE')",[idFallo]);
    const datos=(await pedir('/docente/cursos/1/clases')).data.clases.find(c=>c.id_clase===idFallo);
    await db.exec(`CREATE FUNCTION impedir_borrado_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo de borrado simulado'; END $$;
      CREATE TRIGGER prueba_borrado BEFORE DELETE ON clase FOR EACH ROW WHEN (OLD.id_clase=${idFallo}) EXECUTE FUNCTION impedir_borrado_prueba();`);
    const r=await pedir(`/docente/cursos/1/clases/${idFallo}`,{method:'DELETE',body:{...cuerpo(),revision_asistencia:datos.revision_asistencia}});
    assert.equal(r.status,500);
    assert.equal((await db.query('SELECT 1 FROM clase WHERE id_clase=$1',[idFallo])).rows.length,1);
    assert.equal((await db.query('SELECT 1 FROM asistencia WHERE id_clase=$1',[idFallo])).rows.length,1);
    assert.equal((await db.query("SELECT 1 FROM auditoria_academica WHERE accion='DOCENTE_ELIMINAR_CLASE' AND detalle->>'id_clase'=$1",[String(idFallo)])).rows.length,0);
    await db.exec('DROP TRIGGER prueba_borrado ON clase; DROP FUNCTION impedir_borrado_prueba()');
  });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));for(const pg of [db,usuarios,catalogo])if(pg)await pg.close()});

test('QR con login y RUT, autorización, vencimiento, manual, cierre y grilla',async t=>{
  let qr;
  await t.test('solo el docente asignado crea sesiones de clases de hoy',async()=>{
    assert.equal((await pedir(ruta(),{auth:false})).status,401);
    assert.equal((await pedir(ruta(),alumno(1,{method:'POST'}))).status,403);
    assert.equal((await pedir(ruta(),{id:11,method:'POST'})).status,403);
    assert.equal((await pedir(ruta(),{method:'POST',body:{duracion_minutos:0}})).status,400);
    assert.equal((await pedir('/docente/cursos/1/clases/1/qr',{method:'POST'})).status,409);
    const r=await pedir(ruta(),{method:'POST',body:{duracion_minutos:10}});assert.equal(r.status,201,JSON.stringify(r.data));qr=r.data.sesion.token;
    assert(qr);assert.equal((await pedir(ruta())).data.sesion.token,qr);
  });
  await t.test('QR no sustituye al login y solo acepta al estudiante inscrito con su propio RUT',async()=>{
    assert.equal((await pedir('/asistencia-qr/'+qr,{auth:false})).status,401);
    assert.equal((await pedir('/asistencia-qr/'+qr,{bearer:qr})).status,401);
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(3))).status,403);
    const info=await pedir('/asistencia-qr/'+qr,alumno(1));assert.equal(info.status,200);assert.equal(info.data.estado,null);
    assert.equal((await db.query('SELECT 1 FROM asistencia WHERE id_clase=$1',[clase])).rows.length,0,'Consultar nunca marca asistencia');
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(1,{method:'POST',body:{rut:'11.111.111-1'}}))).status,400);
    const r=await pedir('/asistencia-qr/'+qr,alumno(1,{method:'POST',body:{rut:'20000000-0'}}));assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.registrada,true);
    const repetida=await pedir('/asistencia-qr/'+qr,alumno(1,{method:'POST',body:{rut:'20.000.000-0'}}));assert.equal(repetida.data.registrada,false);
    const a=(await db.query('SELECT * FROM asistencia WHERE id_clase=$1',[clase])).rows;assert.equal(a.length,1);assert.equal(a[0].origen,'QR');assert.equal(a[0].version,1);
  });
  await t.test('el docente corrige manualmente y el QR no sobrescribe esa decisión',async()=>{
    const r=await pedir(`/docente/cursos/1/clases/${clase}/asistencias`,{method:'PUT',body:{asistencias:[{id_estudiante:1,estado:'JUSTIFICADO',observacion:'Respaldo presentado',version:1}]}});
    assert.equal(r.status,200,JSON.stringify(r.data));
    const a=(await db.query('SELECT * FROM asistencia WHERE id_clase=$1 AND id_estudiante=1',[clase])).rows[0];assert.equal(a.estado,'JUSTIFICADO');assert.equal(a.origen,'MANUAL');assert.equal(a.id_sesion_qr,null);
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(1,{method:'POST',body:{rut:'20.000.000-0'}}))).data.estado,'JUSTIFICADO');
    const conflicto=await pedir(`/docente/cursos/1/clases/${clase}/asistencias`,{method:'PUT',body:{asistencias:[{id_estudiante:1,estado:'AUSENTE',version:1}]}});assert.equal(conflicto.status,409);
  });
  await t.test('renovar invalida el anterior y cerrar marca solo pendientes si se solicita',async()=>{
    const anterior=qr;qr=(await pedir(ruta(),{method:'POST',body:{duracion_minutos:5}})).data.sesion.token;
    assert.notEqual(qr,anterior);assert.equal((await pedir('/asistencia-qr/'+anterior,alumno(1))).status,410);
    const cierre=await pedir(ruta(),{method:'DELETE',body:{marcar_ausentes:true}});assert.equal(cierre.status,200);assert.equal(cierre.data.ausentes_registrados,1);
    assert.equal((await db.query('SELECT estado FROM asistencia WHERE id_clase=$1 AND id_estudiante=1',[clase])).rows[0].estado,'JUSTIFICADO');
    assert.equal((await db.query('SELECT estado FROM asistencia WHERE id_clase=$1 AND id_estudiante=2',[clase])).rows[0].estado,'AUSENTE');
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(2))).status,410);
  });
  await t.test('se comprueba el vencimiento persistido y la asignación vigente del docente',async()=>{
    qr=(await pedir(ruta(),{method:'POST'})).data.sesion.token;
    await db.exec("UPDATE sesion_asistencia_qr SET creada=now()-interval '2 minutes',expira=now()-interval '1 minute' WHERE cerrada IS NULL");
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(1))).status,410);
    qr=(await pedir(ruta(),{method:'POST'})).data.sesion.token;await db.exec('UPDATE curso_docente SET activa=false WHERE id_curso=1');
    assert.equal((await pedir('/asistencia-qr/'+qr,alumno(1))).status,410);await db.exec('UPDATE curso_docente SET activa=true WHERE id_curso=1');
  });
  await t.test('grilla autorizada y reflejo del registro en Estudiante',async()=>{
    assert.equal((await pedir('/docente/cursos/1/asistencia-resumen',{id:11})).status,403);
    const r=await pedir('/docente/cursos/1/asistencia-resumen');assert.equal(r.status,200);assert(r.data.clases.some(c=>c.id_clase===clase));assert(r.data.asistencias.some(a=>a.id_estudiante===2&&a.estado==='AUSENTE'));
    const propias=await pedir('/asistencia',alumno(1));assert.equal(propias.status,200);assert(propias.data.asistencia.some(a=>a.id_clase===clase&&a.estado==='JUSTIFICADO'));
    const historial=await pedir('/docente/cursos/1/historial');assert(historial.data.historial.some(a=>a.accion==='DOCENTE_QR_ABRIR'));
    assert(!(await db.query("SELECT detalle::text AS texto FROM auditoria_academica")).rows.some(r=>r.texto.includes('20.000.000-0')||r.texto.includes(qr)));
  });
});
