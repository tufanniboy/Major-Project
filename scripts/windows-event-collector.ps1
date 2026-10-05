$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*(SENSOR_INGEST_TOKEN|SENSOR_URL)\s*=\s*(.*?)\s*$') {
      [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"').Trim("'"), 'Process')
    }
  }
}
$token = $env:SENSOR_INGEST_TOKEN
if (-not $token -or $token.Length -lt 32) { throw 'Set SENSOR_INGEST_TOKEN to the backend token in .env.' }
$url = if ($env:SENSOR_URL) { $env:SENSOR_URL.TrimEnd('/') + '/api/sensors/windows' } else { 'http://127.0.0.1:8000/api/sensors/windows' }
$agentIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and $_.AddressState -eq 'Preferred' } | Select-Object -First 1 -ExpandProperty IPAddress
if (-not $agentIp) { throw 'No private IPv4 address found. Connect this Windows machine to the isolated lab network.' }
$computer = $env:COMPUTERNAME
$seen = [System.Collections.Generic.HashSet[string]]::new()
$eventIds = @(4624, 4625, 4688, 4720, 4722, 4728, 4732, 4756, 5152)
Write-Host "Watching selected Windows Security events on $computer ($agentIp). Sending to the local SOC collector."
Write-Host 'Stop with Ctrl+C. Event details omit process command lines.'

while ($true) {
  $records = @()
  $start = (Get-Date).AddSeconds(-20)
  $found = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = $eventIds; StartTime = $start } -ErrorAction SilentlyContinue
  foreach ($entry in $found) {
    $key = "$computer|Security|$($entry.RecordId)"
    if ($seen.Contains($key)) { continue }
    $data = @{}
    [xml]$xml = $entry.ToXml()
    foreach ($item in $xml.Event.EventData.Data) { if ($item.Name) { $data[[string]$item.Name] = [string]$item.'#text' } }
    $id = [int]$entry.Id
    $remote = if ($data.IpAddress -and $data.IpAddress -ne '-') { $data.IpAddress } elseif ($data.SourceAddress -and $data.SourceAddress -ne '-') { $data.SourceAddress } else { '' }
    $protocol = if ($id -eq 5152 -and $data.Protocol -eq '1') { 'ICMP' } elseif ($id -eq 5152) { 'IP' } else { 'HOST' }
    $user = if ($data.TargetUserName) { $data.TargetUserName } elseif ($data.SubjectUserName) { $data.SubjectUserName } else { 'unknown' }
    $detail = switch ($id) {
      4624 { 'Successful Windows logon' }
      4625 { 'Failed Windows logon' }
      4688 { 'Process started: ' + [IO.Path]::GetFileName([string]$data.NewProcessName) }
      5152 { "Windows Filtering Platform blocked a $protocol packet" }
      default { "Windows account or group change (event $id)" }
    }
    $records += [ordered]@{ eventId = $id; recordId = [string]$entry.RecordId; timestamp = $entry.TimeCreated.ToUniversalTime().ToString('o'); computer = $computer; logName = 'Security'; agentIp = $agentIp; remoteIp = $remote; protocol = $protocol; port = if ($data.DestPort -match '^\d+$') { [int]$data.DestPort } else { 0 }; user = $user; detail = $detail }
  }
  if ($records.Count -gt 0) {
    try {
      $batches = for ($offset = 0; $offset -lt $records.Count; $offset += 100) { ,@($records[$offset..([Math]::Min($offset + 99, $records.Count - 1))]) }
      foreach ($batch in $batches) {
        $json = ConvertTo-Json -InputObject @($batch) -Depth 5 -Compress
        Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $json | Out-Null
        foreach ($item in $batch) { [void]$seen.Add("$computer|Security|$($item.recordId)") }
      }
    } catch { Write-Warning "Windows event forwarding failed: $($_.Exception.Message)" }
  }
  if ($seen.Count -gt 10000) { $seen.Clear() }
  Start-Sleep -Seconds 3
}
