// Ejecutar desde la raíz: node databases/migrate.js usuarios|academico
// Usa las dependencias pg ya instaladas del servicio seleccionado.
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const dominio=process.argv[2];
  if(!['usuarios','academico'].includes(dominio)) throw new Error('Uso: node databases/migrate.js usuarios|academico');
  require(path.resolve(__dirname,`../services/${dominio}-service/node_modules/dotenv`)).config({path:path.resolve(__dirname,`../services/${dominio}-service/.env`),quiet:true});
  const {Client}=require(path.resolve(__dirname,`../services/${dominio}-service/node_modules/pg`));
  const db=new Client({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||(dominio==='usuarios'?5434:5436)),database:process.env.DB_NAME||`${dominio}_db`,user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD});
  await db.connect();
  try {
    await db.query('SELECT pg_advisory_lock(17002,1)');
    const existe=(await db.query("SELECT to_regclass('public.schema_migration') AS tabla")).rows[0].tabla;
    const aplicadas=new Set(existe?(await db.query('SELECT version FROM schema_migration')).rows.map(r=>r.version):[]);
    const carpeta=path.join(__dirname,'migrations',dominio);
    for(const archivo of fs.readdirSync(carpeta).filter(f=>/^\d+_.*\.sql$/.test(f)).sort()) {
      const version=archivo.slice(0,-4);
      if(aplicadas.has(version)) { console.log(`${dominio}: ${version} ya aplicada`); continue; }
      await db.query(fs.readFileSync(path.join(carpeta,archivo),'utf8'));
      console.log(`${dominio}: ${version} aplicada conservando registros existentes`);
    }
  } catch(e) { await db.query('ROLLBACK'); throw e; }
  finally { await db.end(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
