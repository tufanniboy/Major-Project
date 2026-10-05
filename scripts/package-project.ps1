param(
  [ValidatePattern('^[a-zA-Z0-9_-]+\.zip$')]
  [string]$ArchiveName = 'soc-analyst-team.zip'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageFolder = Join-Path $projectRoot 'deployment'
New-Item -ItemType Directory -Path $packageFolder -Force | Out-Null
$archivePath = Join-Path $packageFolder $ArchiveName
$rootNames = @('index.html', 'employee.html', 'analyst-login.html', 'favicon.svg', 'server.js', 'package.json', 'package-lock.json', 'render.yaml', 'README.md', 'START-HERE.md', 'TESTING.md', '.gitignore', '.env.example', '1-SETUP.cmd', '2-START-LAB.cmd', '3-CHECK-SETUP.cmd')
$sources = @($rootNames | ForEach-Object { Get-Item -LiteralPath (Join-Path $projectRoot $_) })
$allowed = @('.html', '.js', '.css', '.md', '.ps1', '.cmd', '.svg', '.png', '.jpg', '.jpeg', '.webp')
foreach ($folder in @('css', 'js', 'data', 'lib', 'scripts', 'tests', 'docs')) {
  $sources += Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -File -Recurse | Where-Object {
    $_.Extension.ToLowerInvariant() -in $allowed -and $_.Name -notlike '.env*' -and
    $_.FullName -notmatch '[\\/](node_modules|test-output|deployment|\.git|\.codex|\.agents)[\\/]' -and
    -not ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
  }
}
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $sources) {
    $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Output $archivePath
