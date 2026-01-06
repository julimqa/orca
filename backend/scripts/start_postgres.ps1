<#
  Convenience proxy for starting Postgres from within `backend/`.

  Usage (from anywhere):
    - From repo root:   .\scripts\start_postgres.ps1
    - From backend/:    .\scripts\start_postgres.ps1

  This script simply forwards to the repo-root `scripts/start_postgres.ps1`.
#>

[CmdletBinding()]
param(
  [ValidateSet("auto","docker","podman")]
  [string]$Engine = "auto"
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot          # ...\backend
$repoRoot = Split-Path -Parent $backendRoot              # ...\

& (Join-Path $repoRoot "scripts\start_postgres.ps1") -Engine $Engine

