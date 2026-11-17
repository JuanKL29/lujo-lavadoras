# Arranque automático de XAMPP y el backend

Este proyecto incluye un guardián que arranca y vigila **MySQL, Apache y el backend Node**
sin necesidad de abrir el panel de XAMPP ni una terminal.

## Qué hace

- Al iniciar sesión en Windows, se ejecuta solo (sin ventanas) el guardián.
- Arranca MySQL, Apache y el backend si están detenidos.
- Cada 15 segundos comprueba que los tres respondan; si alguno se cae, lo vuelve a levantar.
- Al cerrar sesión o apagar el equipo, detiene MySQL y Apache de forma ordenada para evitar
  que las tablas se corrompan.
- MySQL quedó configurado con `default_storage_engine=InnoDB` y sus tablas de sistema
  convertidas a InnoDB, que resiste cortes de energía.

## Accesos directos del escritorio

| Acceso | Qué hace |
| --- | --- |
| **Iniciar Lujo Lavadoras** | Arranca MySQL, Apache y el backend, y reactiva el guardián. |
| **Detener Lujo Lavadoras** | Los detiene de forma ordenada y pausa el guardián. |
| **Estado Lujo Lavadoras** | Muestra puertos, PID y si cada servicio responde. |

## Direcciones

- App: <http://127.0.0.1:3000/>
- Panel: <http://127.0.0.1:3000/admin>
- Salud de la API: <http://127.0.0.1:3000/api/health>
- Apache (XAMPP): <http://127.0.0.1/>

Credenciales del panel: `admin@lujolavadoras.com` / `admin123`.

## Archivos y registros

- Guardián: `scripts/xampp-guard.ps1`
- Arranque manual: `scripts/xampp-start.ps1`
- Detención manual: `scripts/xampp-stop.ps1`
- Estado: `scripts/xampp-status.ps1`
- Instalador del autostart: `scripts/install-autostart.ps1`
- Lanzador de inicio de sesión: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Lujo Lavadoras - XAMPP.vbs`
- Log general: `logs/xampp-guard.log`
- PID del guardián: `logs/guard.pid`
- Pausa del guardián: `logs/guard.pause`
- Log de MySQL: `C:\xampp\mysql\data\mysql_error.log`
- Log de Apache: `C:\xampp\apache\logs\error.log`

## Si algo no responde

1. Ejecuta el acceso **Estado Lujo Lavadoras**.
2. Revisa `logs/xampp-guard.log`.
3. Usa **Detener Lujo Lavadoras** y luego **Iniciar Lujo Lavadoras**.
4. Para comprobar las tablas:

```powershell
C:\xampp\mysql\bin\mysqlcheck.exe -u root -h 127.0.0.1 --check --databases mysql lavadoras
```

## Nota sobre permisos

El guardián se ejecuta al iniciar sesión porque la cuenta no tiene permisos de administrador
para instalar servicios de Windows. No es necesario abrir XAMPP manualmente.
