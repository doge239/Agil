// Aprovisionamiento explícito de desarrollo, sin cambiar contraseñas existentes.
require('dotenv').config();
const {Client}=require('pg');
const bcrypt=require('bcrypt');
async function main(){
  const docker=process.env.DB_HOST==='auth-db';
  const comun={user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD||'postgres'};
  const auth=new Client({...comun,host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||(docker?5432:5433)),database:'auth_db'});
  const usuarios=new Client({...comun,host:process.env.USUARIOS_DB_HOST||(docker?'usuarios-db':'localhost'),port:Number(process.env.USUARIOS_DB_PORT||(docker?5432:5434)),database:'usuarios_db'});
  const correo='admin.general@ucn.cl';
  try{
    await auth.connect();await usuarios.connect();
    await auth.query('BEGIN');await auth.query('SELECT pg_advisory_xact_lock(17006,1)');
    let cuenta=(await auth.query('SELECT * FROM usuario WHERE correo=$1',[correo])).rows[0];
    if(cuenta){
      const roles=(await auth.query('SELECT nombre FROM rol JOIN usuario_rol USING(id_rol) WHERE id_usuario=$1',[cuenta.id_usuario])).rows;
      if(!cuenta.activo||!roles.some(r=>r.nombre==='ADMIN_GENERAL'))throw new Error('La cuenta existente no es un administrador general activo; no se modificó');
    }else{
      const rol=(await auth.query("SELECT id_rol FROM rol WHERE nombre='ADMIN_GENERAL'")).rows[0];
      if(!rol)throw new Error('No existe el rol ADMIN_GENERAL');
      cuenta=(await auth.query('INSERT INTO usuario(correo,password_hash) VALUES($1,$2) RETURNING *',[correo,await bcrypt.hash('123456',10)])).rows[0];
      await auth.query('INSERT INTO usuario_rol(id_usuario,id_rol) VALUES($1,$2)',[cuenta.id_usuario,rol.id_rol]);
    }
    await auth.query('COMMIT');
    await usuarios.query('BEGIN');await usuarios.query('SELECT pg_advisory_xact_lock(17006,1)');
    await usuarios.query("INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES($1,'Administrador','General Demo',$2) ON CONFLICT(id_usuario) DO NOTHING",[cuenta.id_usuario,correo]);
    const persona=(await usuarios.query('SELECT * FROM persona WHERE id_usuario=$1',[cuenta.id_usuario])).rows[0];
    if(persona.correo_institucional!==correo)throw new Error('El usuario ya tiene otra identidad; no se modificó');
    await usuarios.query('INSERT INTO administrador_general(id_persona) VALUES($1) ON CONFLICT(id_persona) DO NOTHING',[persona.id_persona]);
    await usuarios.query('COMMIT');
    console.log('Administrador General listo: admin.general@ucn.cl / 123456 (las contraseñas existentes se conservan).');
  }catch(e){await auth.query('ROLLBACK').catch(()=>{});await usuarios.query('ROLLBACK').catch(()=>{});throw e;}
  finally{await auth.end().catch(()=>{});await usuarios.end().catch(()=>{});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
