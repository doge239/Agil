# Datos compartidos de desarrollo

Para iniciar una copia nueva o actualizar una existente, desde la raíz:

```powershell
docker compose up -d --build
```

Abrir <http://localhost:5173> e ingresar con `estudiante@ucn.cl` y contraseña inicial
`123456`. El escenario compartido incluye el perfil de Enzo (matrícula `20260001`),
la carrera y plan ITI de 47 espacios, elecciones de electivos, 39 resultados aprobados
de semestres I–VI con nota de ejemplo 5,5, siete inscripciones de VII y Capstone pendiente.
El horario incluye 11 sesiones semanales de ejemplo, con horas y salas ficticias.

La cuenta `iti.demo@ucn.cl` / `123456` tiene un escenario separado con aprobaciones,
una reprobación y asignaturas de quinto semestre inscritas.

La carga incluye también los [datos para presentar los cuatro módulos](PRESENTACION.md):
notas parciales, asistencia, encuestas, solicitudes con distintos estados, docentes,
administrador de unidad, tres estudiantes de primer semestre, oferta con lista de espera
y una carrera con malla sintética. La guía contiene las cuentas y el recorrido por apartado.

## Archivos que generan los datos

La preparación compartida crea también `admin.general@ucn.cl` con contraseña inicial
`123456`, su rol `ADMIN_GENERAL`, la persona «Administrador General Demo» y su perfil
en `administrador_general`. Funciona con bases nuevas y existentes, sin duplicar cuentas
ni cambiar contraseñas existentes. Cada integrante debe actualizar el código y ejecutar
`docker compose up -d --build` para incorporar esta cuenta a su propia base.

- `databases/*/init.sql`: estructura y registros iniciales de las cuatro bases.
- `databases/migrations/`: ampliaciones del esquema y malla ITI.
- `services/auth-service/src/scripts/crearUsuario.js`: cuenta principal y rol.
- `services/auth-service/src/scripts/configurarEnzoItiDemo.js`: plan, resultados,
  electivos, inscripciones y horario del estudiante principal.
- `services/auth-service/src/scripts/crearEstudianteItiDemo.js`: segunda cuenta de prueba.
- `services/auth-service/src/scripts/crearAdminGeneralDemo.js`: cuenta y perfil de Administración General.
- `services/auth-service/src/scripts/crearDocenteDemo.js`: cuenta docente de EIC.
- `services/auth-service/src/scripts/crearAdminUnidadDemo.js`: administrador de EIC.
- `services/auth-service/src/scripts/crearDatosPresentacion.js`: docente ITI, nóminas,
  evaluaciones, asistencias, encuestas, solicitudes y catálogo de presentación.
- `services/auth-service/src/scripts/alinearDocentePresentacion.js`: asigna al docente principal
  los mismos cursos de Enzo y traslada los demás ejemplos a la cuenta secundaria, sin borrar
  notas ni asistencias. El ajuste se ejecuta una sola vez por período.
- `services/auth-service/src/scripts/prepararDatosDemo.js`: coordina migraciones y escenarios.

Compose ejecuta `auth-seed` y luego `datos-demo` cuando las bases están listas. Los servicios
que necesitan esos datos esperan a que la preparación termine correctamente. Que ambos
contenedores aparezcan como `Exited (0)` es normal: son tareas que terminan.

Las migraciones llevan un registro de versiones y los escenarios evitan duplicados.
También funciona sobre volúmenes existentes compatibles. La cuenta principal debe conservar
el nombre Enzo y la matrícula `20260001`; si hay otra identidad, el script se detiene para
evitar asignarle datos ajenos. Se conservan contraseñas y resultados existentes. Las tres
inscripciones iniciales sin resultado del plan ICI se anulan solo para este estudiante,
conservando su historial, para mostrar el horario ITI.

Este mecanismo comparte un escenario inicial reproducible. No replica los cambios posteriores
de cada integrante ni reemplaza sus bases con una copia exacta de otra máquina. Las notas por
evaluación y asistencias iniciales del plan ICI permanecen en su historial. La carga de
presentación agrega evaluaciones, asistencias y docentes sintéticos a los cursos actuales
ITI, sin modificar notas ni asistencias anteriores.

## Comprobar o volver a ejecutar

```powershell
docker compose logs datos-demo
docker compose ps -a
docker compose run --rm datos-demo
```

El último comando permite completar una carga interrumpida después del primer arranque.
No hace falta ejecutar `docker compose down -v`: eso borra los datos locales.

Los escenarios necesitan un período académico activo que contenga la fecha actual de la base.
La instalación nueva incluye el segundo semestre de 2026, del 1 de agosto al 20 de diciembre.
Fuera de esas fechas debe configurarse un período vigente antes de repetir la preparación;
los scripts no cambian fechas de períodos existentes. Cualquier error queda en los logs y
bloquea el inicio de los servicios dependientes hasta corregirlo.
