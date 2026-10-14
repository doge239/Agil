# Banner UCN — Frontend

Portal del estudiante (rol **ESTUDIANTE**) para el sistema académico Banner-2 de la UCN.
Consume el **API Gateway** en `http://localhost:4000/api`.

## Tecnologías

- React 19 + TypeScript
- Vite 8
- React Router 7
- Axios
- Tailwind CSS 4
- Context API + hooks

## Requisitos

- Node.js 24+ (o Docker)
- El **API Gateway** corriendo en `http://localhost:4000` (no está incluido en el `docker-compose`).

## Variables de entorno

Copia la plantilla y ajusta si es necesario:

```bash
cp .env.example .env
```

Contenido (`.env` en la raíz de `frontend/`):

```
VITE_API_URL=http://localhost:4000/api
```

> La URL la resuelve el **navegador**, por lo que debe ser accesible desde el host.

## Ejecución

### Opción A — Local con npm

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

### Opción B — Docker (solo frontend)

Desde la raíz del proyecto:

```bash
docker compose up -d frontend
```

El servicio monta el código local y usa hot reload. Disponible en `http://localhost:5173`.

> Recuerda levantar el Gateway por separado en el puerto 4000.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript y genera `dist/` |
| `npm run preview` | Sirve la build de producción |
| `npm run lint` | Análisis estático con Oxlint |

## Estructura

```
src/
├─ api/          Cliente axios + módulos por servicio
├─ components/   UI base (Layout, Navbar, Sidebar, DataTable, Button, …)
├─ context/      AuthContext/AuthProvider y ThemeContext/ThemeProvider
├─ hooks/        useFetch, useAsignaturasMap
├─ pages/        Login, Dashboard, MiPerfil, MisAsignaturas, Horario, Notas, Asistencia, Carreras, MallaCarrera
├─ types/        Tipos de las respuestas del backend
└─ utils/        Formateo y manejo de errores
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión |
| `/` | Panel principal |
| `/perfil` | Mi perfil |
| `/asignaturas` | Mis asignaturas |
| `/horario` | Horario |
| `/notas` | Notas |
| `/asistencia` | Asistencia |
| `/carreras` | Catálogo de carreras |
| `/carreras/:idCarrera` | Malla curricular |

Todas las rutas salvo `/login` están protegidas y requieren sesión.

## Autenticación

1. El login guarda el `token` en `localStorage` y el usuario en `AuthContext`.
2. Axios inyecta `Authorization: Bearer <token>` en cada petición.
3. Ante un `401`, se limpia la sesión y se redirige a `/login`.

## Tema

Soporte de modo claro/oscuro mediante la estrategia `class` de Tailwind, con toggle en la
navbar y preferencia persistida en `localStorage`.
