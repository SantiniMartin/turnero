# Turnero — API REST de turnos médicos

Trabajo práctico integrador del Bootcamp 5.0 (módulo Node.js). Es una API REST para gestionar turnos médicos, hecha con **Node.js + TypeScript + Express + MongoDB Atlas (Mongoose)**, con autenticación **Bcrypt + JWT**.

## Tecnologías

- Node.js 22 y TypeScript
- Express 5
- MongoDB Atlas con Mongoose
- bcrypt (hash de contraseñas) y jsonwebtoken (JWT)
- dotenv (variables de entorno)
- helmet y express-rate-limit (seguridad)

## Instalación y ejecución

```bash
# 1. Clonar e instalar dependencias
git clone <url-del-repo>
cd turnero
pnpm install          # o npm install

# 2. Configurar variables de entorno
cp .env.example .env  # y completar los valores (ver tabla abajo)

# 3. Crear el usuario administrador (usa ADMIN_* del .env)
pnpm seed:admin

# 4. Levantar la API en modo desarrollo
pnpm dev

# Producción
pnpm build
pnpm start
```

La API queda escuchando en `http://localhost:3000` (o en el `PORT` que configures).

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (default `3000`) | Puerto HTTP |
| `MONGO_URI` | **Sí** | Cadena de conexión a MongoDB Atlas |
| `JWT_SECRET` | **Sí** | Clave para firmar los JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | No (default `1h`) | Duración del token (`1h`, `30m`, `7d`…) |
| `ADMIN_NOMBRE` | No | Nombre del admin que crea `pnpm seed:admin` |
| `ADMIN_EMAIL` | Para el seed | Email del admin |
| `ADMIN_PASSWORD` | Para el seed | Contraseña del admin (mínimo 8 caracteres) |

El archivo `.env` está en el `.gitignore`. El repositorio solo incluye `.env.example`, con los nombres de las variables y sin valores.

## Estructura del proyecto (por componentes y en capas)

```
src/
├── app.ts                       # Configuración de Express y middlewares globales
├── server.ts                    # Conexión a MongoDB y arranque del servidor
├── config/
│   └── env.ts                   # Lectura y validación de variables de entorno
├── components/
│   ├── auth/
│   │   ├── auth.routes.ts       # Rutas
│   │   ├── auth.controller.ts   # Controlador (try/catch)
│   │   └── auth.service.ts      # Lógica de negocio: bcrypt + JWT
│   ├── users/
│   │   ├── user.model.ts        # Modelo User (Mongoose)
│   │   └── user.repository.ts   # Acceso a datos
│   └── turnos/
│       ├── turno.routes.ts      # Rutas
│       ├── turno.controller.ts  # Controlador (try/catch)
│       ├── turno.service.ts     # Lógica y validaciones de negocio
│       ├── turno.repository.ts  # Acceso a datos
│       └── turno.model.ts       # Modelo Turno (Mongoose)
├── middlewares/
│   ├── auth.middleware.ts       # Verifica el JWT
│   ├── role.middleware.ts       # Restringe por rol (admin)
│   ├── logger.middleware.ts     # Loguea método, URL, status y duración
│   ├── not-found.middleware.ts  # 404 para rutas inexistentes
│   └── error.middleware.ts      # JSON mal formado y errores no controlados
├── utils/
│   ├── http-error.ts            # Error con código HTTP
│   ├── handle-error.ts          # Traduce errores a respuestas (usado en cada catch)
│   └── validate-object-id.ts
└── scripts/
    └── seed-admin.ts            # Crea el usuario admin
```

Una petición recorre **ruta → controlador → servicio → repositorio → modelo**.

## Modelos

**User**

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | String | obligatorio |
| `email` | String | obligatorio, único |
| `password` | String | hash bcrypt; nunca se devuelve en las respuestas |
| `role` | `user` \| `admin` | default `user` |

**Turno**

| Campo | Tipo | Notas |
|---|---|---|
| `paciente` | String | obligatorio, de 2 a 100 caracteres |
| `especialidad` | enum | `clinica`, `cardiologia`, `dermatologia`, `pediatria`, `traumatologia`, `ginecologia`, `oftalmologia` |
| `fecha` | Date | ISO 8601, por ejemplo `2027-03-02T10:00:00-03:00` |
| `estado` | enum | `pendiente` (default), `confirmado`, `cancelado`, `atendido` |
| `observaciones` | String | opcional, hasta 500 caracteres |
| `usuario` | ObjectId → User | usuario que creó el turno (se asigna desde el token) |

## Validaciones de negocio (capa de servicio)

1. **Sin turnos en el pasado:** la fecha tiene que ser futura.
2. **Horario de atención:** lunes a viernes de 8 a 20 h (hora de Argentina), en bloques de 30 minutos (por ejemplo 10:00 o 10:30).
3. **Sin superposición:** no puede haber dos turnos activos (no cancelados) de la misma especialidad en el mismo horario.
4. **Turnos cerrados:** un turno `cancelado` o `atendido` ya no se puede modificar.
5. **Estado inicial:** un turno nuevo siempre nace `pendiente`. Solo un admin puede pasarlo a `confirmado` o `atendido`.
6. Especialidad y estado tienen que ser valores válidos, y el paciente es obligatorio.

## Autenticación

- `POST /api/auth/register` guarda la contraseña hasheada con **bcrypt** (10 rondas). El rol siempre es `user`: no se puede registrar un admin desde la API.
- `POST /api/auth/login` devuelve un **JWT** firmado con `JWT_SECRET` (HS256). El payload solo contiene `{ id, role }`, **sin datos sensibles**.
- Las rutas protegidas esperan el header `Authorization: Bearer <token>`.
- Login y registro tienen rate limit: 20 intentos cada 15 minutos.

## Endpoints

Base URL: `http://localhost:3000/api`

### Auth

| Método | Ruta | Auth | Descripción | Respuestas |
|---|---|---|---|---|
| POST | `/auth/register` | — | Registra un usuario | 201, 400 |
| POST | `/auth/login` | — | Devuelve `{ token, user }` | 200, 400, 401 |
| GET | `/auth/me` | JWT | Datos del usuario logueado | 200, 401 |

```json
// POST /api/auth/register
{ "nombre": "Juan Pérez", "email": "juan@mail.com", "password": "secreta123" }

// POST /api/auth/login
{ "email": "juan@mail.com", "password": "secreta123" }
```

### Turnos

Todas las rutas de turnos requieren JWT. Un usuario común solo ve y modifica **sus** turnos; el admin ve y modifica todos.

| Método | Ruta | Auth | Descripción | Respuestas |
|---|---|---|---|---|
| GET | `/turnos` | JWT | Lista los turnos (admite filtros) | 200, 400, 401 |
| GET | `/turnos/:id` | JWT | Obtiene un turno | 200, 400, 401, 404 |
| POST | `/turnos` | JWT | Crea un turno | 201, 400, 401 |
| PUT | `/turnos/:id` | JWT | Actualiza un turno (uno o más campos) | 200, 400, 401, 403, 404 |
| DELETE | `/turnos/:id` | JWT + **admin** | Elimina un turno | 200, 400, 401, 403, 404 |

**Filtros (`req.query`)** para `GET /turnos`, combinables entre sí:

| Parámetro | Ejemplo |
|---|---|
| `especialidad` | `?especialidad=cardiologia` |
| `estado` | `?estado=pendiente` |
| `paciente` | `?paciente=perez` (búsqueda parcial, sin distinguir mayúsculas) |
| `desde` / `hasta` | `?desde=2027-01-01&hasta=2027-01-31` |

```json
// POST /api/turnos
{
  "paciente": "Juan Pérez",
  "especialidad": "cardiologia",
  "fecha": "2027-03-02T10:00:00-03:00",
  "observaciones": "Control anual"
}

// PUT /api/turnos/:id  (se pueden enviar solo los campos a modificar)
{ "fecha": "2027-03-02T11:30:00-03:00", "estado": "cancelado" }
```

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado de la API |

## Códigos de estado

| Código | Cuándo |
|---|---|
| 200 | Lectura, actualización, eliminación o login exitosos |
| 201 | Usuario o turno creado |
| 400 | Datos inválidos, JSON mal formado, id con formato inválido o regla de negocio incumplida |
| 401 | Falta el token, el token es inválido o expiró, o las credenciales son incorrectas |
| 403 | Usuario autenticado sin permisos (por ejemplo, un usuario común intenta eliminar) |
| 404 | El turno no existe (o pertenece a otro usuario) o la ruta no existe |
| 500 | Error inesperado del servidor |

Todos los controladores usan `try/catch` y delegan en `handleError`, que convierte cada error en el código correspondiente (los errores no previstos devuelven 500).

## Extras implementados

- **Filtros con `req.query`:** especialidad, estado, paciente y rango de fechas.
- **Roles:** solo un `admin` puede eliminar turnos (y confirmarlos o marcarlos como atendidos).
- **Relación entre modelos:** cada turno pertenece al usuario que lo creó, y cada usuario ve solo los suyos.
- **Middleware de logging:** muestra en consola la fecha, el método, la URL, el status y la duración de cada petición.

## Pruebas con Thunder Client

La carpeta [`thunder-client/`](thunder-client/) tiene la colección exportada y un environment:

- `thunder-collection_Turnero API.json`: 38 requests, con los casos exitosos y los de error (400, 401, 403, 404). Cada request tiene un test que verifica el código de estado esperado.
- `thunder-environment_Turnero local.json`: variables `adminEmail`, `adminPassword`, `userEmail`, `token`, `adminToken` y `turnoId`.

Las requests apuntan a `http://localhost:3000`. Si usás otro `PORT`, cambiá la URL en la colección.

Cómo usarla:

1. En Thunder Client, **Collections → Import** y elegí el archivo de la colección. Después, **Env → Import** y elegí el environment.
2. Activá el environment **Turnero local** (Set Active) y completá `adminPassword` (y `adminEmail` si usaste otro en el seed).
3. Corré `pnpm seed:admin` y `pnpm dev`.
4. Ejecutá la colección completa (**Run All**) en orden. Las requests se encadenan:
   - el registro usa un email aleatorio y lo guarda en `userEmail`;
   - el login guarda `token` y `adminToken`;
   - crear un turno guarda `turnoId`.

   El último paso elimina el turno creado, así que se puede volver a correr.
