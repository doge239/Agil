// Preparación compartida de desarrollo. Cada paso debe terminar antes del siguiente.
const {spawnSync} = require('node:child_process');
const path = require('node:path');

function ejecutar(archivo, argumentos = [], variables = {}) {
  const resultado = spawnSync(process.execPath, [archivo, ...argumentos], {
    stdio: 'inherit',
    env: {...process.env, ...variables},
  });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) throw new Error(`Falló la preparación: ${path.basename(archivo)}`);
}

try {
  for (const dominio of ['usuarios', 'catalogo', 'academico']) {
    ejecutar('/app/databases/migrate.js', [dominio], {
      MIGRATION_NODE_MODULES: '/app/node_modules',
      DB_HOST: `${dominio}-db`,
      DB_PORT: '5432',
      DB_NAME: `${dominio}_db`,
    });
  }
  ejecutar(path.join(__dirname, 'configurarEnzoItiDemo.js'));
  ejecutar(path.join(__dirname, 'crearEstudianteItiDemo.js'));
  console.log('Datos compartidos listos: estudiante@ucn.cl e iti.demo@ucn.cl.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
