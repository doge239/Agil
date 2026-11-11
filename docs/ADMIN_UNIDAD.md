# Administración de Unidad

## Acceso

El portal `/unidad` requiere `ADMIN_UNIDAD` y una unidad asignada al perfil. La unidad se
resuelve desde Usuarios; no se acepta una unidad destino enviada por el navegador.
Las cuentas con varios roles pueden cambiar de portal desde la cabecera.

- `/unidad`: oferta de cursos, creación y selección de período.
- `/unidad/cursos/:id`: cupos/estado, docentes, horarios e inscripción manual.
- `/unidad/restricciones`: creación y levantamiento de restricciones propias.
- `/unidad/solicitudes`: aprobación/rechazo de solicitudes de levantamiento.
- `/unidad/perfil`: datos personales y unidad administrada.

## Migración y entorno

Aplicar `node databases/migrate.js academico` con la conexión de la base local, como en
ESTUDIANTE.md. La versión `004_admin_unidad` añade versiones de curso/restricción,
autor/motivo de restricciones y actividad de asignaciones docentes sin borrar datos.
Compose la ejecuta en orden al crear una base nueva; no reinicializar volúmenes existentes.

Usuarios ahora utiliza también `CATALOGO_SERVICE_URL` para limitar estudiantes por las
carreras de la unidad. Compose ya la configura; en local usa `http://localhost:4003`.
Recrear Usuarios tras configurar: `docker compose up -d usuarios-service`.

La cuenta de demostración se prepara automáticamente con `datos-demo`. Para repetir
su aprovisionamiento por separado:

```powershell
docker compose exec -T auth-service node src/scripts/crearAdminUnidadDemo.js
```

Crea `admin.unidad@ucn.cl` / `123456` para EIC. No cambia contraseñas, no convierte cuentas
de otros roles ni cambia unidades existentes. Es repetible tras un aprovisionamiento parcial;
Auth y Usuarios son transacciones independientes, no una transacción distribuida.

## Reglas

- Cursos: solo la unidad propia. Crear desde asignaturas activas presentes en planes activos
  de carreras activas de esa unidad. Asignatura, período y sección se conservan tras crear el
  curso para no alterar historiales. Se actualizan cupo y estado con control de versión.
- No se baja el cupo por debajo de la ocupación ni se desactiva un curso con inscripciones
  activas. No hay borrado físico de cursos.
- Los horarios se pueden gestionar antes de inscribir estudiantes y asignar docentes; no se
  reprograman automáticamente cursos ya utilizados. Se validan días, horas y superposiciones.
- Docentes: pertenecientes a la unidad, sin choques con otras asignaciones del período.
  Retirar una asignación la desactiva, conserva su historial y revoca el acceso docente al curso.
  Las encuestas y notas anteriores se mantienen.
- Inscripción manual: estudiante de una carrera de la unidad y con plan asignado. Usa el
  mismo motor transaccional de Estudiante, incluidos bloqueos de curso y estudiante, cupos,
  duplicados, plan, prerrequisitos, restricciones, horario y apertura de inscripción.
  Se guarda tipo ADMIN_UNIDAD, actor y motivo. No introduce excepciones institucionales.
- Búsqueda de estudiantes/docentes: máximo 100 resultados; por nombre, matrícula o correo
  según corresponda. Usuarios valida de nuevo el rol y la unidad en el servidor.
- Restricciones: las nuevas siempre afectan solo a la unidad propia. Las globales (unidad
  nula) requieren Administración General y no se administran desde aquí. No se administran
  restricciones propias en cuentas con varios perfiles.
- Levantar una restricción exige motivo y versión vigente. Si hay una solicitud pendiente,
  queda aprobada con el mismo motivo, responsable y fecha. Rechazar una solicitud conserva
  la restricción activa. No se permite resolver solicitudes propias.
- Las operaciones de cursos/asignaciones/horarios/restricciones y la inscripción manual se
  registran en `auditoria_academica`, con valores anteriores cuando corresponda.
- Los períodos cerrados son de consulta. La apertura global de inscripción sigue siendo
  responsabilidad de Administración General.

## API

Prefijo `/api/academico/unidad`, con Bearer JWT:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/periodos` | Selector |
| GET | `/asignaturas` | Asignaturas de planes activos de la unidad |
| GET | `/estudiantes?q=...` | Búsqueda limitada a carreras propias |
| GET | `/docentes?q=...` | Búsqueda de docentes propios |
| GET/POST | `/cursos` | Consultar/crear oferta |
| PATCH | `/cursos/:id` | Cupo y estado con `version` |
| PUT | `/cursos/:id/horarios` | Lista de horarios con `version` |
| PUT/DELETE | `/cursos/:id/docentes/:docente` | Asignar/retirar, cuerpo con `motivo` |
| POST | `/cursos/:id/inscripciones` | `id_estudiante` y `motivo` |
| GET/POST | `/restricciones` | Consultar/crear con `id_estudiante`, `tipo`, `descripcion` |
| PATCH | `/restricciones/:id/levantar` | `motivo` y `version` |

Solicitudes reutilizan `/api/academico/administracion/solicitudes` y su ruta PATCH `/:id`.
Los servicios Usuarios exponen `/usuarios/unidad/estudiantes` y `/usuarios/unidad/docentes`
con idéntico control por unidad para la comunicación interna; no hay acceso anónimo.

## Verificación

`npm.cmd test --prefix services/academico-service` incluye pruebas de acceso entre unidades,
filtrado de perfiles, inscripción manual, cupos/duplicados, auditoría, versiones, revocación de
docentes y seguimiento de solicitudes. Mantiene los escenarios de Estudiante y Docente.
Build y lint del frontend verifican las pantallas. La revisión visual interactiva y la contención
real entre conexiones requieren verificación adicional en el entorno de ejecución.
