import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tms_dev';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPort(port, host = '127.0.0.1', timeoutMs = 120_000) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ port, host });
        socket.once('connect', () => {
          socket.end();
          resolve();
        });
        socket.once('error', reject);
      });
      return;
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for ${host}:${port}`);
      }
      await sleep(500);
    }
  }
}

function hasCommand(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, {
      stdio: 'ignore',
      cwd: ROOT,
    });
    return true;
  } catch {
    return false;
  }
}

function startPostgres() {
  // Windows에서는 기존 PowerShell 스크립트가 docker/podman을 자동 감지하므로 우선 사용
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_postgres.ps1 -Engine auto', {
      stdio: 'inherit',
      cwd: ROOT,
    });
    return;
  }

  // Non-Windows: docker compose 사용
  if (!hasCommand('docker')) {
    throw new Error('PostgreSQL이 실행 중이어야 합니다. (docker compose 또는 로컬 Postgres) - docker를 찾지 못했습니다.');
  }

  // Prefer docker compose v2, fallback to docker-compose v1
  const useComposeV2 = (() => {
    try {
      execSync('docker compose version', { stdio: 'ignore', cwd: ROOT });
      return true;
    } catch {
      return false;
    }
  })();

  const cmd = useComposeV2 ? 'docker' : 'docker-compose';
  const args = useComposeV2 ? ['compose', 'up', '-d', 'postgres'] : ['up', '-d', 'postgres'];

  execSync([cmd, ...args].join(' '), { stdio: 'inherit', cwd: ROOT });
}

function runBackendPrisma() {
  execSync('npm -C backend run prisma:migrate:deploy', {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL },
  });
  execSync('npm -C backend run prisma:seed', {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL },
  });
}

function startBackendDev() {
  const child = spawn('npm', ['-C', 'backend', 'run', 'dev'], {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL },
    shell: process.platform === 'win32',
  });

  const forward = (signal) => child.kill(signal);
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
  // 1) Postgres up (이미 떠 있으면 그대로 사용)
  try {
    await waitForPort(5432, '127.0.0.1', 1_000);
  } catch {
    startPostgres();
    await waitForPort(5432);
  }

  // 2) Migrate + seed (idempotent for our seed accounts)
  runBackendPrisma();

  // 3) Start backend dev server (keeps process alive)
  startBackendDev();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


