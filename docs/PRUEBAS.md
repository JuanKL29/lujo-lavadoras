# Guía de pruebas

Documento de apoyo para reproducir las pruebas de Lujo Lavadoras: Postman,
cobertura del backend y carga con k6.

Resultados de referencia (corrida del 16/11/2026):

| Prueba | Resultado |
| --- | --- |
| Postman / Newman | 54 solicitudes, 71 aserciones, 0 fallas, 4,42 s |
| Cobertura backend | 95,55 % líneas, 64,43 % ramas, 100 % funciones |
| k6, 10 usuarios | 1.681 peticiones, 47,3 req/s, p95 3,42 ms, 0 % errores |
| k6, 100 usuarios | 16.639 peticiones, 463,6 req/s, p95 4,09 ms, 0 % errores |

## 1. Requisitos

- Node.js 24 y npm 11.
- MySQL de XAMPP con la base `lavadoras` y los datos de ejemplo.
- Postman (interfaz gráfica) para las capturas.
- k6 2.4.0 o superior. Ya está instalado en `C:\Program Files\k6\k6.exe`.
  Si el comando `k6` no aparece, abre una terminal nueva o instálalo con:

  ```powershell
  winget install --id GrafanaLabs.k6 -e
  ```

## 2. Preparar los servicios

```powershell
Set-Location 'C:\Users\Juandev\Downloads\Lujo Lavadoras'
. .\scripts\xampp-common.ps1
Start-MySqlServer
Start-BackendServer
```

Comprueba que la API responde:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Debe devolver `{"ok":true,"servicio":"lujo-lavadoras-api"}`.

## 3. Pruebas funcionales en Postman

### 3.1 Importar y ejecutar

1. Abre Postman y pulsa **Import**.
2. Selecciona `docs\DEMO-HTTP.postman_collection.json`.
3. Verifica la variable `baseUrl` en la colección: `http://127.0.0.1:3000`.
4. Pulsa los tres puntos de la colección y elige **Run collection**.
5. Deja todas las solicitudes marcadas y pulsa **Run Lujo Lavadoras - Demo HTTP**.

La carpeta está ordenada: primero lectura, luego login, creación, actualización,
borrado, el CRUD de clientes, la moderación de comentarios y las validaciones de
entrada. Los scripts de prueba guardan automáticamente `token`, `idLavadora`,
`idServicio`, `idAlquiler`, `idAlquiler2`, `idOrden`, `idCliente` e
`idComentario`.

### 3.2 Capturas sugeridas

Toma las capturas con `Win + Shift + S` y guárdalas en una carpeta local.
Insértalas en el documento `docs\Pruebas_Lujo_Lavadoras.docx`, sección 2.3
(**Insertar > Imágenes**).

| # | Captura | Qué debe verse |
| --- | --- | --- |
| 1 | Runner completo | 54 solicitudes, 71 aserciones y 0 fallas; todo en verde |
| 2 | Login | `POST /api/auth/login` con 200 y el token en la respuesta |
| 3 | Alquiler | `POST /api/alquileres` con 201, cliente y alquiler creados |
| 4 | Orden | `POST /api/ordenes` con 201 y la orden asociada |
| 5 | Cambio de estado | `PATCH /api/alquileres/1/estado` con 200 y estado `Activo` |
| 6 | Eliminación | `DELETE` con 200 y, al repetir, 404 |

Para la captura 1, espera a que termine la corrida y usa la pestaña
**Summary** del Runner. Para las demás, haz clic en cada solicitud y captura
la zona de **Body** y **Test Results**.

> Si una corrida falla a mitad, pueden quedar clientes de prueba en la base.
> Ejecuta `npm run cobertura --prefix pruebas` (sección 4): el runner limpia
> los clientes `1099887766` y `1099887700` y los comentarios con correo
> `comentario@http.com` antes y después de la corrida.

## 4. Corrida automática y cobertura

El runner `pruebas\coverage-run.mjs` levanta la API en el mismo proceso,
ejecuta la colección con Newman y mide la cobertura con c8. Por eso el
puerto 3000 debe estar libre: detén el backend antes de ejecutarlo.

```powershell
. .\scripts\xampp-common.ps1
Stop-BackendServer

# Solo la primera vez
npm install --prefix pruebas

npm run cobertura --prefix pruebas
```

Salidas:

- `docs\postman-results.json`: reporte JSON de Newman.
- `docs\coverage\index.html`: reporte HTML de cobertura.
- `docs\coverage\coverage-summary.json`: resumen numérico.

Abre el HTML con:

```powershell
Start-Process 'C:\Users\Juandev\Downloads\Lujo Lavadoras\docs\coverage\index.html'
```

## 5. Pruebas de carga con k6

Con el backend en marcha:

```powershell
. .\scripts\xampp-common.ps1
Start-BackendServer

k6 run --summary-export=docs\k6-resumen.json docs\k6\prueba-carga.js
k6 run -e VUS=100 --summary-export=docs\k6-estres.json docs\k6\prueba-carga.js
```

El script hace seis `GET` por iteración (`health`, `lavadoras`, `servicios`,
`disponibilidad`, `alquileres`, `stats`), hace login una sola vez en `setup`
y comparte el token. La duración es de 35 segundos por corrida.

Umbrales:

- Menos del 1 % de peticiones fallidas.
- Percentil 95 por debajo de 500 ms.
- Más del 99 % de comprobaciones correctas.

Al final, k6 imprime `THRESHOLDS` con una marca ✓ por cada umbral y una tabla
con peticiones, latencias y errores. Esa salida sirve como evidencia de la
prueba de carga.

## 6. Archivos relacionados

| Archivo | Contenido |
| --- | --- |
| `docs\DEMO-HTTP.postman_collection.json` | Colección de 54 solicitudes |
| `docs\postman-results.json` | Resultado de Newman |
| `docs\coverage\` | Reporte HTML y resumen de c8 |
| `docs\k6\prueba-carga.js` | Script de carga |
| `docs\k6-resumen.json` | Resultado de 10 usuarios |
| `docs\k6-estres.json` | Resultado de 100 usuarios |
| `docs\Pruebas_Lujo_Lavadoras.docx` | Informe de pruebas |
