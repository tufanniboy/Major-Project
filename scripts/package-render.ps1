$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'package-project.ps1') -ArchiveName 'soc-analyst-render.zip'
