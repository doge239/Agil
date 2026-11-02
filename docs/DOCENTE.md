# Módulo Docente

## Acceso y funciones

El login académico acepta Estudiante y Docente. Una cuenta exclusivamente docente se
redirige a `/docente`; los usuarios con ambos roles pueden cambiar de portal desde la cabecera.
Las rutas estudiantiles siguen exigiendo ESTUDIANTE y las docentes DOCENTE.

- `/docente`: cursos asignados y selector de período.
- `/docente/cursos/:idCurso`: nómina, evaluaciones/notas, clases/asistencia e historial.
- `/docente/perfil`: datos personales e identificadores docentes.

La nómina muestra matrícula, nombre, correo institucional y estado de inscripción. Usuarios
consulta los IDs autorizados a Académico usando el JWT original: no acepta listas arbitrarias
de estudiantes desde el navegador. No se exponen teléfonos, respuestas de encuestas o datos
ajenos al curso.

## Actualización sin reinicializar

Aplicar las migraciones pendientes con `node databases/migrate.js academico`, usando las
variables de conexión del entorno como en ESTUDIANTE.md. La versión `003_docente` añade
versiones de registros e índices, conservando datos y notas anteriores.
Compose ejecuta esta versión automáticamente solo al inicializar una base nueva.

Usuarios necesita `ACADEMICO_SERVICE_URL=http://academico-service:4004` en Docker
(ya está en Compose); en ejecución local usa `http://localhost:4004` por defecto.
Recrear Usuarios tras cambiar la configuración: `docker compose up -d usuarios-service`.

## Cuenta de desarrollo opcional

Con las cuatro bases y Auth levantados:

```powershell
docker compose exec -T auth-service node src/scripts/crearDocenteDemo.js
```

El script crea `docente@ucn.cl` con contraseña inicial `123456`, su persona y docente en EIC.
Asigna únicamente cursos de demostración BD001, SI001 y RED001, sección 1, del último período
activo existente. No crea cursos, no borra registros, no cambia contraseñas existentes ni
reasigna docentes anteriores. No se ejecuta automáticamente al arrancar.
Usa IDs generados y puede repetirse para completar un aprovisionamiento interrumpido entre bases.
Las operaciones entre bases no forman una transacción distribuida. Un correo ocupado por otro
perfil o una unidad incompatible detiene el script para no modificar esa identidad.

## Reglas implementadas

- Cada petición verifica rol, perfil docente y asignación al curso. Las asignaciones se consultan
  en cada operación, no se confía en el ID enviado por el navegador.
- Curso y período deben estar ACTIVO para escribir. Los períodos cerrados permiten consulta.
  Este control usa el estado administrativo, no impone fechas institucionales de cierre no definidas.
- Evaluaciones: nombre de 3 a 100 caracteres, fecha opcional válida, ponderación positiva
  de hasta un decimal y total máximo 100%. Se bloquea el curso al comprobar y modificar el total.
  Si existen resultados finales, no se permite editar la evaluación; se requiere revisión administrativa.
- Notas: entre 1,0 y 7,0, hasta un decimal. Solo inscritos activos sin resultado final cerrado.
  Registrar notas parciales no publica un resultado final ni cambia el avance curricular automáticamente.
  No se eliminan notas mediante un campo vacío.
- Asistencia: PRESENTE, AUSENTE, JUSTIFICADO o ATRASADO; observación opcional de hasta
  500 caracteres. Solo inscritos activos a la fecha de la clase. No se registra asistencia futura.
  Filas sin estado permanecen pendientes; no se transforman en ausencias.
- Clases: fecha válida, hora final posterior a la inicial y prevención de duplicados del mismo
  curso/fecha/horario. Se pueden planificar clases futuras y registrar asistencia cuando se realicen.
- Notas y asistencia se guardan por lote en una transacción: un error revierte todo el envío.
  `version=0` significa que todavía no existe el registro; las versiones posteriores evitan
  sobrescribir cambios de otra sesión y devuelven 409 si hay conflicto.
- Cada alta/cambio guarda actor, fecha y valores anteriores/nuevos en `auditoria_academica`.
  El historial del curso muestra las últimas 200 operaciones.

## API

Prefijo del gateway: `/api/academico/docente`. Todas las rutas requieren Bearer JWT.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/periodos` | Períodos disponibles |
| GET | `/cursos?periodo=1` | Cursos propios |
| GET | `/cursos/:id/estudiantes` | Nómina autorizada |
| GET/POST | `/cursos/:id/evaluaciones` | Consultar/crear evaluación |
| PATCH | `/cursos/:id/evaluaciones/:evaluacion` | Editar con `version` |
| GET/PUT | `/cursos/:id/evaluaciones/:evaluacion/notas` | Consultar/guardar lote |
| GET/POST | `/cursos/:id/clases` | Consultar/crear clase |
| GET/PUT | `/cursos/:id/clases/:clase/asistencias` | Consultar/guardar lote |
| GET | `/cursos/:id/historial` | Auditoría del curso |

Ejemplos de cuerpos:

```json
{"nombre":"Prueba 2","porcentaje":30,"fecha":"2026-11-10"}
```

```json
{"notas":[{"id_estudiante":1,"nota":5.5,"version":1}]}
```

```json
{"fecha":"2026-11-02","hora_inicio":"09:40","hora_fin":"11:10"}
```

```json
{"asistencias":[{"id_estudiante":1,"estado":"PRESENTE","observacion":"","version":0}]}
```

Académico expone además `/academico/docente/cursos/:id/inscripciones` para la verificación
entre servicios; el gateway no publica esa ruta. Usuarios también valida el JWT al consultarla.

## Verificación

`npm.cmd test --prefix services/academico-service` ejecuta los flujos de Estudiante y Docente
contra PostgreSQL en memoria y HTTP real. Comprueba pertenencia, rol, aislamiento de nóminas,
ponderación, versiones, reversión de lotes, cierre académico, reflejo en Estudiante y auditoría.
`npm.cmd run build --prefix frontend` y `npm.cmd run lint --prefix frontend` validan el cliente.
La contención entre conexiones se debe comprobar además con PostgreSQL en Docker.
No se ha automatizado una revisión visual en navegador.
