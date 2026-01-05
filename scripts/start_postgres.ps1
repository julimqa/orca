<#
  로컬 개발용 PostgreSQL 컨테이너 시작 스크립트 (Docker 또는 Podman)

  - ✅ 유지되는 엔트리포인트(호환성): 기존처럼 실행 가능
  - 내부 구현은 `scripts/bootstrap.ps1`(캐노니컬 부트스트랩)로 위임합니다.

  사용:
    .\scripts\start_postgres.ps1
    .\scripts\start_postgres.ps1 -Engine podman
    .\scripts\start_postgres.ps1 -Engine docker

  참고:
    - DATABASE_URL 기본값(backend/.env): postgresql://postgres:postgres@localhost:5432/tms_dev
    - 컨테이너 이름: tms_postgres
    - 볼륨 이름(Podman): tms_postgres_data
#>

[CmdletBinding()]
param(
  [ValidateSet("auto","docker","podman")]
  [string]$Engine = "auto"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 캐노니컬 엔트리포인트로 위임
& "$root\scripts\bootstrap.ps1" -Engine $Engine
