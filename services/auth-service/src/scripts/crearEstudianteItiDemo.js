// Aprovisionamiento explícito de una identidad sintética. No modifica estudiantes existentes.
require('dotenv').config();
const {Client} = require('pg');
const bcrypt = require('bcrypt');
async function main() {
  const docker = process.env.DB_HOST === 'auth-db';
  const clientes = ['auth','usuarios','catalogo','academico'].map((nombre, i) => new Client({
    host:process.env[`${nombre.toUpperCase()}_DB_HOST`] || (docker ? `${nombre}-db` : 'localhost'),
    port:Number(process.env[`${nombre.toUpperCase()}_DB_PORT`] || (docker ? 5432 : 5433+i)),
    database:`${nombre}_db`, user:process.env.DB_USER || 'postgres', password:process.env.DB_PASSWORD || 'postgres',
  }));
  const [auth,usuarios,catalogo,academico] = clientes;
  const correo = 'iti.demo@ucn.cl';
  try {
    for (const db of clientes) await db.connect();
    const plan = (await catalogo.query("SELECT p.*,c.id_unidad FROM plan_estudio p JOIN carrera c USING(id_carrera) WHERE p.referencia='ITI-REFERENCIA-2026'")).rows[0];
    if (!plan) throw new Error('Aplica primero las migraciones de Catálogo (001 y 002) y Académico (005).');
    await auth.query('BEGIN');
    await auth.query('SELECT pg_advisory_xact_lock(17004,1)');
    let cuenta = (await auth.query('SELECT * FROM usuario WHERE correo=$1',[correo])).rows[0];
    if (cuenta) {
      const rol = await auth.query("SELECT 1 FROM usuario_rol JOIN rol USING(id_rol) WHERE id_usuario=$1 AND nombre='ESTUDIANTE'",[cuenta.id_usuario]);
      if (!cuenta.activo || !rol.rowCount) throw new Error('La cuenta demo existente es incompatible; no se modificó.');
    } else {
      cuenta = (await auth.query('INSERT INTO usuario(correo,password_hash) VALUES($1,$2) RETURNING *',[correo,await bcrypt.hash('123456',10)])).rows[0];
      const rol = (await auth.query("SELECT id_rol FROM rol WHERE nombre='ESTUDIANTE'")).rows[0];
      if (!rol) throw new Error('No existe el rol ESTUDIANTE');
      await auth.query('INSERT INTO usuario_rol VALUES($1,$2)',[cuenta.id_usuario,rol.id_rol]);
    }
    await auth.query('COMMIT');
    await usuarios.query('BEGIN');
    await usuarios.query('SELECT pg_advisory_xact_lock(17004,1)');
    await usuarios.query("INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES($1,'Estudiante','Demo ITI',$2) ON CONFLICT(id_usuario) DO NOTHING",[cuenta.id_usuario,correo]);
    const persona = (await usuarios.query('SELECT * FROM persona WHERE id_usuario=$1',[cuenta.id_usuario])).rows[0];
    if (persona.correo_institucional !== correo || persona.apellido_paterno !== 'Demo ITI') throw new Error('La cuenta ya tiene otra identidad. No se modificó.');
    await usuarios.query("INSERT INTO estudiante(id_persona,numero_matricula,id_carrera,id_plan,anio_ingreso) VALUES($1,'DEMO-ITI-2026',$2,$3,2026) ON CONFLICT(id_persona) DO NOTHING",[persona.id_persona,plan.id_carrera,plan.id_plan]);
    const estudiante = (await usuarios.query('SELECT * FROM estudiante WHERE id_persona=$1',[persona.id_persona])).rows[0];
    if (estudiante.numero_matricula !== 'DEMO-ITI-2026' || estudiante.id_plan !== plan.id_plan || estudiante.id_carrera !== plan.id_carrera) throw new Error('El estudiante existente no es el demo de ITI. No se modificó.');
    await usuarios.query('COMMIT');
    const malla = (await catalogo.query('SELECT m.*,a.nombre FROM malla_curricular m JOIN asignatura a USING(id_asignatura) WHERE id_plan=$1 ORDER BY semestre,orden',[plan.id_plan])).rows;
    const opciones = (await catalogo.query('SELECT * FROM electivo_opcion WHERE id_plan=$1',[plan.id_plan])).rows;
    await academico.query('BEGIN');
    await academico.query('SELECT pg_advisory_xact_lock(17004,1)');
    const fechas = (await academico.query('SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS anio, CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)<=6 THEN 1 ELSE 2 END AS semestre')).rows[0];
    const actual = (await academico.query("SELECT * FROM periodo_academico WHERE estado='ACTIVO' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin ORDER BY anio DESC,semestre DESC LIMIT 1")).rows[0];
    if (!actual) throw new Error('Se necesita un período vigente para los ramos amarillos. No se modificaron fechas de períodos existentes.');
    await academico.query("INSERT INTO periodo_academico(anio,semestre,fecha_inicio,fecha_fin,estado) VALUES($1,1,make_date($1,1,1),make_date($1,6,30),'CERRADO') ON CONFLICT(anio,semestre) DO NOTHING",[fechas.anio-1]);
    const anterior = (await academico.query('SELECT * FROM periodo_academico WHERE anio=$1 AND semestre=1',[fechas.anio-1])).rows[0];
    for (const opcion of opciones) await academico.query('INSERT INTO eleccion_electivo(id_estudiante,id_plan,id_espacio,id_asignatura) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[estudiante.id_estudiante,plan.id_plan,opcion.id_espacio,opcion.id_asignatura]);
    for (const a of malla) {
      if (a.semestre > 5) continue;
      const reprobada = a.referencia === '29'; // Resultado sintético de Ingeniería de Software; puede repetirla.
      const aprobada = a.semestre <= 4;
      const per = aprobada || reprobada ? anterior : actual;
      const id = opciones.find(o => o.id_espacio === a.id_asignatura)?.id_asignatura ?? a.id_asignatura;
      await academico.query('INSERT INTO curso(id_asignatura,id_periodo,id_unidad,seccion,cupo_maximo) VALUES($1,$2,$3,99,40) ON CONFLICT DO NOTHING',[id,per.id_periodo,plan.id_unidad]);
      const curso = (await academico.query('SELECT * FROM curso WHERE id_asignatura=$1 AND id_periodo=$2 AND seccion=99',[id,per.id_periodo])).rows[0];
      await academico.query('INSERT INTO inscripcion(id_estudiante,id_curso,estado) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[estudiante.id_estudiante,curso.id_curso,aprobada || reprobada ? 'FINALIZADA' : 'ACTIVA']);
      if (aprobada || reprobada) {
        const inscripcion = (await academico.query('SELECT id_inscripcion FROM inscripcion WHERE id_estudiante=$1 AND id_curso=$2',[estudiante.id_estudiante,curso.id_curso])).rows[0];
        await academico.query('INSERT INTO resultado_final(id_inscripcion,nota,nota_minima,registrado_por) VALUES($1,$2,4,$3) ON CONFLICT DO NOTHING',[inscripcion.id_inscripcion,reprobada ? 3.2 : 5.5,cuenta.id_usuario]);
      }
      await academico.query("UPDATE curso SET cupo_actual=(SELECT count(*) FROM inscripcion WHERE id_curso=$1 AND estado='ACTIVA') WHERE id_curso=$1",[curso.id_curso]);
    }
    await academico.query('COMMIT');
    console.log(`Demo ITI lista: ${correo} / contraseña inicial 123456. Historial sintético; las contraseñas y resultados existentes no se cambian.`);
  } catch (e) {
    for (const db of clientes) await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { for (const db of clientes) await db.end().catch(() => {}); }
}
main().catch(e => {console.error(e.message);process.exitCode=1;});
