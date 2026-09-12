import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parse } from 'dotenv';
import { validateEnvironment } from '../src/config/environment.js';

// Docker's --env-file does not parse dotenv quoting. Pass names, never secret values,
// as CLI arguments; Docker reads the parsed values from this child process's env.
try {
  const values = parse(readFileSync(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8'));
  const env = { ...process.env, ...values, NODE_ENV: 'production', PORT: '8080' };
  validateEnvironment(env);
  const args = ['run', '--rm', '--name', 'mercado-lajinha-api', '-p', '8080:8080'];
  for (const name of new Set([...Object.keys(values), 'NODE_ENV', 'PORT'])) args.push('--env', name);
  args.push('mercado-lajinha-api:cloudrun');
  const child = spawn('docker', args, { env, stdio: 'inherit' });
  child.on('error', () => { console.error('Não foi possível executar o Docker. Confira a instalação e o daemon.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} catch {
  console.error('Não foi possível ler ou validar backend/.env. Execute npm run env:check.');
  process.exitCode = 1;
}
