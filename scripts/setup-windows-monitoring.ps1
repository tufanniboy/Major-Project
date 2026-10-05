$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdministrator) {
  throw 'Administrator access is required. Open PowerShell as Administrator, change to the project folder, then run npm run setup:windows.'
}

Set-Location $projectRoot
$auditCommands = @(
  @('/set', '/subcategory:Logon', '/success:enable', '/failure:enable'),
  @('/set', '/subcategory:Process Creation', '/success:enable'),
  @('/set', '/subcategory:Account Management', '/success:enable', '/failure:enable'),
  @('/set', '/subcategory:Filtering Platform Packet Drop', '/failure:enable')
)
foreach ($arguments in $auditCommands) {
  & auditpol.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw 'Windows rejected an audit policy. Check the localized subcategory names with: auditpol /list /subcategory:*'
  }
}

Write-Host ''
Write-Host 'Windows Security auditing is enabled for logons, process starts, account changes, and blocked packets.'
Write-Host 'Starting the collector. Keep this administrator window open; press Ctrl+C to stop it.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'windows-event-collector.ps1')
exit $LASTEXITCODE
