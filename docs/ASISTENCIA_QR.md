# Asistencia por QR y registro del docente

El QR está **oculto por defecto**. La grilla y la marcación manual siguen disponibles.
Se conservan los componentes, endpoints y datos para habilitarlo más adelante con
`VITE_ASISTENCIA_QR=true` (en el entorno de Compose o el `.env` del frontend local).
Después de cambiar la variable, reconstruir/recrear el frontend. Mientras esté oculto,
los enlaces de marcación del estudiante redirigen a su registro de asistencia.

## Actualizar el proyecto

```powershell
docker compose up -d --build
```

La preparación compartida aplica `007_asistencia_qr` en bases nuevas y existentes, conservando
asistencia anterior. No borrar volúmenes. La migración agrega sesiones QR y el origen de las
marcaciones (`MANUAL` o `QR`). Las tres cuentas sintéticas `demo.estudiante1@ucn.cl` a
`demo.estudiante3@ucn.cl` reciben un RUT de ejemplo solo si no tenían uno registrado.

## Docente

1. Ingresar con `docente@ucn.cl` / contraseña inicial `123456` para los mismos siete cursos
   de Enzo. Para una nómina de tres estudiantes, usar `docente.iti@ucn.cl` y la sección 97.
2. Abrir **Asistencia** y registrar una clase con fecha de hoy o seleccionar una ya existente.
3. En **Asistencia con QR**, elegir una duración (5, 10, 15 o 30 minutos), revisar la dirección
   del portal y pulsar **Generar QR**. Solo se habilita para clases de hoy en cursos y períodos activos.
4. Proyectar el QR o compartir el enlace. **Renovar QR** invalida el anterior y conserva las asistencias.
5. Revisar la grilla: filas por estudiante, columnas por clase realizada. Verde: asistió;
   rojo: faltó; amarillo: justificado. Gris indica que no hay registro. Los atrasos históricos
   se muestran como asistencia, conservando el dato original hasta una corrección manual.
   Los justificados también suman asistencia para el porcentaje y conservan su cuadro amarillo.
6. Pulsar un cuadro para editar el estado y la observación. Pulsarlo otra vez cierra la edición.
   **Guardar asistencia** registra el cambio con control de versión y auditoría. **Recargar registro**
   permite recuperar la versión actual si otro usuario o una marcación QR cambió el dato.
7. **Cerrar sesión QR** impide nuevas marcaciones. Opcionalmente, marcar la casilla para
   registrar como ausentes a los inscritos sin registro. No se reemplazan presentes ni justificaciones.

La grilla consulta los cambios cada 10 segundos mientras la ventana está visible; también
permite actualizar manualmente. Conserva columnas de estudiante y porcentaje al desplazarse
horizontalmente y limita el alto para nóminas o semestres extensos. Las clases futuras no se
convierten en ausencias. El vencimiento del QR por sí solo tampoco marca ausencias.

## Estudiante

1. Escanear con la cámara del celular y abrir el enlace.
2. Iniciar sesión con la cuenta de estudiante. Al ingresar, se regresa al mismo QR.
3. Confirmar el RUT propio y pulsar **Marcar mi asistencia**.
4. Consultar el resultado y el registro personal de asistencia.

El RUT debe coincidir con el perfil; se ignoran puntos, guion, espacios y diferencias entre
`k` y `K`. Esta confirmación compara con el registro existente, no verifica identidad contra
un padrón externo. No basta conocer un RUT: se requiere la cuenta autenticada del mismo estudiante.
Si el perfil no tiene RUT, el docente puede marcarlo manualmente mientras se actualiza su identidad.

Se valida en el servidor la sesión, su vencimiento, la asignación docente actual, la inscripción
activa del estudiante y que la inscripción no sea posterior a la clase. El QR solo permite marcar
**Asistió**. Un registro anterior se conserva: solamente el docente puede corregirlo.
Consultar o escanear no registra asistencia; la confirmación explícita es obligatoria.

### Cuentas de demostración

| Estudiante | RUT sintético inicial |
|---|---|
| `demo.estudiante1@ucn.cl` | `90000001-4` |
| `demo.estudiante2@ucn.cl` | `90000002-2` |
| `demo.estudiante3@ucn.cl` | `90000003-0` |

Contraseña inicial `123456`; las contraseñas y RUT existentes se conservan. La cuenta de Enzo
conserva el RUT previo de demostración `20.000.000-0`. Los identificadores no acreditan identidad real.

## Uso desde celulares en la red local

`localhost` en un celular representa al celular. Para una demostración en Docker:

1. Conectar computador y celulares a la misma red.
2. Abrir el portal mediante la IP del computador, por ejemplo `http://192.168.1.10:5173`.
3. Usar esa misma dirección en **Dirección del portal para estudiantes** antes de proyectar el QR.

El frontend utiliza `/api` y Vite reenvía las peticiones al gateway dentro de Docker, de modo que
el teléfono no necesita acceder a `localhost:4000`. En ejecución local Vite usa el gateway en
`http://localhost:4000`; puede cambiarse con `API_PROXY_TARGET`. La red y el firewall deben permitir
el acceso al puerto 5173. Para alojamiento fuera de desarrollo se necesita un proxy equivalente
y una dirección accesible mediante HTTPS.

## API

Todas las rutas pasan por el gateway y requieren Bearer JWT.

| Método | Ruta bajo `/api/academico` | Uso |
|---|---|---|
| GET | `/docente/cursos/:curso/asistencia-resumen` | Clases realizadas y registros del curso autorizado |
| GET | `/docente/cursos/:curso/clases/:clase/qr` | Sesión y QR actuales |
| POST | `/docente/cursos/:curso/clases/:clase/qr` | Abrir/renovar con `duracion_minutos`, 1–30, predeterminado 10 |
| DELETE | `/docente/cursos/:curso/clases/:clase/qr` | Cerrar con `marcar_ausentes` opcional, predeterminado false |
| GET | `/asistencia-qr/:token` | Consultar la clase y el registro propio |
| POST | `/asistencia-qr/:token` | Confirmar con `{ "rut": "90000001-4" }` |

El QR usa una firma distinta del JWT de login y no contiene RUT, nombre ni lista de estudiantes.
Las sesiones y su cierre se guardan en PostgreSQL; abrir otro QR, retirarse del curso, revocar
la asignación o cerrar el período se valida nuevamente antes de escribir. El QR vence como
máximo al terminar el día en `America/Santiago`. Las escrituras QR, manuales y cierres bloquean
el curso en el mismo orden para no sobrescribir cambios concurrentes.

## Verificación

`services/academico-service/test/asistencia-qr.test.js` prueba el gateway, permisos, login,
RUT propio, estudiante no inscrito, vencimiento, renovación, cierre, duplicados, corrección
manual, versiones, grilla y reflejo en Estudiante con PostgreSQL en memoria. La suite académica
completa y `npm run build` / `npm test` del frontend deben pasar.

Se comprobó además el recorrido en Chromium con cuentas de demostración y una clase local:
generación de imagen, redirección tras login, rechazo de otro RUT, confirmación desde una vista
móvil, corrección manual y cierre con ausencias. Escanear desde un teléfono físico requiere
la conectividad de red indicada arriba.
