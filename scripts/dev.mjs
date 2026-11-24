import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('.env.local')) {
  process.stdout.write('Configurando credenciales locales de BookFit…\n');
  const setup = spawnSync('pnpm', ['local:env'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
  if (setup.status !== 0) {
    process.stderr.write('No se pudo preparar .env.local. Comprueba que Supabase local está iniciado y con migraciones aplicadas.\n');
    process.exit(setup.status ?? 1);
  }
}

const children = ['dev:api', 'dev:web'].map((script) => spawn('pnpm', ['run', script], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
}));

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
for (const child of children) {
  child.on('error', (error) => {
    process.stderr.write(`No se pudo iniciar un proceso local: ${error.message}\n`);
    stop();
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) stop();
  });
}
