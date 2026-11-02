# Administración General

## Requisitos y alcance

La fuente funcional es **Requerimientos_Modulos_Banner (3).docx**, apartado
«Módulo 4. Administración General», aportado por el usuario. Estos son sus cuatro
requisitos y las operaciones que los implementan:

| Requisito del documento | Implementación |
| --- | --- |
| Creación y administración de carreras | Crear, editar, activar/desactivar carreras y asociarlas a una unidad |
| Registro y gestión general de cursos | Crear cursos en cualquier unidad y período activo; gestionar cupos y estado; consultar oferta y horarios |
| Registro y mantención de mallas curriculares por carrera | Crear/copiar planes, editar borradores y publicar mallas con semestres, requisitos, niveles y opciones electivas |
| Registro y mantención de catálogos de carreras y sus asignaturas | Catálogos editables de carreras/asignaturas, códigos, créditos, descripción y disponibilidad; las mallas establecen la relación por carrera |

Además se conservan las responsabilidades institucionales ya documentadas en
Estudiante y Administración de Unidad:

- Acceso exclusivo con JWT y rol `ADMIN_GENERAL`, comprobado en los servicios.
- Resumen institucional de períodos, inscripción, cursos, restricciones y solicitudes.
- Crear períodos académicos y activar/cerrar períodos existentes. Los nuevos se crean
  con inscripción cerrada. Año entre 2000 y 2200, semestre 1 o 2, fechas reales y ordenadas.
- Abrir/cerrar la inscripción para todas las unidades. Un período cerrado no admite
  inscripción; el motor de inscripción conserva las validaciones de plan, cupos,
  prerrequisitos, restricciones y horario.
- Buscar estudiantes de todas las carreras por nombre, matrícula o correo, con un
  máximo de 100 resultados y sin exponer contraseñas ni datos personales innecesarios.
- Crear restricciones globales (`id_unidad = NULL`) y consultar/levantar restricciones
  de cualquier unidad. Las restricciones globales bloquean la inscripción del estudiante
  en todas las unidades; las de unidad mantienen su alcance anterior.
- Resolver solicitudes globales o de cualquier unidad. Aprobar levanta la restricción;
  rechazar conserva su estado. Levantar directamente aprueba las solicitudes pendientes.
- Consultar auditoría, con filtro exacto por acción y páginas de 50 registros.

Las escrituras de períodos y restricciones se realizan en transacciones, con bloqueo
del registro y control de versión. Una versión desactualizada devuelve 409 y exige
recargar. Los cambios institucionales registran actor, motivo y valores anteriores.
Nadie puede crear/levantar sus propias restricciones ni resolver sus propias solicitudes,
incluso si tiene varios roles. No hay borrado de períodos, restricciones o auditorías.

El documento deja las reglas específicas para el análisis funcional. Las siguientes
son decisiones de implementación para proteger el historial existente:

- Carreras y asignaturas se desactivan, sin borrado físico. Los códigos son únicos,
  de hasta 20 caracteres (letras, números, punto, guion y guion bajo), normalizados a
  mayúsculas. Las carreras se crean solo en unidades activas y no cambian de unidad
  una vez que tienen planes. Las nuevas asignaturas requieren código y créditos
  entre 0 y 60; los datos desconocidos heredados pueden conservarse como tales.
- Código y créditos de una asignatura usada en una malla no se cambian; se crea otra
  asignatura para ese cambio. Nombre, descripción y disponibilidad siguen siendo
  editables y auditados.
- Los planes nuevos nacen como BORRADOR; se puede copiar un plan de la misma carrera.
  La malla publicada conserva su estructura: para mantenerla se crea una copia nueva.
  La publicación no reasigna automáticamente a los estudiantes ni desactiva planes
  anteriores. Los planes publicados se pueden desactivar/reactivar, sin volver a borrador.
- Los borradores son visibles solo para Administración General y no generan oferta.
  Un plan gestionado solo se activa con una malla no vacía, carrera activa y asignaturas
  activas. Se admiten hasta 200 espacios, semestres 1–20 y orden 0–200. Los requisitos
  pertenecen al mismo plan y a semestres anteriores: se rechazan ciclos y autorrequisitos.
  Los niveles requeridos son 1–7 y anteriores al semestre de la asignatura.
- Cada espacio puede declarar requisitos por confirmar, una fuente y opciones
  electivas. Las opciones deben existir, estar activas y no duplicar espacios de la malla.
  No se inventan créditos ni requisitos de los datos históricos pendientes.
- Los requisitos de planes nuevos se guardan por plan (`prerrequisito_plan`). Los
  planes anteriores siguen leyendo sus requisitos heredados; copiar y editar no
  modifica esos registros. Si un origen heredado tiene requisitos fuera de su malla,
  se rechaza la copia y se exige revisarlos en un borrador nuevo.
- La estructura de un borrador se guarda completa en una transacción con control
  de versión del plan. Se registran la malla anterior, la nueva, el actor y el motivo.
- Los cursos conservan asignatura, período, unidad y sección tras crearse. Solo
  asignaturas de planes activos de la unidad pueden generar cursos. No se reduce
  el cupo por debajo de la ocupación, no se desactivan cursos con inscripciones activas
  y los períodos cerrados son de consulta. Las validaciones de catálogo y la escritura
  académica pertenecen a servicios distintos; no constituyen una transacción distribuida.

El documento no solicita altas/bajas de cuentas ni cambios de roles. La gestión de
docentes, horarios e inscripción manual continúa disponible en Administración de Unidad.

## Pantallas

| Ruta | Función |
| --- | --- |
| `/general` | Resumen y accesos |
| `/general/carreras` | Catálogo y administración de carreras |
| `/general/carreras/:idCarrera/planes` | Crear/copiar planes por carrera |
| `/general/planes/:idPlan` | Mantener, publicar y consultar una malla |
| `/general/asignaturas` | Catálogo y administración de asignaturas |
| `/general/cursos` | Cursos de todas las unidades, filtros y registro |
| `/general/periodos` | Creación, estado e inscripción institucional |
| `/general/restricciones` | Búsqueda de estudiantes y restricciones |
| `/general/solicitudes` | Aprobación/rechazo con resolución obligatoria |
| `/general/auditoria` | Acciones, responsables y detalle |

El módulo conserva los temas, navegación adaptable y componentes existentes. Las cuentas
con varios roles pueden cambiar de portal desde la cabecera. No depende de tener un
período vigente para entrar o crear el primer período.

## Migración y cuenta de desarrollo

`006_admin_general` añade la versión del período y un índice para auditoría. No elimina
registros. Compose la aplica tanto a bases nuevas como existentes mediante `datos-demo`.
En Catálogo, `003_admin_general` añade versiones de carreras/asignaturas/planes,
requisitos por plan y auditoría. No cambia las mallas ni requisitos heredados.

```powershell
docker compose up -d --build
docker compose exec -T auth-service node src/scripts/crearAdminGeneralDemo.js
```

Cuenta compartida de desarrollo: `admin.general@ucn.cl` / `123456`. El aprovisionamiento es automático mediante `datos-demo` y
repetible; conserva contraseñas e identidades existentes y rechaza una cuenta que no
tenga el rol esperado. Auth y Usuarios usan transacciones independientes; si falla el
segundo paso se puede repetir para completar el perfil. Cada integrante obtiene la cuenta
en su base al actualizar el código y ejecutar `docker compose up -d --build`.
El comando individual anterior permite repararla sin repetir todos los escenarios.

Para aplicar solamente la migración desde Node local con las variables de conexión
configuradas: `node databases/migrate.js academico` y
`node databases/migrate.js catalogo`. No reinicializar volúmenes.

## API

Prefijo `/api/academico/general`, Bearer JWT:

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/resumen` | Indicadores institucionales |
| GET/POST | `/periodos` | Listar/crear; creación requiere motivo |
| PATCH | `/periodos/:idPeriodo` | `estado`, `inscripcion_abierta`, `version`, `motivo` |
| GET | `/estudiantes?q=...` | Búsqueda institucional limitada |
| GET | `/restricciones?estudiante=...&offset=0` | Listado de 50, filtro opcional |
| POST | `/restricciones` | `id_estudiante`, `tipo`, `descripcion`; siempre global |
| PATCH | `/restricciones/:idRestriccion/levantar` | `version`, `motivo` |
| GET | `/auditoria?accion=...&offset=0` | Consulta paginada |
| GET/POST | `/cursos` | Listar/registrar; filtros opcionales `periodo` y `unidad` |
| PATCH | `/cursos/:idCurso` | `cupo_maximo`, `estado`, `version`, `motivo` |

Prefijo `/api/catalogo/general`, también exclusivo de `ADMIN_GENERAL`:

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/unidades` | Unidades para selección |
| GET/POST | `/carreras` | Catálogo y creación |
| PATCH | `/carreras/:idCarrera` | Datos/estado con versión y motivo |
| GET/POST | `/asignaturas` | Catálogo y creación |
| PATCH | `/asignaturas/:idAsignatura` | Datos/estado con versión y motivo |
| GET/POST | `/carreras/:idCarrera/planes` | Listar/crear; origen de copia opcional |
| GET/PUT | `/planes/:idPlan/malla` | Consultar/guardar estructura del borrador |
| PATCH | `/planes/:idPlan` | Cambiar estado con versión y motivo |
| GET | `/oferta?unidad=...` | Asignaturas habilitadas para crear cursos |
| GET | `/auditoria?accion=...&offset=0` | Registro de operaciones de catálogo |

La pantalla de auditoría permite elegir operaciones académicas o de catálogo.

Las solicitudes reutilizan GET `/api/academico/administracion/solicitudes` y PATCH
`/api/academico/administracion/solicitudes/:idSolicitud`. Usuarios protege además
`/usuarios/general/estudiantes` para las consultas internas entre servicios.
El endpoint anterior de apertura de inscripción se conserva por compatibilidad,
incrementa la versión y rechaza abrir períodos cerrados.

## Verificación

`npm.cmd test --prefix services/academico-service` incluye escenarios de acceso por
rol, fechas, duplicados, versiones obsoletas, cierre institucional, autorrestricciones,
restricciones globales, seguimiento de solicitudes, filtros de auditoría y gateway.
Los escenarios del documento cubren además permisos de catálogo, carreras y asignaturas
duplicadas, versiones, borradores ocultos, validación/publicación de mallas, requisitos
independientes por plan, copia sin modificar el origen y cursos generales con límites de cupo.
Mantiene los escenarios de los otros tres portales. El build de frontend comprueba
TypeScript y genera la aplicación. La interacción visual en navegador y la contención
entre conexiones PostgreSQL simultáneas requieren una revisión adicional.
