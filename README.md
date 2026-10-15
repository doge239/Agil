# Banner-2 — Sistema Académico UCN

Backend de microservicios y frontend del portal del estudiante (rol **ESTUDIANTE**) para el
sistema académico Banner-2 de la Universidad Católica del Norte.

## Arquitectura

```
Frontend (React) → API Gateway (:4000) → 4 microservicios → 4 PostgreSQL
```

| Componente | Puerto | Descripción |
|---|---|---|
| Frontend | 5173 | Portal del estudiante (React + Vite) |
| API Gateway | 4000 | Enruta `/api/*` a los microservicios |
| auth-service | 4001 | Login, JWT y roles |
| usuarios-service | 4002 | Perfil (persona / estudiante) |
| catalogo-service | 4003 | Carreras, asignaturas y mallas |
| academico-service | 4004 | Inscripciones, horario, notas y asistencia |

Bases de datos (PostgreSQL 17, en Docker):

| Base | Puerto host |
|---|---|
| auth_db | 5433 |
| usuarios_db | 5434 |
| catalogo_db | 5435 |
| academico_db | 5436 |

## Stack

- **Backend**: Node.js + Express 5, PostgreSQL (`pg`), JWT, bcrypt.
- **Frontend**: React 19 + TypeScript, Vite 8, React Router 7, Axios, Tailwind CSS 4.
- **Infraestructura**: Docker Compose (bases de datos, microservicios, gateway y frontend).

## Requisitos

- Node.js 24+
- Docker Desktop (para las bases de datos)

## Estructura

```
Agil/
├─ gateway/                 API Gateway
├─ services/
│  ├─ auth-service/
│  ├─ usuarios-service/
│  ├─ catalogo-service/
│  └─ academico-service/
├─ databases/               init.sql por base de datos
├─ frontend/                Portal del estudiante
└─ docker-compose.yml
```


ok## Levantar el proyecto

Todo el sistema (bases de datos, microservicios, gateway y frontend) se levanta con Docker Compose.

### 1. Iniciar Docker Desktop

Asegúrate de que el daemon esté corriendo.

### 2. Levantar todo

Desde la raíz del proyecto:

```powershell
docker compose up -d --build
docker compose ps
```

El orden de arranque está resuelto con `depends_on` y healthchecks: primero las bases de datos
(cada una ejecuta su `databases/<servicio>/init.sql` la primera vez), luego los microservicios, el
gateway y el frontend. El servicio `auth-seed` crea el usuario de prueba automáticamente al
arrancar (y es idempotente: si ya existe, no falla).

### 3. Detener / reiniciar

```powershell
docker compose down        # detener todo (conserva los datos)
docker compose down -v     # detener y borrar los datos (reinicializa las bases)
```

Si se necesita reinicializar las bases, usa `docker compose down -v` y vuelve a levantar.

### 4. Desarrollo (hot reload)

Los microservicios, el gateway y el frontend corren en modo desarrollo dentro de los contenedores
con el código montado como volumen, por lo que los cambios se recargan automáticamente
(nodemon / Vite).

### Ejecución manual (código en Node local)

Si prefieres correr los servicios con Node local en vez de contenedores, levanta primero solo las
bases:

```powershell
docker compose up -d auth-db usuarios-db catalogo-db academico-db
```

Y luego, en terminales separadas:

```powershell
npm run dev --prefix services/auth-service        # :4001
npm run dev --prefix services/usuarios-service    # :4002
npm run dev --prefix services/catalogo-service    # :4003
npm run dev --prefix services/academico-service   # :4004
npm run dev --prefix gateway                      # :4000
npm run dev --prefix frontend                     # :5173
```

El usuario de prueba se crea (idempotente) ejecutando, desde `services/auth-service`:

```powershell
node src/scripts/crearUsuario.js
```

Crea `estudiante@ucn.cl` / `123456` con `id_usuario = 1` (coincide con `persona.id_usuario = 1` de
la base de usuarios).

## Acceso

- Portal: <http://localhost:5173>
- Usuario de prueba: `estudiante@ucn.cl` / `123456`
- Gateway: <http://localhost:4000>


## Troubleshooting

- **Login 401**: no existe el usuario de prueba. Revisa los logs del seed con
  `docker compose logs auth-seed`, o créalo manualmente:
  `docker compose run --rm auth-seed`.
- **Pantallas sin datos**: alguna base o microservicio está caído. Revisa `docker compose ps` y los
  logs con `docker compose logs <servicio>`.
- **Docker no conecta**: Docker Desktop no está iniciado.
- **CORS**: el Gateway ya expone CORS abierto para desarrollo.
