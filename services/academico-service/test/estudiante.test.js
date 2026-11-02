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
});
test('períodos, notas pendientes y asistencia no filtran datos de otro estudiante',async()=> {
  assert.equal((await peticion('/asignaturas?periodo=1')).data.asignaturas.length,3);
  assert.equal((await peticion('/asignaturas?periodo=2')).data.asignaturas.length,0);
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
});
test('avance depende de resultados finales y cuenta créditos una sola vez',async()=> {
  const inicial=await peticion('/avance-curricular');assert.equal(inicial.data.creditos_aprobados,0);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{method:'PUT',body:{nota:5.5,nota_minima:4}})).status,403);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{id:4,roles:['ADMIN_UNIDAD'],method:'PUT',body:{nota:5.5,nota_minima:4}})).status,403);
  assert.equal((await peticion('/administracion/inscripciones/1/resultado',{id:3,roles:['ADMIN_UNIDAD'],method:'PUT',body:{nota:5.5,nota_minima:4}})).status,200);
  const avance=await peticion('/avance-curricular');assert.equal(avance.data.creditos_aprobados,5);
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
    assert.match(texto,/0.99 0.97 0.94 rg/);assert.match(texto,/18 18 576 756 re S/);
    assert.match(texto,/SIN VALIDEZ INSTITUCIONAL/);assert.match(texto,/Referencia de emisión/);
    assert.match(texto,/20\.000\.000-0/);assert.match(texto,/Sección/);
    if(tipo==='CALIFICACIONES')assert.match(texto,/Resultado final/);
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
