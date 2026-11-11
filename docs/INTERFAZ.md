# Interfaz del portal UCN

El portal usa una identidad visual inspirada en Liquid Glass: paneles translúcidos,
desenfoque de fondo, bordes iluminados y sombras suaves. Se mantienen los tonos azules UCN,
el escudo existente y la fotografía local del campus (`frontend/src/assets/background.webp`).
La fotografía tiene una capa clara y una transición al fondo base para conservar contraste
y evitar un borde brusco al recorrer páginas largas. No hay fuentes ni recursos visuales externos.

## Componentes compartidos

Los desplegables de períodos, filtros y formularios usan `components/Select.tsx` y
`components/select.css`, con la misma línea visual del selector de encuestas: iconos,
opciones separadas, marca de selección y temas claro/oscuro. Los menús se posicionan en
el espacio disponible, fuera de los paneles para evitar recortes; dentro de un diálogo
permanecen en su capa modal. Admiten flechas, Home/End, escritura para buscar, Enter,
Escape y selección múltiple sin exigir Ctrl. Las opciones deshabilitadas se conservan.

El control mantiene un select nativo oculto para `FormData`, `required`, `defaultValue`,
`selectedOptions`, reinicio de formularios y bloqueo heredado de `fieldset`. La fixture
`frontend/tests/fixtures/SelectFixture.tsx` permite comprobar estos contratos en navegador;
no forma parte de las rutas del producto. El selector de encuestas conserva su presentación
específica con títulos, asignaturas y estados.

- `frontend/src/styles/liquid-glass.css`: superficies, navegación, botones, formularios,
  login, inicio y adaptación a móvil.
- `frontend/src/components/PortalIcon.tsx` y `utils/portalIcons.ts`: iconos SVG de navegación.
- Navbar, Sidebar, MobileNav, Button, Card, PageHeader y PeriodoContext comparten la identidad.
- Dashboard muestra datos reales de avance y sesiones del usuario autenticado, además de
  accesos a las funciones existentes.
- Los botones tienen respuesta al pasar el cursor, presionar y enfocar con teclado. Las
  animaciones respetan `prefers-reduced-motion`. Hay superficies de respaldo para navegadores
  sin desenfoque y estilos de contraste forzado en los componentes compartidos.

Las superficies compartidas usan ahora un relleno blanco de 38 % y el fondo tiene una capa
menos opaca, para hacer visible la fotografía a través del vidrio. La barra lateral tiene
un degradado aún más transparente y un control circular para contraerla a 76 px o expandirla.
Al contraer se conservan todos los accesos como iconos con nombre accesible y una etiqueta
al pasar el cursor o enfocar con teclado. El contenido gana el ancho liberado por la barra.
La preferencia se guarda en `localStorage` (`banner_sidebar_collapsed`) y se conserva al
navegar o recargar. Si el almacenamiento no está disponible, el control sigue funcionando.
La animación de ancho sustituye el desplazamiento lateral de los enlaces al pasar el cursor.
En móvil se mantiene la navegación horizontal existente.
La barra permanece fija al lado izquierdo al desplazar la página. Todas las secciones
comparten los mismos márgenes y ancho lateral, sin cambios de posición al navegar.

## Malla completa

La malla usa una grilla de filas compartidas para alinear los ocho semestres. Mantiene los
estados verde, amarillo y rojo, sus textos e indicadores, y todos los datos académicos existentes.
`Ver malla completa` abre una vista ampliada sin la barra lateral. En escritorio de 1440 × 900
se ven los 47 ramos; en pantallas más bajas se conserva el alto mínimo de cada tarjeta y se
permite desplazar el contenido, evitando recortar nombres o notas. En móvil hay desplazamiento
horizontal y vertical según el espacio disponible. Seleccionar una tarjeta permite abrir su
detalle sin perder la vista ampliada; Escape cierra primero el detalle y luego la malla.

`MallaGrid.tsx` es el componente compartido por ambas vistas. El diseño particular permanece
en `pages/avance-curricular.css`. El horario conserva sus bloques y colores por asignatura,
con superficies adaptadas en `pages/horario.css`.

Al pasar el cursor o enfocar un ramo con teclado se resaltan sus requisitos en azul y los
ramos relacionados en violeta, con marcos de 4 px; el ramo explorado usa 5 px y la franja
del estado académico tiene 7 px. No aparece una ficha flotante sobre los otros ramos.
El detalle se abre al hacer clic, tocar o activar con teclado, también en la vista ampliada.

## Comprobaciones

Con Docker levantado:

```powershell
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm test
```

Con Python y Playwright disponibles:

```powershell
python frontend/tests/portal_visual_browser.py
python frontend/tests/avance_browser.py
python frontend/tests/horario_browser.py
python frontend/tests/sidebar_browser.py
python frontend/tests/malla_hover_browser.py
```

La prueba visual cubre login, inicio, páginas del estudiante, malla ampliada, contenido de
tarjetas sin recortar, teclado, pantallas de escritorio y móvil, movimiento reducido y los
portales Docente y Unidad. Usa las cuentas locales de prueba documentadas. Guarda capturas
en el directorio temporal `agil-liquid-glass`, configurable mediante `BANNER_SCREENSHOTS`.

Este cambio visual no requiere migraciones ni cambia usuarios, notas o inscripciones.
Vite utiliza sondeo de archivos para actualizar los estilos dentro de Docker en Windows.

## Modo claro y oscuro

El botón con sol/luna está disponible en el login y en la barra superior de los tres portales.
Guarda la elección como `banner_theme` en `localStorage` y la mantiene al navegar, cerrar sesión
y recargar. Sin preferencia guardada se usa el tema del sistema. La selección se aplica desde
el HTML antes de cargar la aplicación para evitar el destello de tema claro al iniciar en oscuro.
Los cambios de preferencia se sincronizan entre pestañas.

`styles/themes.css` define los tonos oscuros de paneles, textos, formularios, malla y horario.
El modo claro conserva la transparencia y refuerza los textos secundarios del login.
La lógica está en `utils/tema.ts` y el control compartido en `components/ThemeToggle.tsx`.
Para comprobar ambos modos, persistencia, teclado y móvil:

```powershell
python frontend/tests/theme_browser.py
```
