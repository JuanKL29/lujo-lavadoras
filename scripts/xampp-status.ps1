[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'xampp-common.ps1')

Write-Host ''
Write-Host 'Estado de Lujo Lavadoras' -ForegroundColor Cyan
Write-Host '========================' -ForegroundColor Cyan
Get-ProjectStatus | Format-Table -AutoSize
Write-Host ''
Write-Host "Log: $LogFile" -ForegroundColor DarkGray

if (Test-Path $PauseFile) {
  Write-Host 'El guardian esta en pausa porque los servicios se detuvieron manualmente.' -ForegroundColor Yellow
  Write-Host 'Usa "Iniciar Lujo Lavadoras" para reanudarlo.' -ForegroundColor DarkGray
}
