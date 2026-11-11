// Ajuste versionado de la demostración: docente@ucn.cl comparte los cursos de Enzo.
require('dotenv').config();
const {Client}=require('pg');
const ACCION='DEMO_DOCENTE_MISMOS_RAMOS_V1';

async function alinear({usuarios,academico}) {
  const estudiante=(await usuarios.query(`SELECT e.* FROM estudiante e JOIN persona p USING(id_persona)
    WHERE p.correo_institucional='estudiante@ucn.cl' AND e.numero_matricula='20260001'`)).rows[0];
  const perfiles=(await usuarios.query(`SELECT d.*,p.id_usuario,p.correo_institucional FROM docente d JOIN persona p USING(id_persona)
    WHERE p.correo_institucional IN ('docente@ucn.cl','docente.iti@ucn.cl')`)).rows;
  const principal=perfiles.find(p=>p.correo_institucional==='docente@ucn.cl');
  const secundario=perfiles.find(p=>p.correo_institucional==='docente.iti@ucn.cl');
  if(!estudiante||!principal||!secundario||!principal.id_unidad||principal.id_unidad!==secundario.id_unidad) {
    throw new Error('Faltan las identidades compatibles de demostración de Estudiante y Docente');
  }
  await academico.query('BEGIN');
  try {
    await academico.query('SELECT pg_advisory_xact_lock(17008,1)');
    const periodo=(await academico.query(`SELECT * FROM periodo_academico WHERE estado='ACTIVO'
      AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin ORDER BY anio DESC,semestre DESC LIMIT 1`)).rows[0];
    if(!periodo)throw new Error('No hay un período vigente para alinear los cursos de demostración');
    const yaAplicado=await academico.query("SELECT 1 FROM auditoria_academica WHERE accion=$1 AND detalle->>'id_periodo'=$2",
      [ACCION,String(periodo.id_periodo)]);
    if(yaAplicado.rowCount){await academico.query('COMMIT');console.log('Docente y estudiante ya alineados; se conservan cambios posteriores.');return;}
    await academico.query('SELECT id_curso FROM curso WHERE id_periodo=$1 ORDER BY id_curso FOR UPDATE',[periodo.id_periodo]);
    const cursos=(await academico.query(`SELECT c.* FROM curso c JOIN inscripcion i USING(id_curso)
      WHERE i.id_estudiante=$1 AND i.estado='ACTIVA' AND c.estado='ACTIVO' AND c.id_periodo=$2 ORDER BY c.id_curso`,
    [estudiante.id_estudiante,periodo.id_periodo])).rows;
    if(!cursos.length||cursos.some(c=>c.id_unidad!==principal.id_unidad))throw new Error('El estudiante no tiene cursos activos compatibles con la unidad docente');
    const ids=cursos.map(c=>c.id_curso);
    const anteriores=(await academico.query(`SELECT cd.* FROM curso_docente cd JOIN curso c USING(id_curso)
      WHERE cd.id_docente=ANY($1::int[]) AND c.id_periodo=$2`,[[principal.id_docente,secundario.id_docente],periodo.id_periodo])).rows;
    const otros=anteriores.filter(a=>a.id_docente===principal.id_docente&&a.activa&&!ids.includes(a.id_curso)).map(a=>a.id_curso);
    const secundarios=[...new Set([...otros,...anteriores.filter(a=>a.id_docente===secundario.id_docente&&a.activa&&!ids.includes(a.id_curso)).map(a=>a.id_curso)])];
    for(const conjunto of [ids,secundarios]) {
      const choque=await academico.query(`SELECT h.id_curso,h2.id_curso AS otro FROM horario h JOIN horario h2
        ON h.id_curso<h2.id_curso AND lower(h.dia_semana)=lower(h2.dia_semana)
        AND h.hora_inicio<h2.hora_fin AND h2.hora_inicio<h.hora_fin
        WHERE h.id_curso=ANY($1::int[]) AND h2.id_curso=ANY($1::int[]) LIMIT 1`,[conjunto]);
      if(choque.rowCount)throw new Error('Los cursos de demostración tienen un choque de horario; no se cambiaron las asignaciones');
    }
    await academico.query(`UPDATE curso_docente cd SET activa=false FROM curso c WHERE cd.id_curso=c.id_curso AND c.id_periodo=$1
      AND ((cd.id_docente=$2 AND NOT(cd.id_curso=ANY($4::int[]))) OR (cd.id_docente=$3 AND cd.id_curso=ANY($4::int[])))`,
    [periodo.id_periodo,principal.id_docente,secundario.id_docente,ids]);
    for(const [idDocente,conjunto] of [[principal.id_docente,ids],[secundario.id_docente,secundarios]]) {
      for(const idCurso of conjunto) await academico.query(`INSERT INTO curso_docente(id_curso,id_docente) VALUES($1,$2)
        ON CONFLICT(id_curso,id_docente) DO UPDATE SET activa=true`,[idCurso,idDocente]);
    }
    // Las respuestas ya entregadas conservan su asignación histórica. Solo se trasladan encuestas sin respuestas.
    const encuestas=(await academico.query(`UPDATE encuesta_docente e SET id_curso_docente=nuevo.id_curso_docente
      FROM curso_docente viejo JOIN curso c ON c.id_curso=viejo.id_curso JOIN curso_docente nuevo ON nuevo.id_curso=c.id_curso AND nuevo.activa
      WHERE e.id_curso_docente=viejo.id_curso_docente AND c.id_periodo=$1
      AND ((viejo.id_docente=$3 AND nuevo.id_docente=$2 AND c.id_curso=ANY($4::int[]))
        OR (viejo.id_docente=$2 AND nuevo.id_docente=$3 AND c.id_curso=ANY($5::int[])))
      AND NOT EXISTS(SELECT 1 FROM respuesta_encuesta r WHERE r.id_encuesta=e.id_encuesta)
      RETURNING e.id_encuesta,e.id_curso_docente`,[periodo.id_periodo,principal.id_docente,secundario.id_docente,ids,otros])).rows;
    const sesiones=(await academico.query(`UPDATE sesion_asistencia_qr s SET cerrada=now() FROM clase cl JOIN curso_docente cd ON cd.id_curso=cl.id_curso
      WHERE s.id_clase=cl.id_clase AND s.id_docente=cd.id_docente AND NOT cd.activa AND s.cerrada IS NULL
      AND s.id_docente=ANY($1::int[]) AND cl.id_curso=ANY($2::int[]) RETURNING s.id_sesion`,
    [[principal.id_docente,secundario.id_docente],[...ids,...otros]])).rows;
    await academico.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[principal.id_usuario,ACCION,
      JSON.stringify({demostracion:true,id_periodo:periodo.id_periodo,id_estudiante:estudiante.id_estudiante,
        docente_principal:principal.id_docente,docente_secundario:secundario.id_docente,cursos_estudiante:ids,
        cursos_secundarios:secundarios,asignaciones_anteriores:anteriores,encuestas_trasladadas:encuestas,sesiones_cerradas:sesiones,
        descripcion:'docente@ucn.cl comparte los cursos actuales de estudiante@ucn.cl; los demás cursos de ejemplo pasan a docente.iti@ucn.cl.'})]);
    await academico.query('COMMIT');
    console.log(`Docente principal alineado: ${ids.length} cursos compartidos con estudiante@ucn.cl.`);
  } catch(error){await academico.query('ROLLBACK');throw error;}
}

async function main() {
  const docker=process.env.DB_HOST==='auth-db';
  const clientes=['usuarios','academico'].map((nombre,i)=>new Client({
    host:process.env[`${nombre.toUpperCase()}_DB_HOST`]||(docker?`${nombre}-db`:'localhost'),
    port:Number(process.env[`${nombre.toUpperCase()}_DB_PORT`]||(docker?5432:[5434,5436][i])),
    database:`${nombre}_db`,user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD||'postgres',
  }));
  try {for(const db of clientes)await db.connect();await alinear({usuarios:clientes[0],academico:clientes[1]});}
  finally{for(const db of clientes)await db.end().catch(()=>{});}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={alinear};
