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
- **Infraestructura**: Docker Compose (bases de datos y frontend).

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


## Levantar el proyecto

El orden importa: **bases de datos → microservicios → gateway → frontend**.
El servicio académico depende de *usuarios* y *catálogo*, así que estos deben estar arriba antes.

### 1. Iniciar Docker Desktop

Asegúrate de que el daemon esté corriendo.

### 2. Levantar las bases de datos

Desde la raíz del proyecto:

```powershell
docker compose up -d auth-db usuarios-db catalogo-db academico-db
docker compose ps
```

Cada base ejecuta su `databases/<servicio>/init.sql` la primera vez. Si se necesita
reinicializar, usa `docker compose down -v` y vuelve a levantar.

### 3. Crear el usuario de prueba (solo la primera vez)

El `init.sql` de auth crea las tablas y roles, **pero no el usuario**. Si `usuario` está vacía:

```powershell
node services/auth-service/src/scripts/crearUsuario.js
```

Crea `estudiante@ucn.cl` / `123456` con `id_usuario = 1` (coincide con `persona.id_usuario = 1` de
la base de usuarios).

### 4. Levantar los microservicios (una terminal por servicio)

```powershell
npm run dev --prefix services/auth-service        # :4001
npm run dev --prefix services/usuarios-service    # :4002
npm run dev --prefix services/catalogo-service    # :4003
npm run dev --prefix services/academico-service   # :4004
```

### 5. Levantar el Gateway

```powershell
npm run dev --prefix gateway                       # :4000
```

### 6. Levantar el frontend

Local:
```powershell
npm run dev --prefix frontend                      # :5173
```

O con Docker (desde la raíz):
```powershell
docker compose up -d frontend
```

## Acceso

- Portal: <http://localhost:5173>
- Usuario de prueba: `estudiante@ucn.cl` / `123456`
- Gateway: <http://localhost:4000>


## Troubleshooting

- **Login 401**: no existe el usuario de prueba; ejecuta el paso 3.
- **Pantallas sin datos**: alguna base o microservicio está caído. Revisa `docker compose ps` y las
  terminales de los servicios.
- **Docker no conecta**: Docker Desktop no está iniciado.
- **CORS**: el Gateway ya expone CORS abierto para desarrollo.
