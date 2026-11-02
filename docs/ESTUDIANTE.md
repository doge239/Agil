# Módulo Estudiante

Implementa los ocho procesos del levantamiento: inscripción, solicitudes de levantamiento,
horario, notas, asistencia, encuesta docente, avance y descarga de documentos.
Las reglas son de desarrollo, pendientes de validación institucional. Los PDF son de
demostración y llevan la leyenda **SIN VALIDEZ INSTITUCIONAL**.

## Actualizar una instalación existente sin borrar datos

No ejecutar `docker compose down -v` ni volver a ejecutar los archivos `init.sql`.
Hacer una copia de seguridad antes de migrar datos importantes. Las migraciones validan
las relaciones existentes: si encuentran registros huérfanos, estados de asistencia inválidos
o sobrecupos, fallan y revierten la transacción; no eliminan ni corrigen silenciosamente esos datos.

Con las bases disponibles y las dependencias de los servicios instaladas, desde la raíz:

```powershell
$env:DB_HOST = 'localhost'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = 'postgres' # sustituir por la contraseña de tu entorno
$env:DB_PORT = '5434'
$env:DB_NAME = 'usuarios_db'
node databases/migrate.js usuarios
$env:DB_PORT = '5436'
$env:DB_NAME = 'academico_db'
node databases/migrate.js academico
```

El ejecutor registra la versión y omite migraciones ya aplicadas. No guarda credenciales.
Reiniciar los servicios después de aplicar ambas migraciones. Compose monta las mismas
migraciones después de `init.sql` para bases **nuevas**; no las aplica automáticamente
sobre volúmenes existentes. No es necesario migrar Catálogo.

La dependencia de desarrollo PGlite requiere reconstruir la imagen de Académico si se
quieren ejecutar sus pruebas dentro de Docker. Las pruebas no necesitan Docker.

## Configuración y reglas

- El estudiante se resuelve desde el JWT y Usuarios. Ninguna escritura acepta un estudiante
  destino del navegador. El rol `ESTUDIANTE` es obligatorio para las rutas de consulta y escritura propias.
- `estudiante.id_plan` es una referencia lógica a Catálogo. La migración solo asigna el
  plan 1 al perfil de demostración `20260001`, carrera 1. Los demás deben recibir un plan
  válido de su carrera; mientras no exista, oferta y avance informan la configuración faltante.
- El selector elige el período vigente o el último disponible. Todas las consultas temporales
  envían ese período. Solicitudes y avance acumulado no dependen del selector.
- Inscripción está cerrada por defecto. Administración General debe habilitarla explícitamente.
  Requiere curso y período activos, asignatura activa del plan, cupo, ausencia de duplicados
  o asignaturas aprobadas, prerrequisitos aprobados y horario compatible.
- Las restricciones con unidad nula son globales; las demás solo afectan cursos de esa unidad.
  Administración de Unidad solo puede resolver las de su unidad. Las globales requieren
  Administración General. Nadie puede resolver su propia solicitud.
- La inscripción utiliza bloqueo de estudiante y de curso/período en una transacción. La
  ocupación se calcula desde inscripciones activas y actualiza `cupo_actual` en la misma transacción.
  Los futuros endpoints administrativos de inscripción deben utilizar el mismo protocolo de bloqueo.
- Levantar una restricción no exime del resto de las reglas. No hay renuncia ni excepciones
  administrativas implícitas.
- El promedio parcial usa exclusivamente evaluaciones calificadas y muestra el peso cubierto.
  Una nota final se registra explícitamente con su umbral de aprobación. No se infiere del promedio.
  El avance cuenta cada asignatura una vez; aprobar en un intento posterior acredita sus créditos.
  No se implementan equivalencias ni bolsas de electivos: el denominador es la suma de la malla asignada.
- Asistencia muestra clases realizadas desde la inscripción y cualquier registro ya existente.
  Pendiente no significa ausente. El porcentaje mostrado es de estados PRESENTE sobre registros
  confirmados; no determina aprobación ni aplica una política institucional para atrasos/justificaciones.
- Encuesta: escala 1–5, todas las preguntas obligatorias, una respuesta por estudiante/encuesta,
  inscripción válida y plazo habilitado. No se exponen respuestas individuales al docente.
  Se conserva vínculo interno para evitar duplicados: no se afirma anonimato absoluto.
- PDF: constancia de inscripción y reporte de calificaciones del período. Solo datos propios,
  pendientes identificados y emisión registrada. Sin firma, verificación pública ni validez oficial.
  Los tres certificados comparten encabezado, fondo crema, borde, fecha y referencia al pie.
  Los reportes extensos repiten el formato y numeran cada página sin invadir el pie.
- Asignación familiar: certificado de alumno regular con nombre, RUT, carrera, semestre,
  año y fecha de emisión en Coquimbo. Requiere inscripción activa, RUT y carrera registrados.
  Sigue la estructura de la referencia proporcionada, sin copiar datos personales, firma, sello
  ni enlace de validación institucional. Se identifica como demostración.

## Endpoints nuevos

Todas las rutas pasan por `/api/academico` en el gateway y exigen Bearer JWT.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/periodos` | Selector |
| GET | `/oferta?periodo=1` | Cursos del plan y cupos |
| POST | `/inscripciones` | `{ "id_curso": 1 }` |
| GET | `/avance-curricular` | Progreso acumulado |
| GET | `/restricciones` | Restricciones propias |
| GET/POST | `/solicitudes` | Consultar / crear con `id_restriccion`, `motivo` |
| GET | `/encuestas?periodo=1` | Encuestas propias y preguntas |
| POST | `/encuestas/:id/respuestas` | `{ "respuestas": { "1": 5, "2": 4 } }` |
| GET | `/certificados` | Tipos disponibles |
| GET | `/certificados/INSCRIPCION?periodo=1` | PDF |
| GET | `/certificados/CALIFICACIONES?periodo=1` | PDF |
| GET | `/certificados/ASIGNACION_FAMILIAR?periodo=1` | PDF de alumno regular para asignación familiar |

La migración `academico/002_asignacion_familiar.sql` amplía los tipos de emisión sin modificar
certificados anteriores. `node databases/migrate.js academico` aplica las versiones pendientes
y omite las ya registradas. En bases nuevas Compose ejecuta ambas migraciones en orden.

Las rutas existentes `/asignaturas`, `/horario`, `/notas`, `/asistencia` aceptan `?periodo=`.
`/api/catalogo/carreras/:id/malla?plan=` selecciona un solo plan y devuelve planes y prerrequisitos.

## Soporte administrativo mínimo

No incluye todavía pantallas de administración. Requiere cuentas y perfiles reales con los
roles correspondientes; no se crean administradores o docentes de prueba en bases existentes.

| Método | Ruta tras `/api/academico` | Permiso / cuerpo |
|---|---|---|
| GET | `/administracion/solicitudes` | Unidad propia o General |
| PATCH | `/administracion/solicitudes/:id` | `estado`: APROBADA/RECHAZADA; `resolucion`: 10–2000 caracteres |
| POST | `/administracion/encuestas` | Unidad del curso o General; ejemplo inferior |
| PATCH | `/administracion/periodos/:id/inscripcion` | General; `{ "abierta": true }` |
| PUT | `/administracion/inscripciones/:id/resultado` | Unidad del curso o General; `{ "nota": 5.5, "nota_minima": 4.0 }` |

Crear encuesta requiere que ya exista una asignación en `curso_docente`:

```json
{
  "id_curso_docente": 1,
  "titulo": "Evaluación docente",
  "fecha_inicio": "2026-11-01",
  "fecha_fin": "2026-11-30",
  "preguntas": ["Explica los contenidos con claridad", "Responde las dudas"]
}
```

Las fechas son ejemplos y deben ajustarse al período. Inscripción, solicitudes, resoluciones,
creación de encuestas y resultados finales se auditan. La actualización de resultado conserva
el valor anterior en la auditoría. El cierre final no cambia automáticamente el estado de inscripción.

## Validación

```powershell
npm.cmd ci --prefix services/academico-service
npm.cmd test --prefix services/academico-service
npm.cmd run build --prefix frontend
npm.cmd run lint --prefix frontend
```

Las pruebas requieren también las dependencias instaladas de Usuarios, Catálogo y Gateway.
Utilizan tres instancias PostgreSQL WASM en memoria, las migraciones reales y peticiones HTTP
a Express, incluyendo JWT y gateway. No leen ni escriben las bases del entorno ni usan sus usuarios.
Cubren aislamiento, estados pendientes, cupos, duplicados, prerrequisitos, choque de horario,
resolución por unidad, respuestas únicas y PDF binario. PGlite tiene una conexión por instancia:
la contención real entre conexiones y la recuperación del despliegue deben verificarse con PostgreSQL
en Docker. La revisión visual interactiva también queda pendiente si no hay navegador de pruebas.
