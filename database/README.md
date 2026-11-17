# Base de datos

Scripts para crear la base de datos `lavadoras` desde cero.

| Archivo | Contenido |
| --- | --- |
| `01_esquema.sql` | Crea la base de datos y las 7 tablas con sus claves foráneas. |
| `02_datos.sql` | Inserta el usuario administrador, clientes, lavadoras, servicios, alquileres, órdenes y comentarios de ejemplo. |

## Cómo ejecutarlos

### Opción A: MySQL Workbench

1. Abre MySQL Workbench y conéctate a tu servidor local.
2. `File` → `Open SQL Script` → selecciona `01_esquema.sql`.
3. Ejecuta todo el script con el rayo (o `Ctrl + Shift + Enter`).
4. Repite con `02_datos.sql`.

### Opción B: phpMyAdmin (XAMPP)

1. Abre `http://localhost/phpmyadmin`.
2. Pestaña `Importar` → selecciona `01_esquema.sql` → `Continuar`.
3. Repite con `02_datos.sql`.

### Opción C: terminal

```bash
mysql -u root -p < database/01_esquema.sql
mysql -u root -p < database/02_datos.sql
```

## Orden importante

`01_esquema.sql` **debe** ejecutarse antes que `02_datos.sql`, porque los datos
dependen de las tablas y de las claves foráneas.

## Credenciales del panel

```
Correo:     admin@lujolavadoras.com
Contraseña: admin123
```

La contraseña se guarda cifrada con bcrypt; el hash ya viene en `02_datos.sql`.

## Notas

- Las tablas no usan `AUTO_INCREMENT`: el backend calcula el id con `MAX(id) + 1`
  dentro de una transacción. Por eso los `INSERT` llevan el id explícito.
- Los scripts son idempotentes en las tablas (`CREATE TABLE IF NOT EXISTS`),
  pero los `INSERT` fallan si los registros ya existen. Para empezar de cero,
  elimina la base y vuelve a ejecutar `01_esquema.sql`.
