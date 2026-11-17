[CmdletBinding()]
param([switch]$Quiet)

. (Join-Path $PSScriptRoot 'xampp-common.ps1')

$okMySql = Start-MySqlServer
$okApache = Start-ApacheServer
$okBackend = Start-BackendServer

# La pausa se quita al final para que el guardian no compita con este script
# arrancando los mismos servicios al mismo tiempo.
if (Test-Path $PauseFile) {
  Remove-Item $PauseFile -Force -ErrorAction SilentlyContinue
  Write-GuardLog 'Pausa eliminada; el guardian vuelve a vigilar.'
}

if (-not $Quiet) {
  Write-Host ''
  Write-Host 'Estado de Lujo Lavadoras' -ForegroundColor Cyan
  Write-Host '========================' -ForegroundColor Cyan
  Get-ProjectStatus | Format-Table -AutoSize
  Write-Host ''
  if ($okMySql -and $okApache -and $okBackend) {
    Write-Host 'Todo listo: MySQL, Apache y backend estan corriendo.' -ForegroundColor Green
  } else {
    Write-Host 'Algo no arranco. Revisa logs\xampp-guard.log.' -ForegroundColor Yellow
  }
}
