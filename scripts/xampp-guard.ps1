[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'xampp-common.ps1')

$mutex = New-Object System.Threading.Mutex($false, 'Local\LujoLavadorasXamppGuard')
if (-not $mutex.WaitOne(0)) {
  Write-GuardLog 'Ya hay un guardian corriendo; este proceso termina.'
  exit 0
}

Set-Content -Path $PidFile -Value $PID -Encoding ASCII
if (Test-Path $PauseFile) {
  Remove-Item $PauseFile -Force -ErrorAction SilentlyContinue
  Write-GuardLog 'Pausa anterior eliminada al iniciar el guardian.'
}
Write-GuardLog "Guardian iniciado (PID $PID)."

# Apagado ordenado cuando Windows cierra sesion o apaga el equipo.
# Esto es lo que evita que MySQL quede a medias y se corrompa.
try {
  Add-Type -AssemblyName System.Windows.Forms
  [Microsoft.Win32.SystemEvents]::add_SessionEnding({
    param($sender, $e)
    try {
      $line = '{0} [WARN] Windows esta cerrando sesion: apagando MySQL y Apache de forma ordenada.' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
      Add-Content -Path 'C:\Users\Juandev\Downloads\Lujo Lavadoras\logs\xampp-guard.log' -Value $line -Encoding UTF8
      & 'C:\xampp\mysql\bin\mysqladmin.exe' -u root -h 127.0.0.1 --connect-timeout=3 shutdown 2>&1 | Out-Null
      & 'C:\xampp\apache\bin\httpd.exe' -d 'C:\xampp\apache' -k shutdown 2>&1 | Out-Null
      for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        if (-not (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue)) { break }
      }
    } catch {
      # No hay mucho mas que hacer durante el apagado.
    }
  })
} catch {
  Write-GuardLog "No se pudo registrar el evento de apagado: $($_.Exception.Message)" 'WARN'
}

$mysqlFailures = 0
$apacheFailures = 0
$backendFailures = 0

try {
  while ($true) {
    if (Test-Path $PauseFile) {
      Start-Sleep -Seconds 5
      continue
    }

    if (-not (Test-TcpPort 3306)) {
      Start-MySqlServer | Out-Null
      $mysqlFailures = 0
    } elseif (-not (Test-MySqlPing)) {
      $mysqlFailures++
      Write-GuardLog "MySQL escucha pero no responde al ping (fallo $mysqlFailures/3)." 'WARN'
      if ($mysqlFailures -ge 3) {
        Write-GuardLog 'Reiniciando MySQL por falta de respuesta.' 'WARN'
        Stop-MySqlServer
        Start-MySqlServer | Out-Null
        $mysqlFailures = 0
      }
    } else {
      $mysqlFailures = 0
    }

    if (-not (Test-TcpPort 80)) {
      Start-ApacheServer | Out-Null
      $apacheFailures = 0
    } elseif (-not (Test-ApacheHttp)) {
      $apacheFailures++
      Write-GuardLog "Apache escucha pero no responde por HTTP (fallo $apacheFailures/3)." 'WARN'
      if ($apacheFailures -ge 3) {
        Write-GuardLog 'Reiniciando Apache por falta de respuesta.' 'WARN'
        Stop-ApacheServer
        Start-ApacheServer | Out-Null
        $apacheFailures = 0
      }
    } else {
      $apacheFailures = 0
    }

    if (-not (Test-TcpPort 3000)) {
      Start-BackendServer | Out-Null
      $backendFailures = 0
    } elseif (-not (Test-BackendHealth)) {
      $backendFailures++
      Write-GuardLog "El backend escucha pero no responde en /api/health (fallo $backendFailures/3)." 'WARN'
      if ($backendFailures -ge 3) {
        Write-GuardLog 'Reiniciando backend por falta de respuesta.' 'WARN'
        Stop-BackendServer
        Start-BackendServer | Out-Null
        $backendFailures = 0
      }
    } else {
      $backendFailures = 0
    }

    Start-Sleep -Seconds 15
  }
} finally {
  Write-GuardLog 'Guardian finalizado.'
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  try { $mutex.ReleaseMutex() } catch {}
  $mutex.Dispose()
}
