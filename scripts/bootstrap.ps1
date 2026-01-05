<#
  Canonical bootstrap entrypoint for local dev DB (Docker/Podman).

  Goals:
  - One place for runtime/compose detection
  - Bring up postgres service (compose up -d postgres)
  - Wait until DB is ready (healthcheck preferred)

  Inputs:
  - $env:CONTAINER_RUNTIME if set (docker|podman) takes precedence
  - else -Engine (auto|docker|podman)

  Examples:
    .\scripts\bootstrap.ps1
    $env:CONTAINER_RUNTIME="podman"; .\scripts\bootstrap.ps1
    .\scripts\bootstrap.ps1 -Engine podman
    .\scripts\bootstrap.ps1 -NoWait
#>

[CmdletBinding()]
param(
  [ValidateSet("auto","docker","podman")]
  [string]$Engine = "auto",
  [switch]$NoWait,
  [int]$TimeoutSec = 60
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
. "$root\scripts\lib\bootstrap.helpers.ps1"

$runtime = Resolve-ContainerRuntime -Engine $Engine
Write-Step "컨테이너 런타임 감지: $runtime"

$composeCmd = Resolve-ComposeCommand -Runtime $runtime

if ($composeCmd) {
  Write-Step "Compose로 PostgreSQL 기동"
  Invoke-ComposeUpPostgres -ComposeCmd $composeCmd -ProjectRoot $root

  if (-not $NoWait) {
    Write-Step "PostgreSQL 준비 대기 (healthcheck/pg_isready)"
    $cid = Get-ComposeServiceContainerId -ComposeCmd $composeCmd -ProjectRoot $root -ServiceName "postgres"
    if (-not $cid) { throw "postgres 컨테이너 ID를 찾지 못했습니다. (compose ps -q postgres)" }
    Wait-PostgresHealthy -Runtime $runtime -ContainerId $cid -TimeoutSec $TimeoutSec
    Write-Host "PostgreSQL 준비 완료" -ForegroundColor Green
  }

  exit 0
}

# Podman인데 compose가 없는 경우: 기존 start_postgres.ps1 방식(podman run)과 호환을 위해 fallback
if ($runtime -eq "podman") {
  Write-Step "Podman compose를 찾지 못해 podman run 방식으로 fallback"

  $containerName = "tms_postgres"
  $volumeName = "tms_postgres_data"
  $image = "docker.io/library/postgres:15-alpine"

  # 볼륨 보장
  podman volume exists $volumeName *> $null
  if ($LASTEXITCODE -ne 0) {
    podman volume create $volumeName | Out-Host
  }

  # 컨테이너가 이미 있으면 시작만
  podman container exists $containerName *> $null
  if ($LASTEXITCODE -eq 0) {
    podman start $containerName | Out-Host
  } else {
    podman run -d `
      --name $containerName `
      -e POSTGRES_USER=postgres `
      -e POSTGRES_PASSWORD=postgres `
      -e POSTGRES_DB=tms_dev `
      -p 5432:5432 `
      -v "${volumeName}:/var/lib/postgresql/data" `
      $image | Out-Host
  }

  if (-not $NoWait) {
    Write-Step "PostgreSQL 준비 대기 (pg_isready)"
    Wait-PostgresHealthy -Runtime "podman" -ContainerId $containerName -TimeoutSec $TimeoutSec
    Write-Host "PostgreSQL 준비 완료" -ForegroundColor Green
  }

  exit 0
}

throw "compose 명령을 찾지 못했습니다. Runtime=$runtime"


