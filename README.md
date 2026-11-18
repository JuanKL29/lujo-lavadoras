# Lujo Lavadoras

Landing page + panel de administración para alquilar lavadoras. Proyecto universitario, ligero y sin librerías de UI.

**Repositorio:** <https://github.com/JuanKL29/lujo-lavadoras> (público)

```bash
git clone https://github.com/JuanKL29/lujo-lavadoras.git
cd lujo-lavadoras
```

La página pública es directa: hero con la propuesta de valor, botón de WhatsApp para agendar el alquiler, servicios, comentarios de clientes con calificación por estrellas, información de la empresa y contacto. No muestra catálogo ni formulario de alquiler: toda la conversación de alquiler se hace por WhatsApp. El panel de administración sigue disponible para gestionar lavadoras, alquileres, órdenes, clientes, servicios y los comentarios que se publican.

- **Frontend:** Angular 22 (standalone, signals, lazy loading).
- **Backend:** Node.js + Express 5 + MySQL (`mysql2`).
- **Base de datos:** `lavadoras` (XAMPP). Las tablas originales se usan tal cual están; la sección de comentarios crea una tabla nueva (`comentario`) sin modificar las existentes.

---

## Requisitos

- Node.js 20 o superior.
- XAMPP con MySQL/MariaDB.
- Base de datos `lavadoras` creada con sus tablas originales.

> El arranque de MySQL, Apache y el backend es automático al iniciar sesión.
> Consulta [`docs/ARRANQUE-AUTOMATICO.md`](docs/ARRANQUE-AUTOMATICO.md) para los
> accesos directos, el guardián y la solución de problemas.

Credenciales de MySQL usadas por defecto (archivo `backend/.env`, que se crea a
partir de `backend/.env.example`):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=lavadoras
```

> El archivo `backend/.env` no está en el repositorio porque guarda credenciales.
> Cópialo de `backend/.env.example` y ajusta los valores de tu equipo.

---

## Instalación

```bash
# 1. Backend
cd backend
npm install

# 2. Frontend
cd ../frontend
npm install
```

### Base de datos

Crea la base `lavadoras` y sus tablas ejecutando los scripts de `database/` en
este orden:

```bash
mysql -u root -p < database/01_esquema.sql
mysql -u root -p < database/02_datos.sql
```

También se pueden importar desde phpMyAdmin o MySQL Workbench. El detalle está
en [`database/README.md`](database/README.md).

### Datos de ejemplo (opcional)

Crea la tabla de comentarios y carga el usuario administrador, 6 lavadoras, 4 servicios y 3 comentarios de ejemplo si aún no existen:

```bash
cd backend
npm run seed
```

Si ya tienes datos y solo necesitas la tabla nueva de comentarios:

```bash
npm run setup
```

Credenciales del panel:

```
Correo:   admin@lujolavadoras.com
Contraseña: admin123
```

> `npm run seed` es seguro de repetir: no duplica registros existentes.

---

## Ejecutar el proyecto

### Opción A — Un solo proceso (recomendado para la entrega)

```bash
cd frontend
npm run build

cd ../backend
npm start
```

Abre `http://127.0.0.1:3000`. El backend sirve la API y el build de Angular desde el mismo puerto.

### Opción B — Desarrollo con recarga

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm start
```

Abre `http://localhost:4200`. El proxy de Angular envía `/api` al backend en el puerto 3000.

### Atajos desde la raíz

```bash
npm run install:all   # instala backend y frontend
npm run setup         # crea la tabla de comentarios si no existe
npm run seed          # carga datos de ejemplo
npm run build         # compila Angular
npm start             # arranca el backend con el build
npm run dev:api       # backend en modo desarrollo
npm run dev:web       # frontend en modo desarrollo
```

---

## Estructura

```
backend/
  src/
    server.js          # API + servido del build de Angular
    db.js              # pool de MySQL, IDs manuales y transacciones
    seed.js            # datos de ejemplo
    routes/            # auth, lavadoras, servicios, alquileres, órdenes, clientes, comentarios, stats
    middleware/auth.js # verificación de JWT y rol admin
frontend/
  src/app/
    pages/home         # landing: hero, servicios, comentarios, acerca de y contacto
    pages/login        # ingreso al panel
    pages/admin        # panel de administración
    components/        # navbar, hero, botón de WhatsApp, footer
    core/              # servicios, guard, interceptor, modelos, whatsapp.ts
  public/img/          # imágenes locales
```

---

## Configurar WhatsApp

El número y el mensaje están centralizados en:

```
frontend/src/app/core/whatsapp.ts
```

```ts
export const WHATSAPP_NUMERO = '573000000000'; // cámbialo por tu número real
export const WHATSAPP_MENSAJE = 'Hola, quiero alquilar una lavadora...';
export const WHATSAPP_DISPLAY = '+57 300 000 0000';
```

- `WHATSAPP_NUMERO`: número con indicativo de país, sin `+`, sin espacios ni guiones.
- `WHATSAPP_MENSAJE`: texto que se escribe automáticamente al abrir el chat.
- `WHATSAPP_DISPLAY`: número tal como se muestra en la página.

Después de cambiarlo, recompila con `npm run build`.

---

## Notas técnicas

- Los IDs se generan con `MAX(id) + 1` dentro de transacciones porque las claves primarias originales no son `AUTO_INCREMENT`. El esquema original no se altera.
- La autenticación usa JWT en `Authorization: Bearer <token>`; la contraseña se verifica con bcrypt (con compatibilidad para texto plano).
- Al crear un alquiler se valida que la lavadora esté disponible y que no se crucen las fechas. Los cambios de estado del alquiler sincronizan el estado de la lavadora.
- El panel permite gestionar lavadoras, alquileres, órdenes, clientes, servicios y comentarios. Desde ahí se puede registrar un alquiler (creando o actualizando el cliente por cédula), crear órdenes de servicio y administrar clientes sin tocar la base de datos.
- Los comentarios de la página pública se guardan en la tabla nueva `comentario` con `visible = 0`. El administrador decide cuáles se publican; la página solo muestra los aprobados y calcula el promedio de estrellas con ellos.
- La página pública no incluye catálogo ni formulario de solicitud: el botón principal y el botón flotante abren WhatsApp con un mensaje de alquiler ya escrito.
- El proyecto no usa frameworks de CSS ni fuentes externas: todo es CSS propio y fuentes del sistema.

---

## API (resumen)

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/health` | Público |
| POST | `/api/auth/login` | Público |
| GET | `/api/auth/me` | Token |
| GET | `/api/lavadoras` | Público |
| GET | `/api/lavadoras/:id` | Público |
| GET | `/api/lavadoras/:id/disponibilidad` | Público |
| POST / PUT / DELETE | `/api/lavadoras` | Admin |
| GET | `/api/servicios` | Público |
| POST / PUT / DELETE | `/api/servicios` | Admin |
| GET | `/api/comentarios` | Público (solo aprobados) |
| POST | `/api/comentarios` | Público (queda pendiente) |
| GET | `/api/comentarios/admin` | Admin |
| PATCH | `/api/comentarios/:id/visible` | Admin |
| DELETE | `/api/comentarios/:id` | Admin |
| POST | `/api/alquileres` | Público |
| GET / PATCH / DELETE | `/api/alquileres` | Admin |
| GET / POST / PATCH / DELETE | `/api/ordenes` | Admin |
| GET / POST / PUT / DELETE | `/api/clientes` | Admin |
| GET | `/api/stats` | Admin |

---

## Demostración de métodos HTTP

Guía paso a paso para probar `GET`, `POST`, `PUT`, `PATCH` y `DELETE`, con autenticación, casos negativos y limpieza final:

- `docs/DEMO-HTTP.md` — guía completa y guion para la presentación.
- `docs/DEMO-HTTP.postman_collection.json` — colección importable en Postman.
- `docs/demo-http.ps1` — demostración automática desde la terminal de VS Code.

Para ejecutar la versión de terminal:

```powershell
powershell -ExecutionPolicy Bypass -File docs/demo-http.ps1
```

---

## Solución de problemas

- **Error de conexión a MySQL:** verifica que MySQL esté encendido en XAMPP y que `backend/.env` tenga las credenciales correctas.
- **El panel no carga datos:** inicia sesión de nuevo; el token pudo haber expirado.
- **No aparece el sitio al abrir el puerto 3000:** compila el frontend con `npm run build` dentro de `frontend/`.
- **El botón de WhatsApp abre un número equivocado:** cambia `WHATSAPP_NUMERO` y `WHATSAPP_DISPLAY` en `frontend/src/app/core/whatsapp.ts` y vuelve a compilar.
