[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'xampp-common.ps1')

$startup = [Environment]::GetFolderPath('Startup')
$desktop = [Environment]::GetFolderPath('Desktop')

# Lanzador invisible para el arranque automatico al iniciar sesion.
$vbsPath = Join-Path $startup 'Lujo Lavadoras - XAMPP.vbs'
$vbs = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$ScriptsDir\xampp-guard.ps1""", 0, False
"@
Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
Write-GuardLog "Autostart instalado: $vbsPath"

$ws = New-Object -ComObject WScript.Shell

function New-LujoShortcut {
  param(
    [string]$Path,
    [string]$Arguments,
    [string]$Description,
    [int]$WindowStyle = 7
  )
  $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $sc = $ws.CreateShortcut($Path)
  $sc.TargetPath = $ps
  $sc.Arguments = $Arguments
  $sc.WorkingDirectory = $ProjectRoot
  $sc.Description = $Description
  $sc.WindowStyle = $WindowStyle
  $sc.Save()
}

New-LujoShortcut `
  -Path (Join-Path $desktop 'Iniciar Lujo Lavadoras.lnk') `
  -Arguments "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptsDir\xampp-start.ps1`"" `
  -Description 'Inicia MySQL, Apache y el backend de Lujo Lavadoras'

New-LujoShortcut `
  -Path (Join-Path $desktop 'Detener Lujo Lavadoras.lnk') `
  -Arguments "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptsDir\xampp-stop.ps1`"" `
  -Description 'Detiene MySQL, Apache y el backend de forma ordenada'

New-LujoShortcut `
  -Path (Join-Path $desktop 'Estado Lujo Lavadoras.lnk') `
  -Arguments "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$ScriptsDir\xampp-status.ps1`"" `
  -Description 'Muestra el estado de MySQL, Apache y el backend' `
  -WindowStyle 1

Write-GuardLog 'Accesos directos creados en el escritorio.'
Write-Host 'Autostart y accesos directos instalados correctamente.' -ForegroundColor Green
Write-Host "Lanzador de inicio: $vbsPath" -ForegroundColor DarkGray
