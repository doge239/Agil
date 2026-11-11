const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { idPositivo, hayChoque, respuestasValidas, progreso } = require('../src/domain/estudiante');
const { crearPdf, crearCertificado } = require('../src/domain/pdf');
const express = require('express');
const jwt = require('jsonwebtoken');
let db, usuarios, catalogo, server, base;
const token=(id,roles=['ESTUDIANTE'])=>jwt.sign({id_usuario:id,roles},'test-secret',{expiresIn:'5m'});
async function peticion(ruta,{id=1,roles,method='GET',body,autorizado=true}={}) {
  const r=await fetch(`${base}/academico${ruta}`,{method,headers:{'Content-Type':'application/json',...(autorizado?{Authorization:`Bearer ${token(id,roles)}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=r.headers.get('content-type')?.includes('application/pdf')?Buffer.from(await r.arrayBuffer()):await r.json();
  return {status:r.status,data,headers:r.headers};
}
function poolPara(pg) {
  const pool={query:async(sql,args=[])=>{const r=await pg.query(sql,args);return {...r,rowCount:r.rows.length||r.affectedRows||0}}};
  pool.connect=async()=>({...pool,release(){}});return pool;
}
function sustituirPool(archivo,pg) {
  const nombre=require.resolve(archivo);require.cache[nombre]={id:nombre,filename:nombre,loaded:true,exports:poolPara(pg)};
}
before(async()=> {
  process.env.JWT_SECRET='test-secret';
  db=new PGlite();usuarios=new PGlite();catalogo=new PGlite();
  const root=path.resolve(__dirname,'../../..');
  for(const [nombre,pg] of [['academico',db],['usuarios',usuarios],['catalogo',catalogo]]) {
    await pg.exec(fs.readFileSync(path.join(root,'databases',nombre,'init.sql'),'utf8'));
    if(nombre!=='catalogo')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations',nombre,'001_estudiante.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/002_asignacion_familiar.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/003_docente.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/004_admin_unidad.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/005_avance_curricular.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/006_admin_general.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/006_lista_espera.sql'),'utf8'));
    if(nombre==='academico')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/academico/007_asistencia_qr.sql'),'utf8'));
    if(nombre==='catalogo')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/catalogo/001_avance_iti.sql'),'utf8'));
    if(nombre==='catalogo')await pg.exec(fs.readFileSync(path.join(root,'databases/migrations/catalogo/003_admin_general.sql'),'utf8'));
  }
  await usuarios.exec(`INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES(2,'Otro','Estudiante','otro@test'),(3,'Admin','Unidad','admin@test'),(4,'Admin','Otra','otra@test');
    INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan) VALUES(2,'OTRO',1,1);
    INSERT INTO administrador_unidad(id_persona,id_unidad) VALUES(3,1),(4,2);`);
  await db.exec(`UPDATE periodo_academico SET fecha_inicio=CURRENT_DATE-180,fecha_fin=CURRENT_DATE+180,inscripcion_abierta=true;
    UPDATE inscripcion SET fecha_inscripcion=CURRENT_DATE-120;
    INSERT INTO periodo_academico(anio,semestre,fecha_inicio,fecha_fin,estado) VALUES(2025,1,CURRENT_DATE-500,CURRENT_DATE-300,'CERRADO');
    INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES(1,2,1,1,30),(1,1,1,2,1),(2,1,1,2,30);
    INSERT INTO evaluacion(id_curso,nombre,porcentaje,fecha) VALUES(1,'Pendiente',70,CURRENT_DATE);
    INSERT INTO clase(id_curso,fecha,hora_inicio,hora_fin) VALUES(1,CURRENT_DATE,'09:40','11:10');
    INSERT INTO curso_docente(id_curso,id_docente) VALUES(1,1);
    INSERT INTO restriccion(id_estudiante,tipo,id_unidad) VALUES(1,'Biblioteca',1),(2,'Ajena',1);`);
  sustituirPool('../src/config/database',db);
  sustituirPool('../../usuarios-service/src/config/database',usuarios);
  sustituirPool('../../catalogo-service/src/config/database',catalogo);
  const app=express();app.use(express.json());
  app.use('/academico',require('../src/routes/academico.routes'));
  app.use('/usuarios',require('../../usuarios-service/src/routes/usuarios.routes'));
  app.use('/catalogo',require('../../catalogo-service/src/routes/catalogo.routes'));
  app.use(require('../../../gateway/src/app'));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;
  process.env.USUARIOS_SERVICE_URL=base;process.env.CATALOGO_SERVICE_URL=base;
  process.env.ACADEMICO_SERVICE_URL=base;
});
after(async()=> {if(server)await new Promise(r=>server.close(r));for(const pg of [db,usuarios,catalogo])if(pg)await pg.close()});
test('identificadores, choques y respuestas se validan sin coerción insegura',()=> {
  for(const v of [0,-1,'1.2','1 OR 1=1',{},2147483648])assert.throws(()=>idPositivo(v));
  assert.equal(idPositivo('12'),12);
  const a={dia_semana:'Miércoles',hora_inicio:'09:00',hora_fin:'10:00'};
  assert.equal(hayChoque(a,{dia_semana:'miercoles',hora_inicio:'09:30',hora_fin:'11:00'}),true);
  assert.equal(hayChoque(a,{dia_semana:'MIERCOLES',hora_inicio:'10:00',hora_fin:'11:00'}),false);
  assert.throws(()=>respuestasValidas([{id_pregunta:1}],{'1':'5'}));
  assert.throws(()=>respuestasValidas([{id_pregunta:1}],{'1':5,'2':4}));
});
test('las migraciones conservan inscripciones y corrigen ocupación',async()=> {
  assert.equal((await db.query('SELECT count(*)::int AS n FROM inscripcion')).rows[0].n,3);
  assert.equal((await db.query('SELECT cupo_actual FROM curso WHERE id_curso=1')).rows[0].cupo_actual,1);
  await assert.rejects(db.query('INSERT INTO horario(id_curso,dia_semana,hora_inicio,hora_fin) VALUES(999,\'Lunes\',\'10:00\',\'11:00\')'),e=>e.code==='23503');
  assert.equal((await usuarios.query('SELECT id_plan FROM estudiante WHERE id_estudiante=1')).rows[0].id_plan,1);
});
test('JWT y rol protegen todas las operaciones estudiantiles',async()=> {
  assert.equal((await peticion('/asignaturas',{autorizado:false})).status,401);
  assert.equal((await peticion('/asignaturas',{roles:['DOCENTE']})).status,403);
  assert.equal((await peticion('/asignaturas?periodo=abc')).status,400);
  assert.equal((await peticion('/asignaturas?periodo=999')).status,404);
  assert.equal((await peticion('/avance-curricular',{autorizado:false})).status,401);
  assert.equal((await peticion('/avance-curricular',{roles:['DOCENTE']})).status,403);
  assert.equal((await peticion('/lista-espera',{autorizado:false,method:'POST',body:{id_curso:5}})).status,401);
  assert.equal((await peticion('/lista-espera',{roles:['DOCENTE'],method:'POST',body:{id_curso:5}})).status,403);
});
test('períodos, notas pendientes y asistencia no filtran datos de otro estudiante',async()=> {
  assert.equal((await peticion('/asignaturas?periodo=1')).data.asignaturas.length,3);
  assert.equal((await peticion('/asignaturas?periodo=2')).data.asignaturas.length,0);
  const horario=await peticion('/horario?periodo=1');
  assert.equal(horario.data.horario.find(h=>h.id_asignatura===1).nombre,'Bases de Datos');
  assert.equal(horario.headers.get('cache-control'),'no-store');
  assert.equal((await peticion('/horario?periodo=1&id_estudiante=1',{id:2})).data.horario.length,0);
  assert.equal((await peticion('/notas?periodo=1')).data.notas.find(n=>n.evaluacion==='Pendiente').nota,null);
  assert.equal((await peticion('/notas?periodo=1',{id:2})).data.notas.length,0);
  assert.ok((await peticion('/asistencia?periodo=1')).data.asistencia.some(a=>a.estado==='PENDIENTE'));
  assert.equal((await peticion('/asistencia?periodo=1',{id:2})).data.asistencia.length,0);
});
test('malla selecciona un solo plan y valida pertenencia',async()=> {
  await catalogo.exec("INSERT INTO plan_estudio(id_carrera,nombre,anio_inicio) VALUES(1,'Plan alternativo',2027); INSERT INTO malla_curricular(id_plan,id_asignatura,semestre) VALUES(2,1,5)");
  const r=await fetch(`${base}/catalogo/carreras/1/malla?plan=1`,{headers:{Authorization:`Bearer ${token(1)}`}});
  const m=await r.json();assert.equal(m.malla.length,3);assert.ok(m.malla.every(a=>a.id_plan===1));
  const invalido=await fetch(`${base}/catalogo/carreras/1/malla?plan=999`,{headers:{Authorization:`Bearer ${token(1)}`}});assert.equal(invalido.status,404);
});
test('solicitudes: propiedad, duplicados, unidad, autorresolución y aprobación',async()=> {
  assert.equal((await peticion('/solicitudes',{method:'POST',body:{id_restriccion:2,motivo:'Solicitud sobre otra persona'}})).status,404);
  const s=await peticion('/solicitudes',{method:'POST',body:{id_restriccion:1,motivo:'Ya se devolvieron los libros'}});assert.equal(s.status,201);
  assert.equal((await peticion('/solicitudes',{method:'POST',body:{id_restriccion:1,motivo:'Solicitud duplicada pendiente'}})).status,409);
  assert.equal((await peticion('/solicitudes',{id:2})).data.solicitudes.length,0);
  const ruta=`/administracion/solicitudes/${s.data.solicitud.id_solicitud}`;
  const body={estado:'APROBADA',resolucion:'Verificada la devolución de libros'};
  assert.equal((await peticion(ruta,{method:'PATCH',body})).status,403);
  assert.equal((await peticion(ruta,{id:4,roles:['ADMIN_UNIDAD'],method:'PATCH',body})).status,403);
  assert.equal((await peticion(ruta,{id:1,roles:['ESTUDIANTE','ADMIN_GENERAL'],method:'PATCH',body})).status,403);
  assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body})).status,200);
  assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body})).status,409);
  assert.equal((await db.query('SELECT activa FROM restriccion WHERE id_restriccion=1')).rows[0].activa,false);
});
test('inscripción valida restricciones, cupo, duplicados, prerrequisitos y choques',async()=> {
  assert.equal((await peticion('/inscripciones',{id:2,method:'POST',body:{id_curso:5}})).status,409);
  await db.exec('UPDATE restriccion SET activa=false WHERE id_estudiante=2');
  const r=await peticion('/inscripciones',{id:2,method:'POST',body:{id_curso:5}});assert.equal(r.status,201);
  assert.equal((await peticion('/inscripciones',{id:2,method:'POST',body:{id_curso:1}})).status,409);
  await usuarios.exec("INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES(5,'Tercero','Estudiante','tercero@test');INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan) VALUES(5,'TERCERO',1,1)");
  assert.equal((await peticion('/inscripciones',{id:5,method:'POST',body:{id_curso:5}})).status,409);
  assert.equal((await peticion('/inscripciones',{id:5,method:'POST',body:{id_curso:3}})).status,409);
  await db.exec("INSERT INTO horario(id_curso,dia_semana,hora_inicio,hora_fin) VALUES(5,'Lunes','09:00','10:00'),(6,'Lunes','09:30','10:30')");
  assert.equal((await peticion('/inscripciones',{id:2,method:'POST',body:{id_curso:6}})).status,409);
  assert.equal((await db.query('SELECT cupo_actual FROM curso WHERE id_curso=5')).rows[0].cupo_actual,1);
  await usuarios.exec(`INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES
    (6,'Primera','Espera','espera1@test'),(7,'Tercera','Espera','espera3@test');
    INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan)
      SELECT id_persona,'ESPERA-'||id_usuario,1,1 FROM persona WHERE id_usuario IN (6,7);`);
  const primerEstudiante=(await usuarios.query('SELECT id_estudiante FROM estudiante e JOIN persona p USING(id_persona) WHERE p.id_usuario=6')).rows[0].id_estudiante;
  const estudiante=(await usuarios.query('SELECT id_estudiante FROM estudiante e JOIN persona p USING(id_persona) WHERE p.id_usuario=5')).rows[0].id_estudiante;
  assert.equal((await peticion('/lista-espera',{id:6,method:'POST',body:{id_curso:5}})).status,201);
  const altaGateway=await fetch(`${base}/api/academico/lista-espera`,{method:'POST',headers:{Authorization:`Bearer ${token(5)}`,'Content-Type':'application/json'},body:JSON.stringify({id_curso:5})});
  assert.equal(altaGateway.status,201);
  assert.equal((await peticion('/lista-espera',{id:5,method:'POST',body:{id_curso:5}})).status,409);
  const oferta=(await peticion('/oferta?periodo=1',{id:5})).data.oferta.find(c=>c.id_curso===5);
  assert.equal(oferta.lista_espera_estado,'ESPERA');assert.equal(oferta.posicion_espera,2);
  await db.query("INSERT INTO restriccion(id_estudiante,tipo,id_unidad) VALUES($1,'Nueva restricción',1)",[primerEstudiante]);
  const gateway=await fetch(`${base}/api/academico/inscripciones/5`,{method:'DELETE',headers:{Authorization:`Bearer ${token(2)}`}});
  assert.equal(gateway.status,200);
  assert.equal((await db.query("SELECT estado FROM lista_espera WHERE id_estudiante=$1 AND id_curso=5 ORDER BY id_lista_espera DESC LIMIT 1",[primerEstudiante])).rows[0].estado,'NO_ELEGIBLE');
  assert.equal((await db.query("SELECT estado FROM lista_espera WHERE id_estudiante=$1 AND id_curso=5 ORDER BY id_lista_espera DESC LIMIT 1",[estudiante])).rows[0].estado,'PROMOVIDA');
  assert.equal((await db.query("SELECT estado FROM inscripcion WHERE id_estudiante=$1 AND id_curso=5",[estudiante])).rows[0].estado,'ACTIVA');
  const promovida=(await peticion('/oferta?periodo=1',{id:5})).data.oferta.find(c=>c.id_curso===5);
  assert.equal(promovida.inscrito,true);assert.equal(promovida.lista_espera_estado,'PROMOVIDA');
  const tercero=(await usuarios.query('SELECT id_estudiante FROM estudiante e JOIN persona p USING(id_persona) WHERE p.id_usuario=7')).rows[0].id_estudiante;
  assert.equal((await peticion('/lista-espera',{id:7,method:'POST',body:{id_curso:5}})).status,201);
  const salidaGateway=await fetch(`${base}/api/academico/lista-espera/5`,{method:'DELETE',headers:{Authorization:`Bearer ${token(7)}`}});
  assert.equal(salidaGateway.status,200);
  assert.equal((await db.query("SELECT estado FROM lista_espera WHERE id_estudiante=$1 AND id_curso=5 ORDER BY id_lista_espera DESC LIMIT 1",[tercero])).rows[0].estado,'CANCELADA');
  assert.equal((await peticion('/lista-espera',{id:7,method:'POST',body:{id_curso:5}})).status,201);
  const aumento=await fetch(`${base}/api/academico/unidad/cursos/5`,{method:'PATCH',headers:{Authorization:`Bearer ${token(3,['ADMIN_UNIDAD'])}`,'Content-Type':'application/json'},body:JSON.stringify({cupo_maximo:2,estado:'ACTIVO',version:1})});
  assert.equal(aumento.status,200);assert.equal((await aumento.json()).promovidos,1);
  assert.equal((await db.query("SELECT estado FROM lista_espera WHERE id_estudiante=$1 AND id_curso=5 ORDER BY id_lista_espera DESC LIMIT 1",[tercero])).rows[0].estado,'PROMOVIDA');
  assert.equal((await db.query("SELECT cupo_actual FROM curso WHERE id_curso=5")).rows[0].cupo_actual,2);
  await db.query("UPDATE inscripcion SET estado='ANULADA' WHERE id_curso=5 AND id_estudiante IN ($1,$2)",[estudiante,tercero]);
  await db.query("UPDATE inscripcion SET estado='ACTIVA' WHERE id_curso=5 AND id_estudiante=2");
  await db.query("DELETE FROM lista_espera WHERE id_curso=5");
  await db.query("UPDATE curso SET cupo_maximo=1,cupo_actual=1,version=1 WHERE id_curso=5");
  await db.query("DELETE FROM restriccion WHERE id_estudiante=$1 AND tipo='Nueva restricción'",[primerEstudiante]);
  await usuarios.query('DELETE FROM estudiante WHERE id_estudiante IN ($1,$2)',[primerEstudiante,tercero]);
  await usuarios.query('DELETE FROM persona WHERE id_usuario IN (6,7)');
});
test('avance depende de resultados finales y cuenta créditos una sola vez',async()=> {
  const inicial=await peticion('/avance-curricular');assert.equal(inicial.data.creditos_aprobados,0);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{method:'PUT',body:{nota:5.5,nota_minima:4}})).status,403);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{id:4,roles:['ADMIN_UNIDAD'],method:'PUT',body:{nota:5.5,nota_minima:4}})).status,403);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{id:3,roles:['ADMIN_UNIDAD'],method:'PUT',body:{nota:5.5,nota_minima:4}})).status,200);
  const avance=await peticion('/avance-curricular');assert.equal(avance.data.creditos_aprobados,5);
  const otro=await peticion('/avance-curricular?id_estudiante=1',{id:2});
  assert.equal(otro.data.creditos_aprobados,0);
  assert.equal(otro.headers.get('cache-control'),'no-store');
  assert.ok(otro.data.asignaturas.every(a=>a.nota===null));
  const a=progreso([{id_asignatura:1,creditos:5}],[{id_asignatura:1,nota:3,nota_minima:4},{id_asignatura:1,nota:5,nota_minima:4}],[]);assert.equal(a.creditos_aprobados,5);
});
test('encuestas: habilitación administrativa, plazo, propiedad y respuesta única',async()=> {
  const fechas=(await db.query("SELECT CURRENT_DATE::text AS inicio,(CURRENT_DATE+7)::text AS fin")).rows[0];
  const body={id_curso_docente:1,titulo:'Evaluación docente',fecha_inicio:fechas.inicio,fecha_fin:fechas.fin,preguntas:['Explica con claridad','Resuelve dudas']};
  assert.equal((await peticion('/administracion/encuestas',{method:'POST',body})).status,403);
  const creada=await peticion('/administracion/encuestas',{id:3,roles:['ADMIN_UNIDAD'],method:'POST',body});assert.equal(creada.status,201);
  const e=(await peticion('/encuestas?periodo=1')).data.encuestas[0];const ruta=`/encuestas/${e.id_encuesta}/respuestas`;
  const respuestas=Object.fromEntries(e.preguntas.map(p=>[p.id_pregunta,5]));
  assert.equal((await peticion(ruta,{id:2,method:'POST',body:{respuestas}})).status,404);
  assert.equal((await peticion(ruta,{method:'POST',body:{respuestas:{}}})).status,400);
  assert.equal((await peticion(ruta,{method:'POST',body:{respuestas}})).status,201);
  assert.equal((await peticion(ruta,{method:'POST',body:{respuestas}})).status,409);
  const listada=(await peticion('/encuestas?periodo=1')).data.encuestas[0];assert.equal(listada.respondida,true);assert.equal(listada.respuestas,undefined);
  await db.exec(`UPDATE encuesta_docente SET fecha_inicio=CURRENT_DATE-8,fecha_fin=CURRENT_DATE-1 WHERE id_encuesta=${e.id_encuesta}`);
  assert.equal((await peticion(ruta,{method:'POST',body:{respuestas}})).status,404);
});
test('certificados PDF paginados, de demostración y solo con datos propios',async()=> {
  const r=await peticion('/certificados/CALIFICACIONES?periodo=1');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\/pdf/);
  assert.ok(r.data.subarray(0,8).toString().startsWith('%PDF-1.4'));assert.match(r.data.toString('latin1'),/SIN VALIDEZ INSTITUCIONAL/);
  assert.equal((await peticion('/certificados/OTRO?periodo=1')).status,404);
  assert.equal((await peticion('/certificados/INSCRIPCION?periodo=2',{id:2})).status,409);
  const pdf=crearPdf(Array.from({length:100},(_,i)=>`Línea ${i} (texto)`));assert.match(pdf.toString('latin1'),/\/Count 3/);
  const texto=pdf.toString('latin1');const offset=Number(texto.match(/startxref\n(\d+)/)[1]);assert.equal(texto.slice(offset,offset+4),'xref');
});
test('gateway conserva PDF binario y errores JSON de descarga',async()=> {
  const headers={Authorization:`Bearer ${token(1)}`};
  const r=await fetch(`${base}/api/academico/certificados/INSCRIPCION?periodo=1`,{headers});
  assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/attachment/);assert.equal(r.headers.get('cache-control'),'no-store');assert.ok((await r.text()).startsWith('%PDF-1.4'));
  const e=await fetch(`${base}/api/academico/certificados/OTRO?periodo=1`,{headers});assert.equal(e.status,404);assert.equal((await e.json()).mensaje,'Certificado no disponible');
});
test('inscripción y calificaciones comparten formato y pie en todas las páginas',async()=> {
  for(const [tipo,titulo] of [['INSCRIPCION','CONSTANCIA DE INSCRIPCIÓN'],['CALIFICACIONES','REPORTE DE CALIFICACIONES']]) {
    const r=await peticion(`/certificados/${tipo}?periodo=1`);assert.equal(r.status,200);
    const texto=r.data.toString('latin1');
    assert.ok(texto.includes(titulo));assert.match(texto,/Departamento de Registro Curricular/);
    assert.match(texto,/0.09 0.18 0.29 rg/);assert.match(texto,/48 65 m 564 65 l S/);
    assert.match(texto,/SIN VALIDEZ INSTITUCIONAL/);assert.match(texto,/Referencia de emisión/);
    assert.match(texto,/20\.000\.000-0/);
    if(tipo==='CALIFICACIONES') {
      assert.match(texto,/Nota final/);assert.match(texto,/\/Count 1\b/);
      assert.doesNotMatch(texto,/Sección|ACTIVA|FINALIZADA|evaluación parcial/);
    } else assert.match(texto,/Sección/);
  }
  const pdf=crearCertificado({titulo:'REPORTE DE CALIFICACIONES',lineas:Array.from({length:40},(_,i)=>`Evaluación ${i}: 5.0`),referencia:'test',fecha:new Date('2026-11-02T12:00:00Z')}).toString('latin1');
  assert.match(pdf,/\/Count 3/);
  assert.equal((pdf.match(/Departamento de Registro Curricular/g)||[]).length,3);
  assert.equal((pdf.match(/Referencia de emisión/g)||[]).length,3);
  for(let i=1;i<=3;i++)assert.ok(pdf.includes(`Página ${i} de 3`));
  assert.ok(pdf.includes('Evaluación 39: 5.0'));
});
test('asignación familiar usa identidad, carrera y período propios y registra emisión',async()=> {
  assert.ok((await peticion('/certificados')).data.certificados.some(c=>c.tipo==='ASIGNACION_FAMILIAR'));
  const r=await peticion('/certificados/ASIGNACION_FAMILIAR?periodo=1');assert.equal(r.status,200);
  const pdf=r.data.toString('latin1');assert.match(pdf,/CERTIFICADO DE ALUMNO REGULAR/);assert.match(pdf,/ASIGNACIÓN FAMILIAR/);
  assert.match(pdf,/20\.000\.000-0/);assert.match(pdf,/ENZO/);assert.match(pdf,/Ingeniería Civil en Computación/);assert.match(pdf,/SIN VALIDEZ INSTITUCIONAL/);
  assert.doesNotMatch(pdf,/OTRO ESTUDIANTE/);assert.doesNotMatch(pdf,/firma institucional válida/i);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM emision_certificado WHERE tipo='ASIGNACION_FAMILIAR' AND id_estudiante=1")).rows[0].n,1);
  assert.equal((await peticion('/certificados/ASIGNACION_FAMILIAR?periodo=2',{id:2})).status,409);
  assert.equal((await peticion('/certificados/ASIGNACION_FAMILIAR?periodo=1',{id:2})).status,409);
  const gateway=await fetch(`${base}/api/academico/certificados/ASIGNACION_FAMILIAR?periodo=1`,{headers:{Authorization:`Bearer ${token(1)}`}});
  assert.equal(gateway.status,200);assert.match(gateway.headers.get('content-disposition'),/asignacion_familiar/);
});
test('solo Administración General habilita inscripción y los cierres se respetan',async()=> {
  const ruta='/administracion/periodos/1/inscripcion',body={abierta:false};
  assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body})).status,403);
  assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_GENERAL'],method:'PATCH',body})).status,200);
  assert.equal((await peticion('/inscripciones',{id:5,method:'POST',body:{id_curso:6}})).status,409);
});

test('Docente: identidad, nómina y pertenencia también se validan en Usuarios',async()=> {
  await usuarios.exec(`INSERT INTO persona(id_persona,id_usuario,nombres,apellido_paterno,correo_institucional) VALUES
    (10,10,'Profesora','Prueba','docente@test'),(11,11,'Otro','Profesor','docente2@test');
    INSERT INTO docente(id_persona,id_unidad) VALUES(10,1),(11,1);`);
  await db.exec('INSERT INTO curso_docente(id_curso,id_docente) VALUES(2,1),(3,2)');
  const p=await peticion('/docente/cursos?periodo=1',{id:10,roles:['DOCENTE']});
  assert.equal(p.status,200);assert.deepEqual(p.data.cursos.map(c=>c.id_curso),[1,2]);
  assert.equal((await peticion('/docente/cursos',{id:1})).status,403);
  assert.equal((await peticion('/docente/cursos',{id:3,roles:['DOCENTE']})).status,403);
  assert.equal((await peticion('/docente/cursos/3/estudiantes',{id:10,roles:['DOCENTE']})).status,403);
  const nomina=await peticion('/docente/cursos/2/estudiantes',{id:10,roles:['DOCENTE']});
  assert.equal(nomina.status,200);assert.equal(nomina.data.estudiantes.length,1);assert.equal(nomina.data.estudiantes[0].nombres,'Enzo');
  assert.equal(nomina.data.estudiantes[0].telefono,undefined);
  const r=await fetch(`${base}/usuarios/docente/cursos/3/estudiantes`,{headers:{Authorization:`Bearer ${token(10,['DOCENTE'])}`}});assert.equal(r.status,403);
  assert.equal((await peticion('/docente/cursos/2/estudiantes',{id:10,roles:['DOCENTE'],autorizado:false})).status,401);
});

test('Docente: evaluaciones validan suma, pertenencia, cierre y versión',async()=> {
  const opciones={id:10,roles:['DOCENTE']};
  const cuerpo={nombre:'Prueba docente',porcentaje:20,fecha:null};
  const creada=await peticion('/docente/cursos/2/evaluaciones',{...opciones,method:'POST',body:cuerpo});assert.equal(creada.status,201);
  const id=creada.data.evaluacion.id_evaluacion;
  assert.equal((await peticion('/docente/cursos/2/evaluaciones',{...opciones,method:'POST',body:{...cuerpo,porcentaje:80}})).status,409);
  assert.equal((await peticion('/docente/cursos/3/evaluaciones',{...opciones,method:'POST',body:cuerpo})).status,403);
  assert.equal((await peticion('/docente/cursos/2/evaluaciones/1',{...opciones,method:'PATCH',body:{...cuerpo,version:1}})).status,404);
  assert.equal((await peticion(`/docente/cursos/2/evaluaciones/${id}`,{...opciones,method:'PATCH',body:{...cuerpo,nombre:'Prueba corregida',version:1}})).status,200);
  assert.equal((await peticion(`/docente/cursos/2/evaluaciones/${id}`,{...opciones,method:'PATCH',body:{...cuerpo,version:1}})).status,409);
  assert.equal((await peticion('/docente/cursos/1/evaluaciones/1',{...opciones,method:'PATCH',body:{...cuerpo,version:1}})).status,409);
});

test('Docente: notas son atómicas, visibles al estudiante y auditadas',async()=> {
  const opciones={id:10,roles:['DOCENTE']},ruta='/docente/cursos/2/evaluaciones/2/notas';
  assert.equal((await peticion('/docente/cursos/2/evaluaciones/1/notas',opciones)).status,404);
  assert.equal((await peticion('/docente/cursos/3/evaluaciones/2/notas',opciones)).status,403);
  const actuales=await peticion(ruta,opciones);assert.equal(actuales.data.notas[0].nota,'6.0');
  const guardar=notas=>peticion(ruta,{...opciones,method:'PUT',body:{notas}});
  assert.equal((await guardar([{id_estudiante:1,nota:8,version:1}])).status,400);
  assert.equal((await guardar([{id_estudiante:'1',nota:5,version:1}])).status,400);
  assert.equal((await guardar([{id_estudiante:1,nota:5.5,version:1},{id_estudiante:2,nota:4,version:0}])).status,409);
  assert.equal((await peticion(ruta,opciones)).data.notas[0].nota,'6.0');
  assert.equal((await guardar([{id_estudiante:1,nota:5.5,version:1}])).status,200);
  assert.equal((await guardar([{id_estudiante:1,nota:6,version:1}])).status,409);
  const estudiante=await peticion('/notas?periodo=1');assert.equal(estudiante.data.notas.find(n=>n.id_evaluacion===2).nota,'5.5');
  const historial=await peticion('/docente/cursos/2/historial',opciones);
  const h=historial.data.historial.find(h=>h.accion==='DOCENTE_NOTA');assert.equal(h.detalle.anterior.nota,'6.0');assert.equal(h.detalle.nuevo,5.5);
  assert.equal((await peticion('/docente/cursos/1/evaluaciones/1/notas',{...opciones,method:'PUT',body:{notas:[{id_estudiante:1,nota:6,version:1}]}})).status,409);
});

test('Docente: clases y asistencia validan fecha, inscritos, versión y auditoría',async()=> {
  const opciones={id:10,roles:['DOCENTE']};
  const fecha=(await db.query('SELECT CURRENT_DATE::text AS fecha')).rows[0].fecha;
  const creada=await peticion('/docente/cursos/2/clases',{...opciones,method:'POST',body:{fecha,hora_inicio:'10:00',hora_fin:'11:00'}});assert.equal(creada.status,201);
  const id=creada.data.clase.id_clase,ruta=`/docente/cursos/2/clases/${id}/asistencias`;
  assert.equal((await peticion('/docente/cursos/2/clases',{...opciones,method:'POST',body:{fecha,hora_inicio:'10:00',hora_fin:'11:00'}})).status,409);
  assert.equal((await peticion('/docente/cursos/2/clases',{...opciones,method:'POST',body:{fecha:'2026-02-30',hora_inicio:'11:00',hora_fin:'10:00'}})).status,400);
  const nomina=await peticion(ruta,opciones);assert.equal(nomina.data.asistencias[0].estado,null);
  const guardar=asistencias=>peticion(ruta,{...opciones,method:'PUT',body:{asistencias}});
  assert.equal((await guardar([{id_estudiante:2,estado:'PRESENTE',version:0}])).status,409);
  assert.equal((await guardar([{id_estudiante:1,estado:'CUALQUIERA',version:0}])).status,400);
  assert.equal((await guardar([{id_estudiante:1,estado:'PRESENTE',observacion:'A tiempo',version:0}])).status,200);
  assert.equal((await guardar([{id_estudiante:1,estado:'AUSENTE',version:0}])).status,409);
  assert.equal((await guardar([{id_estudiante:1,estado:'JUSTIFICADO',observacion:'Documento presentado',version:1}])).status,200);
  assert.equal((await peticion(`/docente/cursos/1/clases/${id}/asistencias`,opciones)).status,404);
  assert.equal((await peticion(`/docente/cursos/3/clases/${id}/asistencias`,opciones)).status,403);
  const estudiante=await peticion('/asistencia?periodo=1');assert.equal(estudiante.data.asistencia.find(a=>a.id_clase===id).estado,'JUSTIFICADO');
  const futuras=(await db.query('SELECT (CURRENT_DATE+1)::text AS fecha')).rows[0].fecha;
  const futura=await peticion('/docente/cursos/2/clases',{...opciones,method:'POST',body:{fecha:futuras,hora_inicio:'10:00',hora_fin:'11:00'}});
  assert.equal((await peticion(`/docente/cursos/2/clases/${futura.data.clase.id_clase}/asistencias`,{...opciones,method:'PUT',body:{asistencias:[{id_estudiante:1,estado:'PRESENTE',version:0}]}})).status,409);
});

test('Docente: gateway y períodos cerrados conservan la separación de permisos',async()=> {
  const headers={Authorization:`Bearer ${token(10,['DOCENTE'])}`};
  const r=await fetch(`${base}/api/academico/docente/cursos/2/estudiantes`,{headers});assert.equal(r.status,200);
  assert.equal((await peticion('/docente/periodos',{id:10,roles:['DOCENTE']})).status,200);
  await db.exec("UPDATE periodo_academico SET estado='CERRADO' WHERE id_periodo=1");
  assert.equal((await peticion('/docente/cursos/2/evaluaciones',{id:10,roles:['DOCENTE'],method:'POST',body:{nombre:'Fuera de plazo',porcentaje:5,fecha:null}})).status,409);
  assert.equal((await peticion('/docente/cursos/2/evaluaciones',{id:10,roles:['DOCENTE']})).status,200);
});

let cursoUnidadId;
test('Unidad: búsqueda y cursos permanecen dentro de su unidad',async()=>{
  await db.exec("UPDATE periodo_academico SET estado='ACTIVO',inscripcion_abierta=true WHERE id_periodo=1");
  await catalogo.exec("INSERT INTO unidad_academica(codigo,nombre) VALUES('OTRA','Otra unidad'); INSERT INTO carrera(id_unidad,codigo,nombre) VALUES(2,'OTRA','Otra carrera'); INSERT INTO plan_estudio(id_carrera,nombre,anio_inicio) VALUES(2,'Otro plan',2026)");
  await usuarios.exec("INSERT INTO persona(id_persona,id_usuario,nombres,apellido_paterno,correo_institucional) VALUES(20,20,'Externo','Estudiante','externo@test'); INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan) VALUES(20,'EXTERNO',2,3)");
  await db.exec('INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES(1,1,2,99,30)');
  const opciones={id:3,roles:['ADMIN_UNIDAD']};
  const r=await peticion('/unidad/cursos?periodo=1',opciones);assert.equal(r.status,200);assert.ok(r.data.cursos.every(c=>c.id_unidad===1));
  const perfiles=await peticion('/unidad/estudiantes',opciones);assert.equal(perfiles.status,200);assert.ok(perfiles.data.estudiantes.every(e=>e.id_carrera===1));assert.equal(perfiles.data.estudiantes.some(e=>e.numero_matricula==='EXTERNO'),false);
  const sinRol=await peticion('/unidad/cursos',{id:1});assert.equal(sinRol.status,403);
  const externos=await peticion('/unidad/cursos',{id:4,roles:['ADMIN_UNIDAD']});assert.ok(externos.data.cursos.every(c=>c.id_unidad===2));
  assert.equal((await peticion('/unidad/cursos/1',{id:4,roles:['ADMIN_UNIDAD'],method:'PATCH',body:{cupo_maximo:50,estado:'ACTIVO',version:1}})).status,403);
  assert.equal((await peticion('/unidad/cursos',{...opciones,method:'POST',body:{id_asignatura:1,id_periodo:1,seccion:10,cupo_maximo:1,id_unidad:2}})).status,201);
  const propio=(await peticion('/unidad/cursos',opciones)).data.cursos.find(c=>c.seccion===10);assert.equal(propio.id_unidad,1);
  cursoUnidadId=propio.id_curso;
});

test('Unidad: manual usa validaciones compartidas y registra motivo y autor',async()=>{
  const opciones={id:3,roles:['ADMIN_UNIDAD']};
  // Curso del plan sin prerrequisitos y sin conflicto con las inscripciones de este alumno.
  const r=await peticion('/unidad/cursos',{...opciones,method:'POST',body:{id_asignatura:2,id_periodo:1,seccion:11,cupo_maximo:1}});assert.equal(r.status,201);
  const curso=r.data.curso.id_curso,ruta=`/unidad/cursos/${curso}/inscripciones`;
  assert.equal((await peticion(ruta,{...opciones,method:'POST',body:{id_estudiante:4,motivo:'Inscripción solicitada por estudiante'}})).status,403);
  const inscrito=await peticion(ruta,{...opciones,method:'POST',body:{id_estudiante:2,motivo:'Inscripción solicitada por estudiante'}});assert.equal(inscrito.status,201);assert.equal(inscrito.data.inscripcion.tipo_inscripcion,'ADMIN_UNIDAD');
  assert.equal((await peticion(ruta,{...opciones,method:'POST',body:{id_estudiante:2,motivo:'Solicitud duplicada de inscripción'}})).status,409);
  assert.equal((await peticion(ruta,{...opciones,method:'POST',body:{id_estudiante:3,motivo:'Solicitud por último cupo disponible'}})).status,409);
  const audit=(await db.query("SELECT detalle FROM auditoria_academica WHERE accion='INSCRIPCION_ADMIN_UNIDAD' ORDER BY id_auditoria DESC LIMIT 1")).rows[0].detalle;assert.equal(audit.id_estudiante,2);assert.equal(audit.motivo,'Inscripción solicitada por estudiante');
  assert.equal((await peticion(`/unidad/cursos/${curso}`,{...opciones,method:'PATCH',body:{cupo_maximo:2,estado:'INACTIVO',version:1}})).status,409);
});

test('Unidad: horarios, cupos y asignaciones conservan historial y revocan acceso',async()=>{
  const opciones={id:3,roles:['ADMIN_UNIDAD']};
  assert.equal((await peticion(`/unidad/cursos/${cursoUnidadId}/horarios`,{...opciones,method:'PUT',body:{version:1,horarios:[{dia_semana:'Jueves',hora_inicio:'10:00',hora_fin:'11:00',sala:'D-1'}]}})).status,200);
  assert.equal((await peticion(`/unidad/cursos/${cursoUnidadId}`,{...opciones,method:'PATCH',body:{version:1,cupo_maximo:5,estado:'ACTIVO'}})).status,409);
  assert.equal((await peticion(`/unidad/cursos/${cursoUnidadId}/docentes/1`,{...opciones,method:'PUT',body:{motivo:'Asignación docente del semestre'}})).status,200);
  assert.equal((await peticion(`/unidad/cursos/${cursoUnidadId}/horarios`,{...opciones,method:'PUT',body:{version:2,horarios:[]}})).status,409);
  assert.equal((await peticion('/unidad/cursos/1/docentes/1',{...opciones,method:'DELETE',body:{motivo:'Reorganización de carga docente'}})).status,200);
  assert.equal((await peticion('/docente/cursos/1/estudiantes',{id:10,roles:['DOCENTE']})).status,403);
  const asignacion=(await db.query('SELECT activa FROM curso_docente WHERE id_curso=1 AND id_docente=1')).rows[0];assert.equal(asignacion.activa,false);
  assert.ok((await db.query('SELECT count(*)::int AS n FROM encuesta_docente')).rows[0].n>0);
});

test('Unidad: restricciones propias, levantamiento y seguimiento estudiantil',async()=>{
  const opciones={id:3,roles:['ADMIN_UNIDAD']};
  assert.equal((await peticion('/unidad/restricciones',{...opciones,method:'POST',body:{id_estudiante:4,tipo:'Administrativa',descripcion:'Restricción ajena a la unidad'}})).status,403);
  const r=await peticion('/unidad/restricciones',{...opciones,method:'POST',body:{id_estudiante:3,tipo:'Administrativa',descripcion:'Pendiente revisión documental'}});assert.equal(r.status,201);
  const restriccion=r.data.restriccion;
  assert.equal((await peticion(`/unidad/cursos/${cursoUnidadId}/inscripciones`,{...opciones,method:'POST',body:{id_estudiante:3,motivo:'Solicitud de inscripción manual'}})).status,409);
  const s=await peticion('/solicitudes',{id:5,method:'POST',body:{id_restriccion:restriccion.id_restriccion,motivo:'Ya presenté la documentación requerida'}});assert.equal(s.status,201);
  const ruta=`/unidad/restricciones/${restriccion.id_restriccion}/levantar`;
  assert.equal((await peticion(ruta,{id:4,roles:['ADMIN_UNIDAD'],method:'PATCH',body:{version:1,motivo:'Revisión por otra unidad'}})).status,403);
  assert.equal((await peticion(ruta,{...opciones,method:'PATCH',body:{version:1,motivo:'Documentación revisada y aceptada'}})).status,200);
  const estado=(await peticion('/solicitudes',{id:5})).data.solicitudes.find(s=>s.id_restriccion===restriccion.id_restriccion);assert.equal(estado.estado,'APROBADA');
  assert.equal((await peticion(ruta,{...opciones,method:'PATCH',body:{version:1,motivo:'Repetición de una operación'}})).status,409);
  const gateway=await fetch(`${base}/api/academico/unidad/cursos?periodo=1`,{headers:{Authorization:`Bearer ${token(3,['ADMIN_UNIDAD'])}`}});assert.equal(gateway.status,200);
});

test('Avance: estudiante sin historial y requisitos por confirmar también se respetan al inscribir',async()=> {
  await usuarios.exec("INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES(99,'Sin','Historial','sin-historial@test'); INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan) SELECT id_persona,'SIN-HISTORIAL',1,1 FROM persona WHERE id_usuario=99");
  const inicial=await peticion('/avance-curricular?id_estudiante=1&id_plan=999',{id:99});
  assert.equal(inicial.status,200);
  assert.equal(inicial.data.plan.id_plan,1);
  assert.equal(inicial.data.sin_historial,true);
  assert.ok(inicial.data.asignaturas.every(a=>a.estado==='PENDIENTE'&&a.nota===null));
  await catalogo.exec("UPDATE malla_curricular SET requisitos_estado='POR_CONFIRMAR' WHERE id_plan=1 AND id_asignatura=2");
  try {
    const per=(await db.query("INSERT INTO periodo_academico(anio,semestre,fecha_inicio,fecha_fin,inscripcion_abierta) VALUES(2030,1,CURRENT_DATE-90,CURRENT_DATE+90,true) RETURNING id_periodo")).rows[0];
    const curso=(await db.query('INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES(2,$1,1,101,30) RETURNING id_curso',[per.id_periodo])).rows[0];
    const avance=await peticion('/avance-curricular',{id:99});
    assert.equal(avance.data.asignaturas.find(a=>a.id_asignatura===2).disponibilidad,'POR_CONFIRMAR');
    const inscripcion=await peticion('/inscripciones',{id:99,method:'POST',body:{id_curso:curso.id_curso}});
    assert.equal(inscripcion.status,409);
    assert.match(inscripcion.data.mensaje,/por confirmar/);
    assert.equal((await peticion('/avance-curricular',{id:99})).data.sin_historial,true);
  } finally {
    await catalogo.exec("UPDATE malla_curricular SET requisitos_estado='CONFIRMADOS' WHERE id_plan=1 AND id_asignatura=2");
  }
});


test('General: JWT y rol protegen todas las rutas institucionales',async()=> {
  for(const ruta of ['/general/resumen','/general/periodos','/general/estudiantes','/general/restricciones','/general/auditoria']) {
    assert.equal((await peticion(ruta,{autorizado:false})).status,401);
    for(const roles of [['ESTUDIANTE'],['DOCENTE'],['ADMIN_UNIDAD']]) assert.equal((await peticion(ruta,{id:3,roles})).status,403);
    assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_GENERAL']})).status,200);
  }
  const r=await fetch(base+'/usuarios/general/estudiantes',{headers:{Authorization:'Bearer '+token(3,['ADMIN_UNIDAD'])}});
  assert.equal(r.status,403);
  const gateway=await fetch(base+'/api/academico/general/resumen',{headers:{Authorization:'Bearer '+token(3,['ADMIN_GENERAL'])}});
  assert.equal(gateway.status,200);
});

test('General: períodos validan fechas, duplicados, versiones y cierre de inscripción',async()=> {
  const admin={id:3,roles:['ADMIN_GENERAL']},body={anio:2090,semestre:1,fecha_inicio:'2090-03-01',fecha_fin:'2090-07-31',motivo:'Crear calendario institucional'};
  assert.equal((await peticion('/general/periodos',{...admin,method:'POST',body:{...body,fecha_inicio:'2090-02-30'}})).status,400);
  assert.equal((await peticion('/general/periodos',{...admin,method:'POST',body:{...body,semestre:3}})).status,400);
  const r=await peticion('/general/periodos',{...admin,method:'POST',body});assert.equal(r.status,201);
  const p=r.data.periodo;assert.equal(p.inscripcion_abierta,false);
  assert.equal((await peticion('/general/periodos',{...admin,method:'POST',body})).status,409);
  const ruta='/general/periodos/'+p.id_periodo;
  const cambio={version:p.version,estado:'ACTIVO',inscripcion_abierta:true,motivo:'Abrir inscripciones institucionales'};
  assert.equal((await peticion(ruta,{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body:cambio})).status,403);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:cambio})).status,200);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:cambio})).status,409);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:{...cambio,version:2,estado:'CERRADO'}})).status,409);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:{...cambio,version:2,estado:'CERRADO',inscripcion_abierta:false}})).status,200);
  assert.equal((await peticion('/administracion/periodos/'+p.id_periodo+'/inscripcion',{...admin,method:'PATCH',body:{abierta:true}})).status,409);
  const registro=(await db.query("SELECT detalle FROM auditoria_academica WHERE accion='GENERAL_EDITAR_PERIODO' ORDER BY id_auditoria DESC LIMIT 1")).rows[0];
  assert.equal(registro.detalle.anterior.inscripcion_abierta,true);assert.equal(registro.detalle.nuevo.estado,'CERRADO');
});

test('General: restricciones globales, autorrestricciones, versiones y solicitudes pendientes',async()=> {
  const admin={id:3,roles:['ADMIN_GENERAL']},body={id_estudiante:2,tipo:'Institucional',descripcion:'Restriccion institucional de prueba'};
  assert.equal((await peticion('/general/restricciones',{...admin,method:'POST',body:{...body,id_estudiante:99999}})).status,404);
  assert.equal((await peticion('/general/restricciones',{id:1,roles:['ESTUDIANTE','ADMIN_GENERAL'],method:'POST',body:{...body,id_estudiante:1}})).status,403);
  const r=await peticion('/general/restricciones',{...admin,method:'POST',body});assert.equal(r.status,201);
  const restriccion=r.data.restriccion;assert.equal(restriccion.id_unidad,null);
  const solicitud=await peticion('/solicitudes',{id:2,method:'POST',body:{id_restriccion:restriccion.id_restriccion,motivo:'Solicito revision institucional'}});assert.equal(solicitud.status,201);
  const ruta='/general/restricciones/'+restriccion.id_restriccion+'/levantar';
  const levantar={version:restriccion.version,motivo:'Revision institucional completada'};
  assert.equal((await peticion('/unidad/restricciones/'+restriccion.id_restriccion+'/levantar',{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body:levantar})).status,403);
  assert.equal((await peticion(ruta,{id:2,roles:['ESTUDIANTE','ADMIN_GENERAL'],method:'PATCH',body:levantar})).status,403);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:{...levantar,version:999}})).status,409);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:levantar})).status,200);
  const actual=(await db.query('SELECT * FROM restriccion WHERE id_restriccion=$1',[restriccion.id_restriccion])).rows[0];
  assert.equal(actual.activa,false);assert.equal(actual.version,2);assert.equal(actual.motivo_levantamiento,levantar.motivo);
  const resuelta=(await db.query('SELECT * FROM solicitud_levantamiento WHERE id_solicitud=$1',[solicitud.data.solicitud.id_solicitud])).rows[0];
  assert.equal(resuelta.estado,'APROBADA');assert.equal(resuelta.resuelta_por,3);
  const filtradas=await peticion('/general/restricciones?estudiante=2',admin);assert.equal(filtradas.status,200);assert.ok(filtradas.data.restricciones.every(r=>r.id_estudiante===2));
});

test('General: auditoría filtrada y paginada, búsqueda limitada sin datos sensibles',async()=> {
  const admin={id:3,roles:['ADMIN_GENERAL']};
  const r=await peticion('/general/auditoria?accion=GENERAL_LEVANTAR_RESTRICCION',admin);
  assert.equal(r.status,200);assert.ok(r.data.total>0);assert.ok(r.data.auditoria.every(a=>a.accion==='GENERAL_LEVANTAR_RESTRICCION'));
  assert.equal((await peticion('/general/auditoria?offset=-1',admin)).status,400);
  assert.equal((await peticion('/general/restricciones?estudiante=abc',admin)).status,400);
  const personas=await peticion('/general/estudiantes?q=OTRO',admin);assert.equal(personas.status,200);assert.equal(personas.data.estudiantes.length,1);
  assert.equal(personas.data.estudiantes[0].telefono,undefined);assert.equal(personas.data.estudiantes[0].password_hash,undefined);
});


async function catalogoAdmin(ruta,{roles=['ADMIN_GENERAL'],method='GET',body,autorizado=true}={}) {
  const r=await fetch(base+'/api/catalogo/general'+ruta,{method,headers:{'Content-Type':'application/json',...(autorizado?{Authorization:'Bearer '+token(3,roles)}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
}
let curricular;
test('Documento General: catálogos restringidos por rol, duplicados, versiones y carrera sin planes',async()=>{
  for(const ruta of ['/unidades','/carreras','/asignaturas','/carreras/1/planes','/planes/1/malla','/oferta?unidad=1','/auditoria']){
    assert.equal((await catalogoAdmin(ruta,{autorizado:false})).status,401);
    for(const roles of [['ESTUDIANTE'],['DOCENTE'],['ADMIN_UNIDAD']])assert.equal((await catalogoAdmin(ruta,{roles})).status,403);
    assert.equal((await catalogoAdmin(ruta)).status,200);
  }
  const body={id_unidad:1,codigo:'TESTADM',nombre:'Carrera de prueba institucional',estado:'ACTIVA',motivo:'Alta institucional de carrera'};
  assert.equal((await catalogoAdmin('/carreras',{roles:['ADMIN_UNIDAD'],method:'POST',body})).status,403);
  assert.equal((await catalogoAdmin('/carreras',{method:'POST',body:{...body,id_unidad:9999}})).status,409);
  const c=await catalogoAdmin('/carreras',{method:'POST',body});assert.equal(c.status,201);
  assert.equal((await catalogoAdmin('/carreras',{method:'POST',body})).status,409);
  const ruta='/carreras/'+c.data.carrera.id_carrera;
  const edit={...body,nombre:'Carrera actualizada',version:1};
  assert.equal((await catalogoAdmin(ruta,{method:'PATCH',body:edit})).status,200);
  assert.equal((await catalogoAdmin(ruta,{method:'PATCH',body:edit})).status,409);
  const a=await catalogoAdmin('/asignaturas',{method:'POST',body:{codigo:'ADM-A',nombre:'Asignatura inicial',creditos:5,estado:'ACTIVA',motivo:'Alta de asignatura institucional'}});assert.equal(a.status,201);
  const b=await catalogoAdmin('/asignaturas',{method:'POST',body:{codigo:'ADM-B',nombre:'Asignatura avanzada',creditos:6,estado:'ACTIVA',motivo:'Alta de asignatura institucional'}});assert.equal(b.status,201);
  assert.equal((await catalogoAdmin('/asignaturas',{method:'POST',body:{codigo:'ADM-A',nombre:'Duplicada',creditos:5,estado:'ACTIVA',motivo:'Intento duplicado de prueba'}})).status,409);
  assert.equal((await catalogoAdmin('/asignaturas',{method:'POST',body:{codigo:'ADM-C',nombre:'Invalida',creditos:-1,estado:'ACTIVA',motivo:'Validacion de creditos'}})).status,400);
  curricular={carrera:c.data.carrera.id_carrera,a:a.data.asignatura,b:b.data.asignatura};
});

test('Documento General: borrador, malla transaccional, prerrequisitos por plan y publicación inmutable',async()=>{
  const {carrera,a,b}=curricular;
  const r=await catalogoAdmin('/carreras/'+carrera+'/planes',{method:'POST',body:{nombre:'Plan institucional',anio_inicio:2091,motivo:'Crear nueva estructura curricular'}});assert.equal(r.status,201);
  const plan=r.data.plan;assert.equal(plan.estado,'BORRADOR');curricular.plan=plan;
  assert.equal((await peticion('/general/cursos',{id:3,roles:['ADMIN_UNIDAD']})).status,403);
  const oculto=await fetch(base+'/catalogo/carreras/'+carrera+'/malla?plan='+plan.id_plan,{headers:{Authorization:'Bearer '+token(1)}});assert.equal(oculto.status,404);
  assert.equal((await catalogoAdmin('/planes/'+plan.id_plan,{method:'PATCH',body:{version:1,estado:'ACTIVO',motivo:'Intento de publicar vacio'}})).status,409);
  const fila=(id,semestre,prerrequisitos=[])=>({id_asignatura:id,semestre,orden:1,obligatoria:true,requisitos_estado:'CONFIRMADOS',requisito_nivel:null,espacio_electivo:false,fuente:null,prerrequisitos,opciones:[]});
  const malla=[fila(a.id_asignatura,1),fila(b.id_asignatura,2,[a.id_asignatura])];
  const ruta='/planes/'+plan.id_plan+'/malla',body={version:1,motivo:'Definir asignaturas y requisitos',malla};
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{...body,malla:[...malla,malla[0]]}})).status,400);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{...body,malla:[fila(a.id_asignatura,1,[b.id_asignatura]),malla[1]]}})).status,400);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{...body,malla:[fila(99999,1)]}})).status,409);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body})).status,200);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body})).status,409);
  const cambio={version:2,estado:'ACTIVO',motivo:'Publicacion curricular aprobada'};
  assert.equal((await catalogoAdmin('/planes/'+plan.id_plan,{method:'PATCH',body:cambio})).status,200);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{...body,version:3}})).status,409);
  const publica=await fetch(base+'/catalogo/carreras/'+carrera+'/malla?plan='+plan.id_plan,{headers:{Authorization:'Bearer '+token(1)}});
  assert.equal(publica.status,200);const datos=await publica.json();assert.equal(datos.prerrequisitos[0].id_asignatura_requisito,a.id_asignatura);
  assert.equal((await catalogo.query('SELECT * FROM prerrequisito WHERE id_asignatura=$1',[b.id_asignatura])).rows.length,0);
  const protegida=await catalogoAdmin('/asignaturas/'+a.id_asignatura,{method:'PATCH',body:{...a,codigo:'OTRO-CODIGO',motivo:'No alterar el historial curricular'}});assert.equal(protegida.status,409);
  const copia=await catalogoAdmin('/carreras/'+carrera+'/planes',{method:'POST',body:{nombre:'Revision del plan',anio_inicio:2092,id_plan_origen:plan.id_plan,motivo:'Copiar estructura para mantenerla'}});assert.equal(copia.status,201);
  const contenido=await catalogoAdmin('/planes/'+copia.data.plan.id_plan+'/malla');assert.equal(contenido.data.malla.length,2);assert.deepEqual(contenido.data.malla[1].prerrequisitos,[a.id_asignatura]);
  const edicion=await catalogoAdmin('/planes/'+copia.data.plan.id_plan+'/malla',{method:'PUT',body:{version:1,motivo:'Revision sin modificar plan previo',malla:[fila(a.id_asignatura,1),fila(b.id_asignatura,2)]}});assert.equal(edicion.status,200);
  const original=await catalogoAdmin('/planes/'+plan.id_plan+'/malla');assert.deepEqual(original.data.malla[1].prerrequisitos,[a.id_asignatura]);
  assert.equal((await catalogoAdmin('/carreras/'+carrera,{method:'PATCH',body:{id_unidad:99999,codigo:'TESTADM',nombre:'Otra',estado:'ACTIVA',version:2,motivo:'Intento de cambiar unidad'}})).status,409);
});

test('Documento General: gestión general de cursos, ocupación y períodos cerrados',async()=>{
  const admin={id:3,roles:['ADMIN_GENERAL']},a=curricular.a;
  const body={id_asignatura:a.id_asignatura,id_unidad:1,id_periodo:1,seccion:80,cupo_maximo:10,motivo:'Registrar oferta general de cursos'};
  assert.equal((await peticion('/general/cursos',{id:3,roles:['ADMIN_UNIDAD'],method:'POST',body})).status,403);
  assert.equal((await peticion('/general/cursos',{...admin,method:'POST',body:{...body,id_unidad:9999}})).status,409);
  assert.equal((await peticion('/general/cursos',{...admin,method:'POST',body:{...body,id_periodo:2}})).status,409);
  const creado=await peticion('/general/cursos',{...admin,method:'POST',body});assert.equal(creado.status,201);const c=creado.data.curso;
  assert.equal((await peticion('/general/cursos',{...admin,method:'POST',body})).status,409);
  const ruta='/general/cursos/'+c.id_curso,cambio={version:1,cupo_maximo:20,estado:'ACTIVO',motivo:'Ampliar cupos de oferta general'};
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:cambio})).status,200);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:cambio})).status,409);
  await db.query("INSERT INTO inscripcion(id_curso,id_estudiante) VALUES($1,1),($1,2)",[c.id_curso]);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:{...cambio,version:2,cupo_maximo:1}})).status,409);
  assert.equal((await peticion(ruta,{...admin,method:'PATCH',body:{...cambio,version:2,estado:'INACTIVO'}})).status,409);
  const lista=await peticion('/general/cursos?periodo=1',admin);assert.equal(lista.status,200);assert.ok(lista.data.cursos.some(r=>r.id_curso===c.id_curso));
  const auditoria=await catalogoAdmin('/auditoria?accion=GENERAL_GUARDAR_MALLA');assert.equal(auditoria.status,200);assert.ok(auditoria.data.total>=2);
  assert.ok(auditoria.data.auditoria.every(r=>r.detalle.motivo));
});


test('Documento General: gestiona otra unidad y una mantención fallida conserva la malla',async()=>{
  const unidad=(await catalogo.query("INSERT INTO unidad_academica(codigo,nombre) VALUES('OTRAADM','Otra unidad institucional') RETURNING *")).rows[0];
  const carrera=await catalogoAdmin('/carreras',{method:'POST',body:{id_unidad:unidad.id_unidad,codigo:'OTRAADM',nombre:'Carrera de otra unidad',estado:'ACTIVA',motivo:'Registrar carrera de otra unidad'}});assert.equal(carrera.status,201);
  const plan=await catalogoAdmin('/carreras/'+carrera.data.carrera.id_carrera+'/planes',{method:'POST',body:{nombre:'Plan otra unidad',anio_inicio:2091,motivo:'Crear plan para otra unidad'}});assert.equal(plan.status,201);
  const fila={id_asignatura:curricular.a.id_asignatura,semestre:1,orden:1,obligatoria:true,requisitos_estado:'CONFIRMADOS',requisito_nivel:null,espacio_electivo:false,fuente:null,prerrequisitos:[],opciones:[]};
  const ruta='/planes/'+plan.data.plan.id_plan+'/malla';
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{version:1,motivo:'Mantencion inicial de malla',malla:[fila]}})).status,200);
  assert.equal((await catalogoAdmin(ruta,{method:'PUT',body:{version:2,motivo:'corto',malla:[]}})).status,400);
  const conservada=await catalogoAdmin(ruta);assert.equal(conservada.data.malla.length,1);assert.equal(conservada.data.plan.version,2);
  assert.equal((await catalogoAdmin('/planes/'+plan.data.plan.id_plan,{method:'PATCH',body:{version:2,estado:'ACTIVO',motivo:'Publicar plan de otra unidad'}})).status,200);
  const admin={id:3,roles:['ADMIN_GENERAL']};
  const curso=await peticion('/general/cursos',{...admin,method:'POST',body:{id_asignatura:curricular.a.id_asignatura,id_unidad:unidad.id_unidad,id_periodo:1,seccion:81,cupo_maximo:30,motivo:'Crear curso fuera de la unidad propia'}});assert.equal(curso.status,201);
  assert.equal((await peticion('/general/cursos/'+curso.data.curso.id_curso,{...admin,method:'PATCH',body:{version:1,cupo_maximo:35,estado:'ACTIVO',motivo:'Administrar curso de otra unidad'}})).status,200);
  const filtrada=await peticion('/general/cursos?unidad='+unidad.id_unidad,admin);assert.equal(filtrada.status,200);assert.ok(filtrada.data.cursos.every(c=>c.id_unidad===unidad.id_unidad));assert.equal(filtrada.data.cursos.length,1);
  assert.equal((await peticion('/unidad/cursos/'+curso.data.curso.id_curso,{id:3,roles:['ADMIN_UNIDAD'],method:'PATCH',body:{version:2,cupo_maximo:40,estado:'ACTIVO'}})).status,403);
});
