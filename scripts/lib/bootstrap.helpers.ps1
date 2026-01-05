<# 
  Shared helpers for DB bootstrap scripts (Docker/Podman + Compose).
  - Keep scripts non-interactive and Windows PowerShell friendly.
#>

$ErrorActionPreference = "Stop"

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Has-Command([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Resolve-ContainerRuntime {
  param(
    [ValidateSet("auto","docker","podman")]
    [string]$Engine = "auto"
  )

  if ($env:CONTAINER_RUNTIME) {
    $rt = $env:CONTAINER_RUNTIME.ToLower().Trim()
    if ($rt -in @("docker","podman")) { return $rt }
    throw "CONTAINER_RUNTIME='$env:CONTAINER_RUNTIME' 는 지원하지 않습니다. (docker|podman)"
  }

  if ($Engine -ne "auto") { return $Engine }

  if (Has-Command "docker") { return "docker" }
  if (Has-Command "podman") { return "podman" }
  throw "docker/podman을 찾지 못했습니다. Docker Desktop 또는 Podman Desktop/CLI를 설치해주세요."
}

function Ensure-Podman-Machine {
  if (-not (Has-Command "podman")) { return }
  try {
    $info = podman info --format "{{.Host.Os}}" 2>$null
    if ($LASTEXITCODE -eq 0 -and $info) { return }
  } catch {}

  Write-Step "podman machine 시작 시도"
  podman machine start | Out-Host
}

function Resolve-ComposeCommand {
  param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker","podman")]
    [string]$Runtime
  )

  if ($Runtime -eq "docker") {
    if (-not (Has-Command "docker")) { throw "docker 명령을 찾지 못했습니다." }
    # 요구사항: docker는 "docker compose"
    try {
      docker compose version *> $null
      return @("docker","compose")
    } catch {
      # 호환성: docker-compose가 있으면 fallback
      if (Has-Command "docker-compose") { return @("docker-compose") }
      throw "docker compose(또는 docker-compose)를 찾지 못했습니다."
    }
  }

  # podman
  if (-not (Has-Command "podman")) { throw "podman 명령을 찾지 못했습니다." }
  Ensure-Podman-Machine

  # 요구사항: podman은 "podman compose" 우선, 없으면 "podman-compose"
  try {
    podman compose version *> $null
    return @("podman","compose")
  } catch {
    if (Has-Command "podman-compose") { return @("podman-compose") }
    # 호환성: compose가 없으면 기존 방식(podman run)로 fallback 가능 (call site에서 처리)
    return $null
  }
}

function Invoke-ComposeUpPostgres {
  param(
    [Parameter(Mandatory=$true)]
    [string[]]$ComposeCmd,
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot
  )

  Push-Location $ProjectRoot
  try {
    & $ComposeCmd up -d postgres | Out-Host
  } finally {
    Pop-Location
  }
}

function Get-ComposeServiceContainerId {
  param(
    [Parameter(Mandatory=$true)]
    [string[]]$ComposeCmd,
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,
    [Parameter(Mandatory=$true)]
    [string]$ServiceName
  )

  Push-Location $ProjectRoot
  try {
    $id = (& $ComposeCmd ps -q $ServiceName) 2>$null
    return ($id | Select-Object -First 1).Trim()
  } finally {
    Pop-Location
  }
}

function Get-ContainerHealthStatus {
  param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker","podman")]
    [string]$Runtime,
    [Parameter(Mandatory=$true)]
    [string]$ContainerId
  )

  $cmd = $Runtime
  try {
    $status = & $cmd inspect -f "{{.State.Health.Status}}" $ContainerId 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    $s = ($status | Select-Object -First 1).Trim()
    if (-not $s -or $s -eq "<no value>") { return $null }
    return $s
  } catch {
    return $null
  }
}

function Wait-PostgresHealthy {
  param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker","podman")]
    [string]$Runtime,
    [Parameter(Mandatory=$true)]
    [string]$ContainerId,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $health = Get-ContainerHealthStatus -Runtime $Runtime -ContainerId $ContainerId
    if ($health -eq "healthy") { return }
    if ($health -eq "unhealthy") { throw "Postgres 컨테이너가 unhealthy 상태입니다: $ContainerId" }

    # healthcheck가 없거나 상태를 못 얻는 경우: pg_isready로 fallback
    try {
      & $Runtime exec $ContainerId pg_isready -U postgres -d tms_dev *> $null
      if ($LASTEXITCODE -eq 0) { return }
    } catch {}

    Start-Sleep -Seconds 2
  }

  throw "Postgres 준비 대기 시간 초과 (${TimeoutSec}s): $ContainerId"
}


