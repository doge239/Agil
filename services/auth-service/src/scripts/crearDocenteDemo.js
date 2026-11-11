// Aprovisionamiento compartido de desarrollo. No cambia contraseñas existentes.
require('dotenv').config();
const {Client}=require('pg');
const bcrypt=require('bcrypt');
async function main() {
  const docker=process.env.DB_HOST==='auth-db';
  const comun={user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD||'postgres'};
  const auth=new Client({...comun,host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||(docker?5432:5433)),database:'auth_db'});
  const usuarios=new Client({...comun,host:process.env.USUARIOS_DB_HOST||(docker?'usuarios-db':'localhost'),port:Number(process.env.USUARIOS_DB_PORT||(docker?5432:5434)),database:'usuarios_db'});
  const catalogo=new Client({...comun,host:process.env.CATALOGO_DB_HOST||(docker?'catalogo-db':'localhost'),port:Number(process.env.CATALOGO_DB_PORT||(docker?5432:5435)),database:'catalogo_db'});
  const academico=new Client({...comun,host:process.env.ACADEMICO_DB_HOST||(docker?'academico-db':'localhost'),port:Number(process.env.ACADEMICO_DB_PORT||(docker?5432:5436)),database:'academico_db'});
  const clientes=[auth,usuarios,catalogo,academico];
  try {
    for(const db of clientes)await db.connect();
    const unidad=(await catalogo.query("SELECT id_unidad FROM unidad_academica WHERE codigo='EIC'")).rows[0];
    if(!unidad)throw new Error('No existe la unidad de demostración EIC');
    const asignaturas=(await catalogo.query("SELECT id_asignatura FROM asignatura WHERE codigo IN ('BD001','SI001','RED001')")).rows;
    await auth.query('BEGIN');
    await auth.query('SELECT pg_advisory_xact_lock(17003,1)');
    const correo='docente@ucn.cl';let cuenta=(await auth.query('SELECT * FROM usuario WHERE correo=$1',[correo])).rows[0];
    if(cuenta) {
      const roles=(await auth.query('SELECT r.nombre FROM rol r JOIN usuario_rol ur USING(id_rol) WHERE ur.id_usuario=$1',[cuenta.id_usuario])).rows;
      if(!roles.some(r=>r.nombre==='DOCENTE'))throw new Error('El correo docente@ucn.cl ya está ocupado por otro perfil; no se modificó');
      if(!cuenta.activo)throw new Error('La cuenta docente existente está inactiva; no se reactivó');
    } else {
      const hash=await bcrypt.hash('123456',10);
      cuenta=(await auth.query('INSERT INTO usuario(correo,password_hash) VALUES($1,$2) RETURNING *',[correo,hash])).rows[0];
      const rol=(await auth.query("SELECT id_rol FROM rol WHERE nombre='DOCENTE'")).rows[0];
      if(!rol)throw new Error('No existe el rol DOCENTE');
      await auth.query('INSERT INTO usuario_rol(id_usuario,id_rol) VALUES($1,$2)',[cuenta.id_usuario,rol.id_rol]);
    }
    await auth.query('COMMIT');
    await usuarios.query('BEGIN');
    await usuarios.query('SELECT pg_advisory_xact_lock(17003,1)');
    await usuarios.query(`INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES($1,'Docente','Demostración',$2) ON CONFLICT(id_usuario) DO NOTHING`,[cuenta.id_usuario,correo]);
    const persona=(await usuarios.query('SELECT * FROM persona WHERE id_usuario=$1',[cuenta.id_usuario])).rows[0];
    if(persona.correo_institucional!==correo)throw new Error('El usuario ya tiene otro perfil personal; no se modificó');
    await usuarios.query('INSERT INTO docente(id_persona,id_unidad) VALUES($1,$2) ON CONFLICT(id_persona) DO NOTHING',[persona.id_persona,unidad.id_unidad]);
    const docente=(await usuarios.query('SELECT * FROM docente WHERE id_persona=$1',[persona.id_persona])).rows[0];
    if(docente.id_unidad!==unidad.id_unidad)throw new Error('El docente pertenece a otra unidad; no se modificó');
    await usuarios.query('COMMIT');
    await academico.query('BEGIN');
    const alineado=await academico.query(`SELECT 1 FROM auditoria_academica WHERE accion='DEMO_DOCENTE_MISMOS_RAMOS_V1'
      AND detalle->>'id_periodo'=(SELECT id_periodo::text FROM periodo_academico WHERE estado='ACTIVO'
        AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin ORDER BY anio DESC,semestre DESC LIMIT 1)`);
    const cursos=alineado.rowCount?{rowCount:0}:await academico.query(`INSERT INTO curso_docente(id_curso,id_docente)
      SELECT c.id_curso,$1 FROM curso c WHERE c.id_unidad=$2 AND c.seccion=1 AND c.id_asignatura=ANY($3::int[])
      AND c.id_periodo=(SELECT id_periodo FROM periodo_academico WHERE estado='ACTIVO' ORDER BY anio DESC,semestre DESC LIMIT 1)
      ON CONFLICT(id_curso,id_docente) DO NOTHING RETURNING id_curso`,[docente.id_docente,unidad.id_unidad,asignaturas.map(a=>a.id_asignatura)]);
    await academico.query('COMMIT');
    console.log(`Docente de demostración listo: ${correo}. Asignaciones nuevas: ${cursos.rowCount}. Contraseña inicial: 123456 (las existentes no se cambian).`);
  } catch(e) {
    for(const db of clientes)await db.query('ROLLBACK').catch(()=>{});
    throw e;
  } finally {for(const db of clientes)await db.end().catch(()=>{});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
