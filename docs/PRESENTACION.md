# Datos para presentar los cuatro módulos

Actualizar el repositorio y ejecutar desde la raíz:

```powershell
docker compose up -d --build
```

Abrir <http://localhost:5173>. `datos-demo` carga el escenario en bases nuevas y existentes.
No borrar volúmenes ni ejecutar SQL manualmente. Son datos sintéticos y PDF sin validez institucional.

## Cuentas

Para mostrar la generación de QR, el registro con RUT y la grilla docente, seguir la
[guía de asistencia QR](ASISTENCIA_QR.md), que incluye los RUT sintéticos y el acceso desde celulares.

Contraseña inicial: **123456**. Se conservan las contraseñas que ya se cambiaron.

| Cuenta | Uso |
|---|---|
| `estudiante@ucn.cl` | Enzo: siete ramos de VII, 39 aprobados y Capstone pendiente |
| `iti.demo@ucn.cl` | Segundo historial ITI, con aprobaciones, una reprobación y ramos de V |
| `docente@ucn.cl` | Los mismos siete cursos actuales de `estudiante@ucn.cl`, con Enzo en cada nómina |
| `docente.iti@ucn.cl` | Los demás cursos de ejemplo; elegir sección **97** para nóminas de hasta tres estudiantes |
| `admin.unidad@ucn.cl` | Administración de Unidad EIC |
| `admin.general@ucn.cl` | Administración General |
| `demo.estudiante1@ucn.cl` | Camila: primer semestre, inscrita en el curso lleno de sección 97 |
| `demo.estudiante2@ucn.cl` | Diego: primer semestre y lista de espera |
| `demo.estudiante3@ucn.cl` | Valentina: primer semestre y lista de espera |

## Recorrido según los requerimientos entregados

| Apartado | Escenario de prueba |
|---|---|
| Estudiante: inscripción | Oferta ITI con horarios y cupos. La sección 97 incluye cursos disponibles, uno lleno y otro vacío. Diego y Valentina están en espera. |
| Estudiante: solicitudes | Enzo tiene dos pendientes (unidad y global), una aprobada y una rechazada. **Demo · Solicitud por enviar** permite crear otra durante la presentación. |
| Estudiante: horario | Se conservan las 11 sesiones semanales de Enzo; los estudiantes nuevos tienen horarios independientes. |
| Estudiante: notas | Prueba 30 %, trabajo 30 % y proyecto 40 %. Dos notas variadas y proyecto pendiente por curso. Si había evaluaciones, solo se usa la ponderación restante. |
| Estudiante: asistencia | Asistió, faltó y justificado, con pendientes neutros. Los justificados suman asistencia y conservan el amarillo. Los atrasos históricos se muestran como asistencia. |
| Estudiante: encuestas | Cuatro preguntas por encuesta, una respondida y las demás disponibles durante el período. |
| Estudiante: avance | Se mantienen los 47 espacios, 39 aprobados, siete inscritos y Capstone pendiente. El segundo historial muestra también una reprobación. |
| Estudiante: certificados | Desde Enzo se descargan constancia de inscripción, reporte de calificaciones y certificado para asignación familiar. |
| Docente: nóminas | `docente@ucn.cl`: Enzo en los mismos siete cursos. `docente.iti@ucn.cl`, sección 97: Camila, Diego y Valentina en el primer curso. |
| Docente: notas | Consultar las calificaciones precargadas o ingresar la del proyecto pendiente. No se cierran los siete ramos de Enzo. |
| Docente: asistencia e historial | Clases realizadas y asistencia editable, con historial de la importación identificado como sintético en auditoría. |
| Unidad: cursos y docentes | Sección 97 con distintos cupos, horarios y docentes; el quinto curso comienza vacío para ensayar operaciones. |
| Unidad: inscripción manual | Buscar matrículas `DEMO-PRES-001`, `DEMO-PRES-002` y `DEMO-PRES-003`; usar cursos de primer semestre aún no inscritos. |
| Unidad: restricciones | Buscar Enzo para ver restricciones activas/levantadas y solicitudes de unidad pendientes y resueltas. La global corresponde a Administración General. |
| General: carreras y catálogo | Carrera **DEMO-SW — Ingeniería de Software — Demostración**, con cuatro asignaturas `DEMO-SW1` a `DEMO-SW4`. Se conservan ICI e ITI. |
| General: malla | **Plan de presentación 2026**, cuatro semestres y tres prerrequisitos. Copiarlo a un borrador desde la interfaz para probar edición. |
| General: operación | Períodos, oferta, solicitud global pendiente y auditoría académica y del catálogo. |

La inscripción conserva su configuración: en una instalación nueva está **cerrada**. Para
demostrar altas, retiros y promoción desde la espera, habilitarla como Administración General
en **Períodos e inscripción**. Las restricciones de prueba de Enzo bloquean nuevas altas hasta
resolverse; usar los estudiantes nuevos para probar sin esas restricciones. No se omiten
prerrequisitos ni choques de horario.

## Repetición y conservación

`crearDatosPresentacion.js` se ejecuta tras las migraciones y escenarios ITI. La carga académica
es transaccional, con marca por período: repetir el arranque conserva notas, asistencias,
respuestas, solicitudes y cambios posteriores. Cuentas y catálogo tienen transacciones
independientes; una interrupción puede completarse repitiendo el comando. No existe una
transacción distribuida entre bases.

Las identidades o códigos reservados incompatibles provocan error, sin sustituirse. Revisar
`docker compose logs datos-demo`. Las fechas se ajustan al período vigente y las inscripciones
locales: los IDs y la cantidad de clases históricas pueden variar entre equipos. Los cambios
posteriores de cada integrante no se sincronizan.

## Prueba automatizada

Requiere PostgreSQL 17 desechable y vacío: crea cuatro bases y falla si ya existen. No apuntar
a la instancia de trabajo. La red predeterminada de este checkout es `agil_default`.

```powershell
docker compose build datos-demo
docker run -d --name agil-presentacion-prueba --network agil_default --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=postgres postgres:17
# Continuar cuando PostgreSQL esté disponible.
docker exec agil-presentacion-prueba pg_isready -U postgres
docker compose run --rm --no-deps -e TEST_DATABASE_HOST=agil-presentacion-prueba datos-demo node --test tests/datosPresentacion.test.js
docker rm -f agil-presentacion-prueba
```

Comprueba instalación nueva, preservación de registros, asistencia coherente, ponderaciones,
cupos, encuestas, solicitudes, lista de espera e idempotencia después de cambiar una nota,
una asistencia y una contraseña en la instancia de prueba.
