param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3000"

function Call-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [string]$Token = ""
  )
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $params = @{
    Method = $Method
    Uri = "$base$Path"
    Headers = $headers
    ContentType = "application/json"
    UseBasicParsing = $true
  }
  if ($null -ne $Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  try {
    $r = Invoke-WebRequest @params
    return [pscustomobject]@{ status = [int]$r.StatusCode; body = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $stream = $resp.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $content = $reader.ReadToEnd()
      return [pscustomobject]@{ status = [int]$resp.StatusCode; body = $content }
    }
    return [pscustomobject]@{ status = 0; body = $_.Exception.Message }
  }
}

function Show-Step {
  param([string]$Label, $Result, [int]$Expected)
  $color = if ($Result.status -eq $Expected) { "Green" } else { "Red" }
  $mark = if ($Result.status -eq $Expected) { "OK" } else { "FALLO" }
  Write-Host ("[{0}] {1} -> {2} (esperado {3})" -f $mark, $Label, $Result.status, $Expected) -ForegroundColor $color
  if ($Result.status -ne $Expected) {
    Write-Host ("       " + $Result.body) -ForegroundColor DarkYellow
  } elseif ($Result.body.Length -lt 260) {
    Write-Host ("       " + $Result.body) -ForegroundColor DarkGray
  }
}

function Pause-Demo {
  param([string]$Message = "Enter para continuar...")
  if (-not $NoPause) {
    Write-Host ""
    Read-Host $Message | Out-Null
    Write-Host ""
  }
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " DEMO HTTP - LUJO LAVADORAS" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$health = Call-Api -Method GET -Path "/api/health"
Show-Step "GET /api/health" $health 200
if ($health.status -ne 200) {
  Write-Host "El backend no responde. Ejecuta 'npm start' en la raiz del proyecto." -ForegroundColor Red
  exit 1
}

$idLavadora = $null
$idServicio = $null
$idAlquiler = $null
$idOrden = $null
$token = ""

try {
  Write-Host ""
  Write-Host "--- POST /api/auth/login ---" -ForegroundColor Cyan
  $login = Call-Api -Method POST -Path "/api/auth/login" -Body @{ correo = "admin@lujolavadoras.com"; password = "admin123" }
  Show-Step "POST /api/auth/login" $login 200
  $token = ($login.body | ConvertFrom-Json).token
  Write-Host ("Token obtenido: " + $token.Substring(0, 24) + "...") -ForegroundColor DarkGray
  Pause-Demo "Login listo. Enter para probar GET..."

  Write-Host "--- GET (lectura) ---" -ForegroundColor Cyan
  Show-Step "GET /api/lavadoras" (Call-Api -Method GET -Path "/api/lavadoras") 200
  Show-Step "GET /api/lavadoras/1" (Call-Api -Method GET -Path "/api/lavadoras/1") 200
  Show-Step "GET /api/lavadoras/9999" (Call-Api -Method GET -Path "/api/lavadoras/9999") 404
  Show-Step "GET /api/servicios" (Call-Api -Method GET -Path "/api/servicios") 200
  Show-Step "GET /api/lavadoras/1/disponibilidad" (Call-Api -Method GET -Path "/api/lavadoras/1/disponibilidad?inicio=2026-12-01&fin=2026-12-05") 200
  Show-Step "GET /api/stats sin token" (Call-Api -Method GET -Path "/api/stats") 401
  Show-Step "GET /api/stats con token" (Call-Api -Method GET -Path "/api/stats" -Token $token) 200
  Pause-Demo "GET listo. Enter para probar POST..."

  Write-Host "--- POST (crear) ---" -ForegroundColor Cyan
  $nuevaLavadora = Call-Api -Method POST -Path "/api/lavadoras" -Token $token -Body @{
    marca = "Prueba"; modelo = "Demo HTTP"; referencia = "TEST-HTTP-01"; precio_alquiler = 100000; estado = "Disponible"
  }
  Show-Step "POST /api/lavadoras" $nuevaLavadora 201
  $idLavadora = ($nuevaLavadora.body | ConvertFrom-Json).id_lavadora
  Write-Host ("idLavadora = " + $idLavadora) -ForegroundColor DarkGray

  Show-Step "POST /api/lavadoras sin token" (Call-Api -Method POST -Path "/api/lavadoras" -Body @{
    marca = "Prueba"; modelo = "Demo HTTP"; referencia = "TEST-HTTP-01"; precio_alquiler = 100000
  }) 401

  $nuevoServicio = Call-Api -Method POST -Path "/api/servicios" -Token $token -Body @{
    nombre_servicio = "Servicio de prueba HTTP"; descripcion = "Creado para la demostracion"; precio = 15000
  }
  Show-Step "POST /api/servicios" $nuevoServicio 201
  $idServicio = ($nuevoServicio.body | ConvertFrom-Json).id_tipo_servicio
  Write-Host ("idServicio = " + $idServicio) -ForegroundColor DarkGray

  $nuevoAlquiler = Call-Api -Method POST -Path "/api/alquileres" -Body @{
    cliente = @{ nombre = "Cliente Prueba HTTP"; cedula = "1099887766"; telefono = "3001234567"; correo = "prueba@http.com"; direccion = "Calle 1 # 2-3" }
    idLavadora = $idLavadora
    fecha_inicio = "2026-12-01"
    fecha_fin = "2026-12-05"
    idTipo_servicio = $idServicio
    observaciones = "Alquiler de prueba"
  }
  Show-Step "POST /api/alquileres" $nuevoAlquiler 201
  $jsonAlquiler = $nuevoAlquiler.body | ConvertFrom-Json
  $idAlquiler = $jsonAlquiler.alquiler.id_alquiler
  $idOrden = $jsonAlquiler.orden.id_orden_servicio
  Write-Host ("idAlquiler = " + $idAlquiler + " | idOrden = " + $idOrden) -ForegroundColor DarkGray

  Show-Step "POST /api/alquileres solapado" (Call-Api -Method POST -Path "/api/alquileres" -Body @{
    cliente = @{ nombre = "Cliente Prueba HTTP"; cedula = "1099887766"; telefono = "3001234567"; correo = "prueba@http.com" }
    idLavadora = $idLavadora
    fecha_inicio = "2026-12-02"
    fecha_fin = "2026-12-06"
    idTipo_servicio = $idServicio
  }) 409
  Write-Host ""
  Write-Host "Recarga la pagina con Ctrl+F5: el servicio de prueba debe aparecer." -ForegroundColor Yellow
  Pause-Demo "POST listo. Enter para probar PUT..."

  Write-Host "--- PUT (actualizar completo) ---" -ForegroundColor Cyan
  Show-Step "PUT /api/lavadoras/$idLavadora" (Call-Api -Method PUT -Path "/api/lavadoras/$idLavadora" -Token $token -Body @{
    marca = "Prueba"; modelo = "Demo HTTP actualizada"; referencia = "TEST-HTTP-01"; precio_alquiler = 110000; estado = "Disponible"
  }) 200
  Show-Step "PUT /api/servicios/$idServicio" (Call-Api -Method PUT -Path "/api/servicios/$idServicio" -Token $token -Body @{
    nombre_servicio = "Servicio de prueba HTTP (actualizado)"; descripcion = "Servicio actualizado"; precio = 18000
  }) 200
  Write-Host ""
  Write-Host "Recarga la pagina: el servicio debe mostrar el nombre y precio actualizados." -ForegroundColor Yellow
  Pause-Demo "PUT listo. Enter para probar PATCH..."

  Write-Host "--- PATCH (actualizar parcial) ---" -ForegroundColor Cyan
  Show-Step "PATCH /api/alquileres/$idAlquiler/estado -> Activo" (Call-Api -Method PATCH -Path "/api/alquileres/$idAlquiler/estado" -Token $token -Body @{ estado = "Activo" }) 200
  Show-Step "PATCH /api/ordenes/$idOrden/estado -> En proceso" (Call-Api -Method PATCH -Path "/api/ordenes/$idOrden/estado" -Token $token -Body @{ estado = "En proceso"; observaciones = "Orden actualizada" }) 200
  Show-Step "PATCH estado invalido" (Call-Api -Method PATCH -Path "/api/alquileres/$idAlquiler/estado" -Token $token -Body @{ estado = "Volando" }) 400
  Pause-Demo "PATCH listo. Enter para probar DELETE..."

  Write-Host "--- DELETE (eliminar) ---" -ForegroundColor Cyan
  Show-Step "DELETE /api/ordenes/$idOrden" (Call-Api -Method DELETE -Path "/api/ordenes/$idOrden" -Token $token) 200
  Show-Step "DELETE /api/ordenes/$idOrden otra vez" (Call-Api -Method DELETE -Path "/api/ordenes/$idOrden" -Token $token) 404
  Show-Step "DELETE /api/lavadoras/$idLavadora con alquiler" (Call-Api -Method DELETE -Path "/api/lavadoras/$idLavadora" -Token $token) 409
  Show-Step "DELETE /api/alquileres/$idAlquiler" (Call-Api -Method DELETE -Path "/api/alquileres/$idAlquiler" -Token $token) 200
  Show-Step "DELETE /api/servicios/$idServicio" (Call-Api -Method DELETE -Path "/api/servicios/$idServicio" -Token $token) 200
  Show-Step "DELETE /api/lavadoras/$idLavadora" (Call-Api -Method DELETE -Path "/api/lavadoras/$idLavadora" -Token $token) 200
  Show-Step "DELETE /api/lavadoras/$idLavadora otra vez" (Call-Api -Method DELETE -Path "/api/lavadoras/$idLavadora" -Token $token) 404
  Write-Host ""
  Write-Host "Recarga la pagina: el servicio de prueba ya no debe aparecer." -ForegroundColor Yellow

  Write-Host ""
  Write-Host "--- Limpieza del cliente (SQL) ---" -ForegroundColor Cyan
  & C:\xampp\mysql\bin\mysql.exe -u root -e "USE lavadoras; DELETE FROM cliente WHERE cedula = 1099887766;"
  Write-Host "Cliente de prueba eliminado." -ForegroundColor Green

  Write-Host ""
  Write-Host "--- Conteos finales ---" -ForegroundColor Cyan
  & C:\xampp\mysql\bin\mysql.exe -u root -N -e "USE lavadoras; SELECT 'alquileres', COUNT(*) FROM alquiler; SELECT 'clientes', COUNT(*) FROM cliente; SELECT 'ordenes', COUNT(*) FROM orden_de_servicio; SELECT 'lavadoras', COUNT(*) FROM lavadora; SELECT 'servicios', COUNT(*) FROM tipo_de_servicio;"
  Write-Host ""
  Write-Host "Demostracion terminada." -ForegroundColor Green
} finally {
  Write-Host ""
  Write-Host "Limpieza de seguridad..." -ForegroundColor DarkYellow
  if ($idOrden) { Call-Api -Method DELETE -Path "/api/ordenes/$idOrden" -Token $token | Out-Null }
  if ($idAlquiler) { Call-Api -Method DELETE -Path "/api/alquileres/$idAlquiler" -Token $token | Out-Null }
  if ($idServicio) { Call-Api -Method DELETE -Path "/api/servicios/$idServicio" -Token $token | Out-Null }
  if ($idLavadora) { Call-Api -Method DELETE -Path "/api/lavadoras/$idLavadora" -Token $token | Out-Null }
  & C:\xampp\mysql\bin\mysql.exe -u root -e "USE lavadoras; DELETE FROM cliente WHERE cedula = 1099887766;" 2>$null
}
