# Avance curricular ITI

La ruta `/avance` muestra ocho columnas, estados con texto e iconos, filtros, búsqueda y un
detalle de requisitos. Verde significa aprobación final; amarillo, inscripción activa en un
período vigente sin resultado final; rojo, reprobación sin aprobación posterior. Los estados
se calculan exclusivamente desde el perfil del JWT y su historial, sin aceptar un estudiante
destino en la consulta. La respuesta lleva `Cache-Control: no-store`.

La disponibilidad académica se calcula separadamente del resultado: un ramo reprobado puede
estar disponible para repetir. Una inscripción no satisface requisitos; basta una aprobación
entre varios intentos, y los créditos del ramo se cuentan una vez. El motor compartido
`services/academico-service/src/domain/avance.js` evalúa requisitos directos y por nivel;
la inscripción también consulta ese motor y conserva sus validaciones de cupo, horario y restricciones.
Las relaciones inversas del detalle se derivan de los mismos requisitos.

## Datos y alcance

El plan previo ICI de tres asignaturas y sus estudiantes se conservan. Las migraciones crean
un plan ITI de referencia con 47 espacios (incluida Práctica Profesional) y cuatro opciones
electivas tomadas de la captura. No cambian el plan de ningún estudiante existente ni asignan
notas automáticamente. No se encontró un modelo previo de minors o de espacios electivos.

Catálogo almacena el plan, códigos, créditos, orden, estado de verificación, nivel, dependencias
y opciones de electivos. Académico almacena la elección por estudiante y plan. Cada espacio
electivo cuenta una sola vez; su opción elegida aporta el historial. Una elección inválida
para el espacio se ignora, y una misma opción no puede asignarse a dos espacios del mismo
estudiante y plan. Los SCT mostrados son los del espacio del plan, no créditos inventados
para las opciones específicas.

La identificación de los 46 programas se contrastó con la
[carpeta de programas ITI de UCN](https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/?path=/E.+Mallas+y+programas+de+estudios/Programas/ITI%2B).
El registro estructurado de fuentes y relaciones es [iti-fuentes.json](iti-fuentes.json).
Se priorizaron los programas publicados frente a la captura: por ejemplo, Electrotecnia
figura como `ECIN-00415`, Ingeniería de Software como `ECIN-00610`, Bases de Datos como
`ECIN-00418` e Inglés 2 como `SSED-002184`. Identidad figura con 1 SCT. No se vincularon
esas asignaturas con los códigos locales `BD001`, `SI001` o `RED001` del plan ICI.

Pendientes explícitos:

- Práctica Profesional: no hay programa en esa carpeta. Su código y SCT permanecen nulos.
  Los programas de Bases de Datos e Ingeniería de Software la mencionan como continuación;
  se registran esas relaciones conocidas, pero la lista completa queda por confirmar.
- Los cuatro espacios de electivos tienen programas propios. Electivo 1 pide nivel 3 completo;
  los siguientes piden el electivo anterior. Todos exigen además los requisitos de la opción
  elegida. Faltan los programas específicos de IA Generativa, Power Platform, Seguridad de la
  Información y Hacking Ético, y Excel I; sus códigos, créditos individuales y requisitos
  específicos quedan por confirmar. No se declara disponibilidad mientras falten.
- Los programas de formación general e idiomas sí permiten verificar requisitos:
  Inglés 2 requiere Inglés 1; Diálogo, Fe y Cultura requiere Identidad; Diálogo, Fe y Ciencia
  requiere Diálogo, Fe y Cultura; Ética requiere Diálogo, Fe y Ciencia. Comunicación Efectiva II
  requiere Comunicación Efectiva I. Un apartado de prerrequisitos vacío en el programa
  consultado se distingue de una lista desconocida.
- Interpretación provisional de nivel completo: aprobar todos los espacios hasta el semestre
  indicado, incluidos electivos. Aplica a niveles 3, 5 y 7. Capstone requiere además Práctica.
  Es necesario validar esa interpretación y la versión oficial del plan con la Escuela.

Mientras falten SCT de Práctica, se muestra progreso por cantidad de ramos y se informa que
el porcentaje por créditos está pendiente. No se toma un crédito desconocido como cero.

## Aplicar sobre bases existentes

Conservar los volúmenes. Respaldar las bases antes de migrar. Desde la raíz, con las dependencias
de Catálogo y Académico instaladas y sus `.env` apuntando a las bases locales:

```powershell
node databases/migrate.js catalogo
node databases/migrate.js academico
docker compose restart catalogo-service academico-service
```

Variables `DB_*` ya definidas en la terminal tienen precedencia sobre `.env`; comprobar que
correspondan a cada dominio. El ejecutor registra versiones y omite las ya aplicadas.
Catálogo requiere `001_avance_iti` y `002_plan_iti`; Académico requiere `005_avance_curricular`
además de sus versiones previas. Compose monta todas las migraciones para bases nuevas.

## Probar

Para provisionar una identidad sintética separada:

```powershell
docker compose exec -T auth-service node src/scripts/crearEstudianteItiDemo.js
```

Ingresar a <http://localhost:5173/avance> con `iti.demo@ucn.cl` / `123456`.
El script crea un perfil `DEMO-ITI-2026`, elecciones de electivos, resultados sintéticos de
semestres I–IV, una reprobación de Ingeniería de Software y cinco inscripciones de semestre V.
La página identifica explícitamente el historial ficticio. Requiere un período vigente y
no cambia fechas existentes. Se puede repetir: conserva contraseñas, resultados e identidades.
Las bases tienen transacciones independientes; una ejecución interrumpida puede completarse
repitiéndola. Las nuevas cuentas sin historial ven la malla sin notas asignadas.

```powershell
npm.cmd test --prefix services/academico-service
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm run lint
```

La prueba de navegador requiere Python con Playwright y Chromium instalados:

```powershell
python -m playwright install chromium
python frontend/tests/avance_browser.py
```

Comprueba escritorio y móvil, 47 tarjetas, colores, filtros, búsqueda sin tildes, detalle,
relaciones, navegación por semestre y recuperación tras error del API. Guarda capturas
en el directorio temporal `agil-avance`, configurable con `BANNER_SCREENSHOTS`.
Las pruebas de Node incluyen requisitos combinados, inscrito sin aprobación, repetición,
varios intentos, niveles, electivos sin duplicar créditos, requisitos desconocidos, malla
sin historial y autorización del historial propio, además de las regresiones anteriores.

## Cuenta de Enzo y horario por bloques

Por solicitud expresa, `estudiante@ucn.cl` (Enzo, matrícula `20260001`) está asociado al plan
ITI y configurado con un escenario de prueba: **39 ramos de I–VI aprobados**, **7 ramos de VII
inscritos** y **Capstone pendiente**. Las aprobaciones de ejemplo usan nota 5,5. Se mantiene
la cuenta y contraseña existentes. La cuenta separada `iti.demo@ucn.cl` conserva su escenario.

Docker Compose prepara este escenario automáticamente mediante `datos-demo` al ejecutar
`docker compose up -d --build`. Ver [Datos compartidos](DATOS_COMPARTIDOS.md).
Para ejecutarlo individualmente, el script reproducible es:

```powershell
docker compose exec -T auth-service node src/scripts/configurarEnzoItiDemo.js
```

Antes de ejecutarlo, respaldar Usuarios y Académico. El script valida el nombre y matrícula,
prepara los registros académicos y después asigna el plan en Usuarios. Las bases tienen
transacciones independientes y se puede repetir para completar una ejecución interrumpida.
Conserva resultados existentes, evita duplicados y registra el escenario en la auditoría.
Las tres inscripciones iniciales a los cursos locales `BD001`, `SI001` y `RED001` sin
resultado final pasan a `ANULADA` exclusivamente para Enzo; se conservan sus registros y los
cursos compartidos. Los nuevos cursos usan sección 98 y no modifican inscripciones de otros alumnos.

El horario `/horario` muestra una tabla con días de lunes a sábado y bloques A–F. Las sesiones
de ejemplo corresponden únicamente a los siete ramos inscritos de VII: Ética y Moral Profesional,
Gestión de Proyectos TI, Proyecto Desarrollo Ágil Escalado, Emprendimiento, Ingeniería de Datos
y Big Data, Redes de Computadores II y Excel I. Son **11 sesiones semanales sin cruces**.
La foto proporcionada se utiliza solamente como referencia de diseño: las horas y salas son
ficticias, identificadas como tales en la página. No se inventan docentes ni NRC.

Cada asignatura mantiene su color al filtrar por día. En móvil se puede desplazar la tabla o
elegir un solo día. Las sesiones fuera de A–F conservan sus horas en filas «Especial»; los cruces
se detectan por intervalos reales, incluso entre filas diferentes, sin ocultar sesiones.
El API del horario devuelve nombre, código y el aviso del escenario con `Cache-Control: no-store`.

```powershell
npm.cmd test --prefix frontend
python frontend/tests/horario_browser.py
```

Las pruebas verifican el escenario de Enzo, sus colores, Capstone futuro, bloques, horas
especiales, cruces, filtros, móvil y períodos sin clases. Las capturas se guardan por defecto
en el directorio temporal `agil-enzo-iti`.
