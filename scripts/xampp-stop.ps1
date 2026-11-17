[CmdletBinding()]
param([switch]$Quiet)

. (Join-Path $PSScriptRoot 'xampp-common.ps1')

New-Item -ItemType File -Path $PauseFile -Force | Out-Null
Write-GuardLog 'Detencion solicitada. Pausando el guardian.'

Stop-AllServers

if (-not $Quiet) {
  Write-Host ''
  Write-Host 'Estado de Lujo Lavadoras' -ForegroundColor Cyan
  Write-Host '========================' -ForegroundColor Cyan
  Get-ProjectStatus | Format-Table -AutoSize
  Write-Host ''
  Write-Host 'Servicios detenidos de forma ordenada.' -ForegroundColor Green
  Write-Host 'Para volver a iniciar, usa el acceso directo "Iniciar Lujo Lavadoras".' -ForegroundColor DarkGray
}
