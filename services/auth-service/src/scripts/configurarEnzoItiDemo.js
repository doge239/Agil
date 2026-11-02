// Escenario solicitado para la cuenta local de Enzo: I–VI aprobados, VII inscrito, VIII pendiente.
// No se ejecuta al iniciar; conserva cursos y registros previos de otros estudiantes.
async function configurar({usuarios,catalogo,academico,idUsuario}) {
  const persona = (await usuarios.query(`SELECT p.*,e.id_estudiante,e.numero_matricula,e.id_plan,e.id_carrera
    FROM persona p JOIN estudiante e USING(id_persona) WHERE p.id_usuario=$1`,[idUsuario])).rows[0];
  if (!persona || persona.nombres.trim().toLowerCase() !== 'enzo' || persona.numero_matricula !== '20260001') {
    throw new Error('La identidad no corresponde a la cuenta local de Enzo; no se modificó.');
  }
  const plan = (await catalogo.query("SELECT p.*,c.id_unidad FROM plan_estudio p JOIN carrera c USING(id_carrera) WHERE referencia='ITI-REFERENCIA-2026'")).rows[0];
  if (!plan) throw new Error('Aplica primero las migraciones del plan ITI.');
  const malla = (await catalogo.query('SELECT * FROM malla_curricular WHERE id_plan=$1 ORDER BY semestre,orden',[plan.id_plan])).rows;
  if (malla.length !== 47) throw new Error('El plan ITI está incompleto.');
  const opciones = (await catalogo.query('SELECT * FROM electivo_opcion WHERE id_plan=$1',[plan.id_plan])).rows;
  const originales = (await catalogo.query("SELECT id_asignatura FROM asignatura WHERE codigo IN ('BD001','SI001','RED001')")).rows.map(a=>a.id_asignatura);
  const actual = (await academico.query("SELECT * FROM periodo_academico WHERE estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin ORDER BY anio DESC,semestre DESC LIMIT 1")).rows[0];
  if (!actual) throw new Error('Se necesita un período vigente; no se alteran las fechas existentes.');
  // Horario ficticio sin cruces, siguiendo la grilla A–F de la referencia visual.
  const horarios = {
    '43': [['Lunes','08:10','09:40','A-101']],
    '41': [['Lunes','11:40','13:10','B-202'],['Miércoles','14:30','16:00','B-202']],
    '44': [['Martes','08:10','09:40','X-205'],['Jueves','11:40','13:10','X-205']],
    '42': [['Miércoles','09:55','11:25','A-203']],
    '39': [['Jueves','09:55','11:25','G-415'],['Viernes','11:40','13:10','G-415']],
    '40': [['Lunes','09:55','11:25','X-209'],['Martes','09:55','11:25','X-209']],
    '38': [['Viernes','08:10','09:40','LAB-1']],
  };
  const descripcion = 'Escenario de prueba solicitado: semestres I–VI aprobados, VII inscrito y Capstone pendiente. Notas, salas y horarios de ejemplo.';
  await academico.query('BEGIN');
  try {
    await academico.query('SELECT pg_advisory_xact_lock(17001,$1)',[persona.id_estudiante]);
    await academico.query("INSERT INTO periodo_academico(anio,semestre,fecha_inicio,fecha_fin,estado) VALUES($1,1,make_date($1,1,1),make_date($1,6,30),'CERRADO') ON CONFLICT(anio,semestre) DO NOTHING",[actual.anio-1]);
    const anterior = (await academico.query('SELECT * FROM periodo_academico WHERE anio=$1 AND semestre=1',[actual.anio-1])).rows[0];
    const anuladas = await academico.query(`UPDATE inscripcion i SET estado='ANULADA' FROM curso c
      WHERE i.id_curso=c.id_curso AND i.id_estudiante=$1 AND c.id_asignatura=ANY($2::int[]) AND i.estado='ACTIVA'
      AND NOT EXISTS(SELECT 1 FROM resultado_final r WHERE r.id_inscripcion=i.id_inscripcion) RETURNING i.id_inscripcion,i.id_curso`,[persona.id_estudiante,originales]);
    for (const opcion of opciones) {
      const previa = (await academico.query('SELECT * FROM eleccion_electivo WHERE id_estudiante=$1 AND id_plan=$2 AND id_espacio=$3',[persona.id_estudiante,plan.id_plan,opcion.id_espacio])).rows[0];
      if (previa && previa.id_asignatura !== opcion.id_asignatura) throw new Error('Hay una elección electiva distinta. Revisar antes de cambiarla.');
      await academico.query('INSERT INTO eleccion_electivo(id_estudiante,id_plan,id_espacio,id_asignatura) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[persona.id_estudiante,plan.id_plan,opcion.id_espacio,opcion.id_asignatura]);
    }
    const cursos = new Set(anuladas.rows.map(i=>i.id_curso));
    for (const a of malla) {
      if (a.semestre === 8) continue;
      const aprobada = a.semestre <= 6;
      const per = aprobada ? anterior : actual;
      const id = opciones.find(o=>o.id_espacio===a.id_asignatura)?.id_asignatura ?? a.id_asignatura;
      // Sección propia del escenario para no modificar los cursos compartidos de la demo anterior.
      await academico.query('INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES($1,$2,$3,98,40) ON CONFLICT DO NOTHING',[id,per.id_periodo,plan.id_unidad]);
      const curso = (await academico.query('SELECT * FROM curso WHERE id_asignatura=$1 AND id_periodo=$2 AND seccion=98',[id,per.id_periodo])).rows[0];
      if ((await academico.query('SELECT 1 FROM inscripcion WHERE id_curso=$1 AND id_estudiante<>$2',[curso.id_curso,persona.id_estudiante])).rows.length) throw new Error('La sección de ejemplo ya es utilizada por otro estudiante; no se modificó.');
      cursos.add(curso.id_curso);
      await academico.query('INSERT INTO inscripcion(id_estudiante,id_curso,estado) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[persona.id_estudiante,curso.id_curso,aprobada?'FINALIZADA':'ACTIVA']);
      if (aprobada) {
        const inscripcion = (await academico.query('SELECT id_inscripcion FROM inscripcion WHERE id_estudiante=$1 AND id_curso=$2',[persona.id_estudiante,curso.id_curso])).rows[0];
        await academico.query('INSERT INTO resultado_final(id_inscripcion,nota,nota_minima,registrado_por) VALUES($1,5.5,4,$2) ON CONFLICT DO NOTHING',[inscripcion.id_inscripcion,idUsuario]);
      } else for (const [dia,inicio,fin,sala] of horarios[a.referencia] ?? []) {
        await academico.query(`INSERT INTO horario(id_curso,dia_semana,hora_inicio,hora_fin,sala)
          SELECT $1::int,$2::varchar,$3::time,$4::time,$5::varchar WHERE NOT EXISTS(SELECT 1 FROM horario WHERE id_curso=$1 AND dia_semana=$2::varchar AND hora_inicio=$3::time AND hora_fin=$4::time)`,[curso.id_curso,dia,inicio,fin,sala]);
      }
    }
    for (const id of cursos) await academico.query("UPDATE curso SET cupo_actual=(SELECT count(*) FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA') WHERE id_curso=$1",[id]);
    const yaRegistrado = (await academico.query("SELECT 1 FROM auditoria_academica WHERE accion='CONFIGURAR_ESCENARIO_ITI' AND id_usuario=$1 AND detalle->>'id_estudiante'=$2::text",[idUsuario,String(persona.id_estudiante)])).rows.length;
    if (!yaRegistrado) await academico.query('INSERT INTO auditoria_academica(id_usuario,accion,detalle) VALUES($1,$2,$3)',[idUsuario,'CONFIGURAR_ESCENARIO_ITI',JSON.stringify({id_estudiante:persona.id_estudiante,id_plan:plan.id_plan,plan_anterior:persona.id_plan,carrera_anterior:persona.id_carrera,inscripciones_demo_anuladas:anuladas.rows,descripcion,origen:'Script local, escenario autorizado por el usuario'})]);
    await academico.query('COMMIT');
  } catch(e) { await academico.query('ROLLBACK'); throw e; }
  // La preparación académica se completa antes de asignar el plan. Repetible tras una interrupción.
  await usuarios.query('UPDATE estudiante SET id_carrera=$2,id_plan=$3 WHERE id_estudiante=$1',[persona.id_estudiante,plan.id_carrera,plan.id_plan]);
  return {id_estudiante:persona.id_estudiante,id_plan:plan.id_plan,aprobadas:39,inscritas:7,pendientes:1};
}
async function main() {
  require('dotenv').config();
  const {Client} = require('pg');
  const docker = process.env.DB_HOST === 'auth-db';
  const nombres = ['auth','usuarios','catalogo','academico'];
  const clientes = nombres.map((nombre,i)=>new Client({host:process.env[`${nombre.toUpperCase()}_DB_HOST`] || (docker?`${nombre}-db`:'localhost'),port:Number(process.env[`${nombre.toUpperCase()}_DB_PORT`] || (docker?5432:5433+i)),database:`${nombre}_db`,user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD||'postgres'}));
  try {
    for (const db of clientes) await db.connect();
    const [auth,usuarios,catalogo,academico] = clientes;
    const cuenta = (await auth.query("SELECT u.id_usuario FROM usuario u JOIN usuario_rol ur USING(id_usuario) JOIN rol r USING(id_rol) WHERE u.correo='estudiante@ucn.cl' AND u.activo AND r.nombre='ESTUDIANTE'")).rows[0];
    if (!cuenta) throw new Error('No existe la cuenta local estudiante@ucn.cl con rol ESTUDIANTE.');
    console.log(await configurar({usuarios,catalogo,academico,idUsuario:cuenta.id_usuario}));
    console.log('Enzo configurado con ITI. Datos de ejemplo identificados en la malla y en el horario.');
  } finally { for (const db of clientes) await db.end().catch(()=>{}); }
}
if (require.main === module) main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports = {configurar};
