// Cuenta explícita de desarrollo; no altera contraseñas ni identidades existentes.
require('dotenv').config();
const {Client}=require('pg'),bcrypt=require('bcrypt');
async function main(){
  const docker=process.env.DB_HOST==='auth-db',comun={user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD||'postgres'};
  const auth=new Client({...comun,host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||(docker?5432:5433)),database:'auth_db'});
  const usuarios=new Client({...comun,host:process.env.USUARIOS_DB_HOST||(docker?'usuarios-db':'localhost'),port:Number(process.env.USUARIOS_DB_PORT||(docker?5432:5434)),database:'usuarios_db'});
  const catalogo=new Client({...comun,host:process.env.CATALOGO_DB_HOST||(docker?'catalogo-db':'localhost'),port:Number(process.env.CATALOGO_DB_PORT||(docker?5432:5435)),database:'catalogo_db'});
  const clientes=[auth,usuarios,catalogo],correo='admin.unidad@ucn.cl';
  try{
    for(const db of clientes)await db.connect();
    const unidad=(await catalogo.query("SELECT id_unidad FROM unidad_academica WHERE codigo='EIC'")).rows[0];if(!unidad)throw new Error('No existe la unidad de demostración EIC');
    await auth.query('BEGIN');await auth.query('SELECT pg_advisory_xact_lock(17005,1)');
    let cuenta=(await auth.query('SELECT * FROM usuario WHERE correo=$1',[correo])).rows[0];
    if(cuenta){
      const roles=(await auth.query('SELECT nombre FROM rol JOIN usuario_rol USING(id_rol) WHERE id_usuario=$1',[cuenta.id_usuario])).rows;
      if(!cuenta.activo||!roles.some(r=>r.nombre==='ADMIN_UNIDAD'))throw new Error('La cuenta existente no es un administrador activo de unidad; no se modificó');
    }else{
      const rol=(await auth.query("SELECT id_rol FROM rol WHERE nombre='ADMIN_UNIDAD'")).rows[0];if(!rol)throw new Error('No existe el rol ADMIN_UNIDAD');
      cuenta=(await auth.query('INSERT INTO usuario(correo,password_hash) VALUES($1,$2) RETURNING *',[correo,await bcrypt.hash('123456',10)])).rows[0];
      await auth.query('INSERT INTO usuario_rol(id_usuario,id_rol) VALUES($1,$2)',[cuenta.id_usuario,rol.id_rol]);
    }
    await auth.query('COMMIT');
    await usuarios.query('BEGIN');await usuarios.query('SELECT pg_advisory_xact_lock(17005,1)');
    await usuarios.query("INSERT INTO persona(id_usuario,nombres,apellido_paterno,correo_institucional) VALUES($1,'Administrador','Unidad Demo',$2) ON CONFLICT(id_usuario) DO NOTHING",[cuenta.id_usuario,correo]);
    const persona=(await usuarios.query('SELECT * FROM persona WHERE id_usuario=$1',[cuenta.id_usuario])).rows[0];if(persona.correo_institucional!==correo)throw new Error('El usuario ya tiene otra identidad personal; no se modificó');
    await usuarios.query('INSERT INTO administrador_unidad(id_persona,id_unidad) VALUES($1,$2) ON CONFLICT(id_persona) DO NOTHING',[persona.id_persona,unidad.id_unidad]);
    const perfil=(await usuarios.query('SELECT * FROM administrador_unidad WHERE id_persona=$1',[persona.id_persona])).rows[0];if(perfil.id_unidad!==unidad.id_unidad)throw new Error('El administrador pertenece a otra unidad; no se modificó');
    await usuarios.query('COMMIT');
    console.log(`Administrador de demostración listo: ${correo}. Contraseña inicial: 123456 (las existentes no se cambian).`);
  }catch(e){for(const db of clientes)await db.query('ROLLBACK').catch(()=>{});throw e;}
  finally{for(const db of clientes)await db.end().catch(()=>{});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
