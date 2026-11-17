$ErrorActionPreference = 'Continue'

$script:ScriptsDir = $PSScriptRoot
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$script:LogDir = Join-Path $ProjectRoot 'logs'
$script:LogFile = Join-Path $LogDir 'xampp-guard.log'
$script:PauseFile = Join-Path $LogDir 'guard.pause'
$script:PidFile = Join-Path $LogDir 'guard.pid'
$script:MysqldPidFile = Join-Path $LogDir 'mysqld.pid'
$script:HttpdPidFile = Join-Path $LogDir 'httpd.pid'

$script:XamppRoot = 'C:\xampp'
$script:Mysqld = Join-Path $XamppRoot 'mysql\bin\mysqld.exe'
$script:MysqlAdmin = Join-Path $XamppRoot 'mysql\bin\mysqladmin.exe'
$script:MysqlIni = Join-Path $XamppRoot 'mysql\bin\my.ini'
$script:MysqlErrorLog = Join-Path $XamppRoot 'mysql\data\mysql_error.log'
$script:Httpd = Join-Path $XamppRoot 'apache\bin\httpd.exe'
$script:ApacheRoot = Join-Path $XamppRoot 'apache'
$script:ApacheErrorLog = Join-Path $XamppRoot 'apache\logs\error.log'
$script:BackendDir = Join-Path $ProjectRoot 'backend'
$script:BackendHealth = 'http://127.0.0.1:3000/api/health'

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-GuardLog {
  param(
    [string]$Message,
    [ValidateSet('INFO', 'WARN', 'ERROR')][string]$Level = 'INFO'
  )
  try {
    if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt 2MB)) {
      Move-Item -Path $LogFile -Destination "$LogFile.1" -Force
    }
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
  } catch {
    # El log nunca debe tumbar el guardian.
  }
}

function Test-TcpPort {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return [bool]$conn
}

function Get-ListeningPid {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return $null
}

function Test-MySqlPing {
  if (-not (Test-TcpPort 3306)) { return $false }
  & $MysqlAdmin -u root -h 127.0.0.1 --connect-timeout=3 ping 2>&1 | Out-Null
  return ($LASTEXITCODE -eq 0)
}

function Test-ApacheHttp {
  if (-not (Test-TcpPort 80)) { return $false }
  try {
    $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1/' -TimeoutSec 4
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Test-BackendHealth {
  if (-not (Test-TcpPort 3000)) { return $false }
  try {
    $r = Invoke-RestMethod -Uri $BackendHealth -TimeoutSec 4
    return [bool]$r.ok
  } catch {
    return $false
  }
}

function Start-MySqlServer {
  if (Test-TcpPort 3306) {
    Write-GuardLog 'MySQL ya esta corriendo en el puerto 3306.'
    return $true
  }

  Write-GuardLog 'Iniciando MySQL...'
  # Redirigir la salida a archivos evita que mysqld herede la consola del
  # lanzador y quede colgado cuando este termina.
  $outLog = Join-Path $LogDir 'mysqld.out.log'
  $errLog = Join-Path $LogDir 'mysqld.err.log'
  $proc = Start-Process -FilePath $Mysqld `
    -ArgumentList "--defaults-file=$MysqlIni", '--standalone' `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  if ($proc) {
    Set-Content -Path $MysqldPidFile -Value $proc.Id -Encoding ASCII
  }

  for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-TcpPort 3306) {
      & $MysqlAdmin -u root -h 127.0.0.1 --connect-timeout=3 ping 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-GuardLog "MySQL listo (intento $i, PID $($proc.Id))."
        return $true
      }
    }
  }

  Write-GuardLog 'MySQL no respondio despues de 30 segundos.' 'ERROR'
  if (Test-Path $MysqlErrorLog) {
    Get-Content $MysqlErrorLog -Tail 20 | ForEach-Object { Write-GuardLog "  $_" 'ERROR' }
  }
  return $false
}

function Start-ApacheServer {
  if (Test-TcpPort 80) {
    Write-GuardLog 'Apache ya esta corriendo en el puerto 80.'
    return $true
  }

  Write-GuardLog 'Iniciando Apache...'
  $outLog = Join-Path $LogDir 'httpd.out.log'
  $errLog = Join-Path $LogDir 'httpd.err.log'
  $proc = Start-Process -FilePath $Httpd `
    -ArgumentList '-d', $ApacheRoot `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  if ($proc) {
    Set-Content -Path $HttpdPidFile -Value $proc.Id -Encoding ASCII
  }

  for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-TcpPort 80) {
      Write-GuardLog "Apache listo (intento $i, PID $($proc.Id))."
      return $true
    }
  }

  Write-GuardLog 'Apache no respondio despues de 20 segundos.' 'ERROR'
  if (Test-Path $ApacheErrorLog) {
    Get-Content $ApacheErrorLog -Tail 15 | ForEach-Object { Write-GuardLog "  $_" 'ERROR' }
  }
  return $false
}

function Start-BackendServer {
  if (Test-TcpPort 3000) {
    Write-GuardLog 'El backend ya esta corriendo en el puerto 3000.'
    return $true
  }

  $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (-not $node) {
    Write-GuardLog 'No se encontro node.exe en el PATH.' 'ERROR'
    return $false
  }

  Write-GuardLog 'Iniciando backend Node...'
  $outLog = Join-Path $LogDir 'backend.out.log'
  $errLog = Join-Path $LogDir 'backend.err.log'
  Start-Process -FilePath $node -ArgumentList '--env-file=.env', 'src/server.js' -WorkingDirectory $BackendDir -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  for ($i = 1; $i -le 25; $i++) {
    Start-Sleep -Seconds 1
    if (Test-BackendHealth) {
      Write-GuardLog "Backend listo (intento $i)."
      return $true
    }
  }

  Write-GuardLog 'El backend no respondio en http://127.0.0.1:3000/api/health.' 'ERROR'
  if (Test-Path $errLog) {
    Get-Content $errLog -Tail 15 | ForEach-Object { Write-GuardLog "  $_" 'ERROR' }
  }
  return $false
}

function Get-SavedPid {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $raw = Get-Content $Path -ErrorAction SilentlyContinue | Select-Object -First 1
  $value = 0
  if ([int]::TryParse([string]$raw, [ref]$value) -and $value -gt 0) {
    return $value
  }
  return $null
}

function Test-ProcessName {
  param([int]$ProcessId, [string]$Name)
  $p = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $p) { return $false }
  return ($p.ProcessName -eq $Name)
}

function Stop-BackendServer {
  $procId = Get-ListeningPid 3000
  if ($procId) {
    Write-GuardLog "Deteniendo backend (PID $procId)..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

function Stop-ApacheServer {
  if (-not (Test-TcpPort 80)) {
    Remove-Item $HttpdPidFile -Force -ErrorAction SilentlyContinue
    Write-GuardLog 'Apache ya esta detenido.'
    return
  }

  $parentPid = Get-SavedPid $HttpdPidFile
  if (-not $parentPid -or -not (Test-ProcessName $parentPid 'httpd')) {
    $parentPid = Get-ListeningPid 80
  }

  Write-GuardLog "Deteniendo Apache de forma ordenada (PID $parentPid)..."
  & $Httpd -d $ApacheRoot -k shutdown 2>&1 | Out-Null

  for ($i = 1; $i -le 8; $i++) {
    Start-Sleep -Seconds 1
    if (-not (Test-TcpPort 80) -and -not (Test-ProcessName $parentPid 'httpd')) {
      Remove-Item $HttpdPidFile -Force -ErrorAction SilentlyContinue
      Write-GuardLog "Apache detenido correctamente (proceso termino en $i s)."
      return
    }
  }

  # httpd -k shutdown de XAMPP no siempre cierra el proceso padre; forzamos
  # el arbol completo como ultimo recurso.
  $listenPid = Get-ListeningPid 80
  $target = $parentPid
  if (-not (Test-ProcessName $target 'httpd')) { $target = $listenPid }
  if ($target) {
    Write-GuardLog "Apache no se detuvo solo; forzando PID $target." 'WARN'
    & taskkill /PID $target /T /F 2>&1 | Out-Null
    Start-Sleep -Seconds 2
  }
  Remove-Item $HttpdPidFile -Force -ErrorAction SilentlyContinue
}

function Stop-MySqlServer {
  if (-not (Test-TcpPort 3306)) {
    Remove-Item $MysqldPidFile -Force -ErrorAction SilentlyContinue
    Write-GuardLog 'MySQL ya esta detenido.'
    return
  }

  # mysqld es el propio proceso que escucha en 3306.
  $procId = Get-ListeningPid 3306
  if (-not $procId -or -not (Test-ProcessName $procId 'mysqld')) {
    $procId = Get-SavedPid $MysqldPidFile
  }

  Write-GuardLog "Deteniendo MySQL de forma ordenada (PID $procId)..."
  & $MysqlAdmin -u root -h 127.0.0.1 --connect-timeout=5 shutdown 2>&1 | Out-Null

  # Esperar la salida real del proceso: cerrar el puerto no garantiza que
  # mysqld haya terminado de volcar InnoDB al disco.
  for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (-not (Test-ProcessName $procId 'mysqld')) {
      Remove-Item $MysqldPidFile -Force -ErrorAction SilentlyContinue
      Write-GuardLog "MySQL detenido correctamente (proceso termino en $i s)."
      return
    }
  }

  if (Test-ProcessName $procId 'mysqld') {
    Write-GuardLog "MySQL no se detuvo solo; forzando PID $procId. Esto puede ser riesgoso." 'WARN'
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  Remove-Item $MysqldPidFile -Force -ErrorAction SilentlyContinue
}

function Stop-AllServers {
  Stop-BackendServer
  Stop-ApacheServer
  Stop-MySqlServer
}

function Get-ProjectStatus {
  $mysqlPid = Get-ListeningPid 3306
  $apachePid = Get-ListeningPid 80
  $backendPid = Get-ListeningPid 3000

  $guardPid = $null
  if (Test-Path $PidFile) {
    $guardPid = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  }

  $mysqlDetail = 'detenido'
  if ($mysqlPid) {
    if (Test-MySqlPing) { $mysqlDetail = 'ping OK' } else { $mysqlDetail = 'sin respuesta' }
  }

  $apacheDetail = 'detenido'
  if ($apachePid) {
    if (Test-ApacheHttp) { $apacheDetail = 'HTTP OK' } else { $apacheDetail = 'sin respuesta' }
  }

  $backendDetail = 'detenido'
  if ($backendPid) {
    if (Test-BackendHealth) { $backendDetail = 'health OK' } else { $backendDetail = 'sin respuesta' }
  }

  $guardDetail = 'no iniciado'
  if ($guardPid) {
    if (Get-Process -Id $guardPid -ErrorAction SilentlyContinue) { $guardDetail = 'vigilando' } else { $guardDetail = 'PID obsoleto' }
  }

  [pscustomobject]@{ Servicio = 'MySQL';   Puerto = 3306; Activo = [bool]$mysqlPid;   PID = $mysqlPid;   Detalle = $mysqlDetail }
  [pscustomobject]@{ Servicio = 'Apache';  Puerto = 80;   Activo = [bool]$apachePid;  PID = $apachePid;  Detalle = $apacheDetail }
  [pscustomobject]@{ Servicio = 'Backend'; Puerto = 3000; Activo = [bool]$backendPid; PID = $backendPid; Detalle = $backendDetail }
  [pscustomobject]@{ Servicio = 'Guardian'; Puerto = '-'; Activo = [bool]$guardPid;   PID = $guardPid;   Detalle = $guardDetail }
}
