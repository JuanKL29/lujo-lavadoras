# Demostración de métodos HTTP + página web

Guía para mostrarle a la profesora que la API maneja **GET, POST, PUT, PATCH y DELETE**, con autenticación, validaciones y una página web real que consume los datos.

---

## Antes de empezar (5 minutos)

1. Abre **XAMPP** y enciende **MySQL**.
2. Abre una terminal en la raíz del proyecto:

   ```powershell
   cd "C:\Users\Juandev\Downloads\Lujo Lavadoras"
   ```

3. Si el backend **no** está corriendo, arráncalo:

   ```powershell
   npm start
   ```

   > Si ya está corriendo, **no lo ejecutes otra vez**: el puerto 3000 estaría ocupado. Solo déjalo abierto.

4. Abre la página en el navegador:

   ```
   http://127.0.0.1:3000
   ```

5. Abre **Postman** e importa la colección:

   **File → Import →** selecciona:

   ```
   docs/DEMO-HTTP.postman_collection.json
   ```

6. En Postman, abre la colección **“Lujo Lavadoras - Demo HTTP”** y revisa la pestaña **Variables**. Debe existir:

   | Variable | Valor |
   | --- | --- |
   | `baseUrl` | `http://127.0.0.1:3000` |
   | `token` | vacío (se llena solo con el login) |
   | `idLavadora` | vacío (se llena solo al crear) |
   | `idServicio` | vacío (se llena solo al crear) |
   | `idAlquiler` | vacío (se llena solo al crear) |
   | `idAlquiler2` | vacío (se llena con el alquiler del cliente recurrente) |
   | `idOrden` | vacío (se llena solo al crear) |
   | `idCliente` | vacío (se llena con el CRUD de clientes) |

**Importante:** ejecuta las carpetas en orden **1 → 2 → 3 → 4 → 5 → 6 → 7**. La colección guarda automáticamente el token y los ids creados.

---

## Parte 1 — Mostrar la página web (3 minutos)

Muestra `http://127.0.0.1:3000` y explica:

1. **Hero:** la frase “Alquílala fácil, ahorra dinero y disfruta de la comodidad de tenerla en casa cuando más la necesitas.”
2. **Botón “Agendar alquiler”:** abre WhatsApp con el mensaje de alquiler ya escrito.
3. **Menú:** Inicio, Servicios, Acerca de, Contacto. Al hacer clic, baja a cada sección.
4. **Servicios:** se cargan desde la base de datos con `GET /api/servicios`.
5. **Botón flotante de WhatsApp:** abajo a la derecha, abre el chat.
6. **Panel de administración:** entra en `http://127.0.0.1:3000/login` con:

   ```
   admin@lujolavadoras.com
   admin123
   ```

   Muestra que el panel lista lavadoras, alquileres, órdenes, clientes y servicios.

> Frase para la profesora: “La página no tiene datos escritos a mano: los servicios salen de MySQL a través de la API. Ahora voy a probar cada método HTTP y al final vas a ver el cambio reflejado en la página.”

---

## Parte 2 — Login y token (POST)

En Postman, abre la carpeta **2. POST - Crear** y ejecuta primero:

**`Login - POST /api/auth/login`**

- Método: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Body → raw → JSON:

```json
{
  "correo": "admin@lujolavadoras.com",
  "password": "admin123"
}
```

**Resultado esperado:** `200 OK` y un JSON con `token` y `usuario`.

El script de la pestaña **Tests** guarda el token en `{{token}}`. Todas las rutas administrativas lo usan automáticamente en **Authorization → Bearer Token**.

> Si quieres comprobarlo: abre la pestaña **Variables** de la colección y verás `token` con un valor largo.

**Caso negativo:** ejecuta **`Stats sin token`** (carpeta 1) y muestra `401 Unauthorized`. Luego **`Stats con token`** y muestra `200 OK`.

---

## Parte 3 — GET (leer)

Carpeta **1. GET - Lectura**. Ejecuta una por una:

| Petición | URL | Resultado esperado | Qué demuestra |
| --- | --- | --- | --- |
| Health | `GET /api/health` | `200 OK` | El backend y MySQL están vivos. |
| Listar lavadoras | `GET /api/lavadoras` | `200 OK` | Devuelve el arreglo de lavadoras. |
| Ver lavadora 1 | `GET /api/lavadoras/1` | `200 OK` | Consulta un recurso por id. |
| Lavadora inexistente | `GET /api/lavadoras/9999` | `404 Not Found` | Recurso que no existe. |
| Listar servicios | `GET /api/servicios` | `200 OK` | Son los servicios de la página. |
| Disponibilidad | `GET /api/lavadoras/1/disponibilidad?inicio=2026-12-01&fin=2026-12-05` | `200 OK` | Consulta con query params. |

**Para la profesora:** “GET solo lee, no modifica nada. El 404 es la respuesta correcta cuando el recurso no existe.”

---

## Parte 4 — POST (crear)

Carpeta **2. POST - Crear**. Ya ejecutaste el login. Ahora:

### 4.1 POST sin token → 401

Ejecuta **`Crear lavadora sin token`**.

**Resultado esperado:** `401 Unauthorized`.

> “La ruta está protegida: sin token no se puede crear.”

### 4.2 Crear lavadora → 201

Ejecuta **`Crear lavadora`**.

- Método: `POST`
- URL: `{{baseUrl}}/api/lavadoras`
- Authorization: Bearer `{{token}}`
- Body:

```json
{
  "marca": "Prueba",
  "modelo": "Demo HTTP",
  "referencia": "TEST-HTTP-01",
  "precio_alquiler": 100000,
  "estado": "Disponible"
}
```

**Resultado esperado:** `201 Created`. La respuesta trae `id_lavadora` (normalmente `7`). La colección lo guarda en `{{idLavadora}}`.

### 4.3 Crear servicio → 201

Ejecuta **`Crear servicio`**.

```json
{
  "nombre_servicio": "Servicio de prueba HTTP",
  "descripcion": "Creado para la demostración de métodos HTTP",
  "precio": 15000
}
```

**Resultado esperado:** `201 Created`. La respuesta trae `id_tipo_servicio` (normalmente `5`). Se guarda en `{{idServicio}}`.

> **Momento clave:** recarga la página `http://127.0.0.1:3000` con `Ctrl + F5`. El servicio de prueba aparece como una tarjeta más. Eso demuestra que el POST llegó a la base de datos y la página lo está leyendo con GET.

### 4.4 Crear alquiler → 201

Ejecuta **`Crear alquiler`**.

```json
{
  "cliente": {
    "nombre": "Cliente Prueba HTTP",
    "cedula": "1099887766",
    "telefono": "3001234567",
    "correo": "prueba@http.com",
    "direccion": "Calle 1 # 2-3"
  },
  "idLavadora": 7,
  "fecha_inicio": "2026-12-01",
  "fecha_fin": "2026-12-05"
}
```

> En la colección, `idLavadora` se escribe con la variable `{{idLavadora}}`, así que no tienes que cambiarlo a mano.

**Resultado esperado:** `201 Created`. La respuesta trae `alquiler.id_alquiler` (normalmente `1`) y la colección lo guarda en `{{idAlquiler}}`.

**Qué pasó por dentro:**

1. Se creó el cliente (o se actualizó si la cédula ya existía).
2. Se creó el alquiler en estado `Pendiente`.
3. La lavadora pasó a `Reservada`.

### 4.4.1 Crear orden → 201

El alquiler y la orden son operaciones separadas. Ejecuta **`Crear orden`**.

```json
{
  "idAlquiler": 1,
  "idTipo_servicio": 5,
  "estado": "Pendiente",
  "observaciones": "Orden de prueba HTTP"
}
```

> En la colección se usan `{{idAlquiler}}` y `{{idServicio}}`.

**Resultado esperado:** `201 Created` con `id_orden_servicio`. La colección lo guarda en `{{idOrden}}`.

### 4.5 Alquiler solapado → 409

Ejecuta **`Alquiler solapado`**.

**Resultado esperado:** `409 Conflict` con el mensaje “La lavadora ya está alquilada en esas fechas”.

> “El servidor valida que no se crucen las fechas. No es un error del cliente: es un conflicto con el estado actual.”

---

## Parte 5 — PUT (actualizar completo)

Carpeta **3. PUT - Actualizar completo**.

### 5.1 Actualizar lavadora → 200

Ejecuta **`Actualizar lavadora`**.

- Método: `PUT`
- URL: `{{baseUrl}}/api/lavadoras/{{idLavadora}}`
- Body:

```json
{
  "marca": "Prueba",
  "modelo": "Demo HTTP actualizada",
  "referencia": "TEST-HTTP-01",
  "precio_alquiler": 110000,
  "estado": "Disponible"
}
```

**Resultado esperado:** `200 OK`. El campo `modelo` cambia a `Demo HTTP actualizada`.

> “PUT reemplaza el recurso completo: hay que enviar todos los campos, no solo el que cambia.”

### 5.2 Actualizar servicio → 200

Ejecuta **`Actualizar servicio`**.

```json
{
  "nombre_servicio": "Servicio de prueba HTTP (actualizado)",
  "descripcion": "Servicio actualizado con PUT para la demostración",
  "precio": 18000
}
```

**Resultado esperado:** `200 OK`. Recarga la página y muestra que la tarjeta del servicio cambió de nombre y precio.

---

## Parte 6 — PATCH (actualizar parcial)

Carpeta **4. PATCH - Actualizar parcial**.

### 6.1 Activar alquiler → 200

Ejecuta **`Activar alquiler`**.

- Método: `PATCH`
- URL: `{{baseUrl}}/api/alquileres/{{idAlquiler}}/estado`
- Body:

```json
{
  "estado": "Activo"
}
```

**Resultado esperado:** `200 OK`. El alquiler queda `Activo` y la lavadora pasa a `Alquilada`.

Compruébalo con `GET /api/lavadoras/{{idLavadora}}`: el estado debe ser `Alquilada`.

> “PATCH cambia solo una parte del recurso. No hace falta enviar todos los campos.”

### 6.2 Orden en proceso → 200

Ejecuta **`Orden en proceso`**.

```json
{
  "estado": "En proceso",
  "observaciones": "Orden actualizada con PATCH"
}
```

**Resultado esperado:** `200 OK`.

### 6.3 Estado inválido → 400

Ejecuta **`Estado inválido`**.

```json
{
  "estado": "Volando"
}
```

**Resultado esperado:** `400 Bad Request` con la lista de estados permitidos: `Pendiente, Activo, Finalizado, Cancelado`.

> “El servidor valida los datos de entrada. Un estado que no existe devuelve 400, no 500.”

---

## Parte 7 — DELETE (eliminar)

Carpeta **5. DELETE - Eliminar**. **Respeta este orden**, porque hay claves foráneas:

### 7.1 Eliminar orden → 200

Ejecuta **`Eliminar orden`**.

**Resultado esperado:** `200 OK` con `{ "ok": true }`.

### 7.2 Eliminar la misma orden otra vez → 404

Ejecuta **`Eliminar orden otra vez`**.

**Resultado esperado:** `404 Not Found`.

### 7.3 Intentar eliminar la lavadora con alquiler → 409

Ejecuta **`Eliminar lavadora con alquiler`**.

**Resultado esperado:** `409 Conflict` con “No se puede eliminar: el registro está siendo usado por otro”.

> “La base de datos protege la integridad referencial: no deja borrar una lavadora que tiene un alquiler asociado.”

### 7.4 Eliminar alquiler → 200

Ejecuta **`Eliminar alquiler`**.

**Resultado esperado:** `200 OK`. La lavadora vuelve a `Disponible`.

Compruébalo con `GET /api/lavadoras/{{idLavadora}}`.

### 7.5 Eliminar servicio → 200

Ejecuta **`Eliminar servicio`**.

**Resultado esperado:** `200 OK`. Recarga la página y muestra que la tarjeta del servicio de prueba desapareció.

### 7.6 Eliminar lavadora → 200

Ejecuta **`Eliminar lavadora`**.

**Resultado esperado:** `200 OK`.

### 7.7 Eliminar la misma lavadora otra vez → 404

Ejecuta **`Eliminar lavadora otra vez`**.

**Resultado esperado:** `404 Not Found`.

---

## Parte 8 — Limpieza final (cliente)

El cliente de prueba **no se puede borrar por HTTP** porque la API solo tiene `GET /api/clientes`. Se borra por SQL.

Abre la terminal y ejecuta:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "USE lavadoras; DELETE FROM cliente WHERE cedula = 1099887766;"
```

Verifica que todo quedó limpio:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "USE lavadoras; SELECT COUNT(*) AS alquileres FROM alquiler; SELECT COUNT(*) AS clientes FROM cliente; SELECT COUNT(*) AS ordenes FROM orden_de_servicio; SELECT COUNT(*) AS lavadoras FROM lavadora; SELECT COUNT(*) AS servicios FROM tipo_de_servicio;"
```

Al final debe quedar:

- `alquileres = 0`
- `clientes = 0`
- `ordenes = 0`
- `lavadoras = 5` (las originales)
- `servicios = 4` (los originales)

> Si usaste la colección y todo salió bien, los conteos vuelven solos. Solo el cliente necesita el DELETE por SQL.

---

## Resumen para la profesora

| Método | Endpoint | Para qué | Códigos vistos |
| --- | --- | --- | --- |
| `GET` | `/api/lavadoras`, `/api/lavadoras/:id`, `/api/servicios` | Leer datos | `200`, `404` |
| `POST` | `/api/auth/login` | Autenticarse y obtener token | `200`, `401` |
| `POST` | `/api/lavadoras`, `/api/servicios` | Crear recursos | `201`, `400`, `401` |
| `POST` | `/api/alquileres` | Crear cliente + alquiler + orden | `201`, `409` |
| `PUT` | `/api/lavadoras/:id`, `/api/servicios/:id` | Reemplazar un recurso completo | `200`, `404` |
| `PATCH` | `/api/alquileres/:id/estado`, `/api/ordenes/:id/estado` | Cambiar solo el estado | `200`, `400`, `404` |
| `DELETE` | `/api/ordenes/:id`, `/api/alquileres/:id`, `/api/lavadoras/:id`, `/api/servicios/:id` | Eliminar recursos | `200`, `404`, `409` |

**Idea central:** `GET` lee, `POST` crea, `PUT` reemplaza, `PATCH` modifica parcialmente y `DELETE` elimina. Los códigos `400`, `401`, `404` y `409` demuestran que la API valida y protege los datos.

---

## Si algo falla

| Problema | Solución |
| --- | --- |
| Postman dice `401` en rutas admin | Ejecuta primero el **Login** y revisa que `{{token}}` tenga valor. |
| `{{idLavadora}}` está vacío | Ejecuta **Crear lavadora** antes de las rutas que lo usan. |
| `{{idAlquiler}}` está vacío | Ejecuta **Crear alquiler** antes de PATCH/DELETE. |
| Error `ECONNREFUSED` | El backend no está corriendo: `npm start` en la raíz. |
| La página no muestra el servicio nuevo | Recarga con `Ctrl + F5`. |
| El puerto 3000 está ocupado | Ya hay un servidor corriendo; no ejecutes `npm start` otra vez. |
| Quedaron datos de prueba | Ejecuta la limpieza SQL de la Parte 8 y revisa los conteos. |

---

## Atajo opcional: ejecutar toda la colección

En Postman puedes usar **Run collection** y seleccionar las carpetas en orden. Sirve para verificar rápido que todo pasa, pero para la demostración es mejor ejecutar petición por petición y explicar cada método.

---

## Antes de la presentación

- Cambia el número de WhatsApp real en `frontend/src/app/core/whatsapp.ts` y recompila con `npm run build`.
- Verifica que MySQL esté encendido y que `http://127.0.0.1:3000/api/health` responda `{"ok":true}`.
- Ten abiertas tres pestañas: la página, el panel de administración y Postman.
