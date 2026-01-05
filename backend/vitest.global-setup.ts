import { execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tms_dev';
const BACKEND_ROOT = __dirname;
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPort(port: number, host = '127.0.0.1', timeoutMs = 120_000) {
  const start = Date.now();
  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ port, host });
        socket.once('connect', () => {
          socket.end();
          resolve();
        });
        socket.once('error', reject);
      });
      return;
    } catch {
      if (Date.now() - start > timeoutMs) throw new Error(`Timeout waiting for ${host}:${port}`);
      await sleep(500);
    }
  }
}

function startPostgresIfNeeded() {
  // If already up, do nothing
  try {
    execSync(
      'node -e "require(\'net\').createConnection({port:5432,host:\'127.0.0.1\'}).on(\'connect\',()=>process.exit(0)).on(\'error\',()=>process.exit(1))"',
      { stdio: 'ignore' }
    );
    return;
  } catch {
    // continue
  }

  if (process.platform === 'win32') {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'start_postgres.ps1');
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Engine auto`, {
      stdio: 'inherit',
      cwd: REPO_ROOT,
    });
    return;
  }

  execSync('docker compose up -d postgres', { stdio: 'inherit', cwd: REPO_ROOT });
}

export default async function globalSetup() {
  process.env.DATABASE_URL = DATABASE_URL;

  startPostgresIfNeeded();
  await waitForPort(5432);

  execSync('npm run prisma:migrate:deploy', {
    stdio: 'inherit',
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL },
  });
  execSync('npm run prisma:seed', {
    stdio: 'inherit',
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL },
  });
}


