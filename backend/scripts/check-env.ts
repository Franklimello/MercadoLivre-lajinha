import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPrivateKey } from 'node:crypto';
import { parse } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { validateEnvironment } from '../src/config/environment.js';

// Only print variable names and fixed diagnostics: provider errors may contain secrets.
const backendPath = fileURLToPath(new URL('../.env', import.meta.url));
const frontendPath = fileURLToPath(new URL('../../frontend/.env.local', import.meta.url));
let failures = 0;
function report(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? 'OK' : 'FALHA'} ${name}: ${detail}`);
}
function readEnv(path: string) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, 'utf8');
  const names = [...raw.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map(m => m[1]);
  for (const name of new Set(names)) {
    if (names.filter(n => n === name).length > 1) report(name, false, 'variável duplicada no arquivo');
  }
  const quoted = [...raw.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*["']/gm)].map(m => m[1]);
  if (quoted.length) console.log(`INFO Aspas externas aceitas pelo dotenv: ${quoted.join(', ')}. Não use esse arquivo diretamente em docker run --env-file.`);
  return parse(raw);
}
const env = readEnv(backendPath);
const front = readEnv(frontendPath);
for (const [name, fallback, minimum] of [['PORT', 8080, 1], ['RATE_LIMIT_MAX', 120, 1], ['RATE_LIMIT_WINDOW_MS', 60000, 1000]] as const) {
  const value = Number(env[name] || fallback);
  report(name, Number.isInteger(value) && value >= minimum && (name !== 'PORT' || value <= 65535), env[name] ? 'formato numérico' : 'ausente; padrão da aplicação válido');
}
report('ALLOW_INSECURE_DEV_AUTH', !/^true$/i.test(env.ALLOW_INSECURE_DEV_AUTH || ''), 'autenticação insegura deve permanecer desativada em produção');
console.log('INFO NODE_ENV: validação executada como production. NEON_BRANCH é metadado do CLI; K_SERVICE é fornecida pelo Cloud Run.');
try {
  validateEnvironment({ ...env, NODE_ENV: 'production' });
  report('Configuração do backend', true, 'variáveis obrigatórias e formatos aceitos em produção');
} catch {
  report('Configuração do backend', false, 'a validação de produção rejeitou uma ou mais variáveis');
}
for (const name of ['DATABASE_URL', 'DIRECT_URL', 'FRONTEND_URL', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT']) {
  report(name, Boolean(env[name]?.trim()), env[name]?.trim() ? 'presente, valor oculto' : 'ausente ou vazia');
}

async function database(name: 'DATABASE_URL' | 'DIRECT_URL') {
  if (!env[name]) return;
  let client: PrismaClient | undefined;
  try {
    const url = new URL(env[name]);
    if (url.protocol !== 'postgresql:' || !url.username || !url.password || !url.pathname.slice(1)) throw new Error();
    url.searchParams.set('connect_timeout', '10');
    url.searchParams.set('pool_timeout', '10');
    url.searchParams.set('connection_limit', '1');
    client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    const result = await client.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    report(name, result[0]?.ok === 1, 'conexão real e SELECT 1; nenhum dado alterado');
  } catch {
    report(name, false, 'não foi possível conectar e executar SELECT 1; confira URL, acesso e disponibilidade');
  } finally { await client?.$disconnect().catch(() => {}); }
}

async function firebase() {
  let app: ReturnType<typeof initializeApp> | undefined;
  try {
    const privateKey = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const key = createPrivateKey(privateKey);
    report('FIREBASE_PRIVATE_KEY', key.asymmetricKeyType === 'rsa', 'PEM lido corretamente após processamento das aspas e quebras de linha');
    const credential = cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey });
    const token = await credential.getAccessToken();
    report('Firebase OAuth', true, 'Google aceitou a conta de serviço e a assinatura da chave');
    app = initializeApp({ credential, projectId: env.FIREBASE_PROJECT_ID }, 'env-check');
    try {
      await getAuth(app).listUsers(1);
      report('Firebase Authentication', true, 'consulta administrativa aceita; nenhum usuário alterado');
    } catch {
      report('Firebase Authentication', false, 'OAuth válido, mas a consulta de usuários falhou; confira projeto, serviço e permissões');
    }
    const appId = front.NEXT_PUBLIC_FIREBASE_APP_ID;
    if (appId && !/mock|placeholder|example/i.test(appId)) {
      const response = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/webApps/${encodeURIComponent(appId)}/config`, {
        headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const config = await response.json() as Record<string, string>;
        for (const [name, field] of Object.entries({ NEXT_PUBLIC_FIREBASE_API_KEY: 'apiKey', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'authDomain', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'projectId', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'storageBucket', NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId', NEXT_PUBLIC_FIREBASE_APP_ID: 'appId' })) {
          report(name, Boolean(front[name] && front[name] === config[field]), 'comparação com a configuração oficial do aplicativo Firebase');
        }
      } else {
        report('Configuração web Firebase', false, `consulta retornou HTTP ${response.status}; confira App ID e permissão de leitura da configuração`);
      }
    }
  } catch {
    report('Firebase OAuth', false, 'chave, conta de serviço ou autenticação OAuth rejeitada; valores preservados e ocultos');
  } finally { if (app) await deleteApp(app).catch(() => {}); }
}

async function imagekit() {
  try {
    const response = await fetch('https://api.imagekit.io/v1/files?limit=1', {
      headers: { Authorization: `Basic ${Buffer.from(`${env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}` }, signal: AbortSignal.timeout(15000),
    });
    report('IMAGEKIT_PRIVATE_KEY', response.ok, response.ok ? 'API aceitou a chave em uma consulta de arquivos; nenhum upload realizado' : `API retornou HTTP ${response.status}; confira chave e permissões de leitura`);
    const endpoint = new URL(env.IMAGEKIT_URL_ENDPOINT);
    report('IMAGEKIT_URL_ENDPOINT', endpoint.protocol === 'https:', 'formato do endpoint HTTPS');
    report('IMAGEKIT_PUBLIC_KEY', /^public_\S+$/.test(env.IMAGEKIT_PUBLIC_KEY || ''), 'formato da chave pública; o par de chaves exige um upload para validação completa');
    if (response.ok) {
      const files = await response.json() as Array<{ url?: string }>;
      const sample = files.find(file => file.url);
      if (sample?.url) {
        const fileUrl = new URL(sample.url);
        const matches = fileUrl.origin === endpoint.origin && fileUrl.pathname.startsWith(`${endpoint.pathname.replace(/\/$/, '')}/`);
        report('IMAGEKIT_URL_ENDPOINT', matches, 'comparação com a URL de um arquivo retornado pela conta');
        if (matches && fileUrl.protocol === 'https:') {
          const image = await fetch(fileUrl, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
          report('ImageKit CDN', image.ok, `imagem existente respondeu HTTP ${image.status}; conteúdo não baixado`);
        }
      } else console.log('INFO ImageKit CDN: conta sem arquivo disponível para verificar o endpoint em rede.');
    }
  } catch { report('ImageKit', false, 'consulta indisponível ou endpoint inválido'); }
}

if (existsSync(frontendPath)) {
  if (!front.NEXT_PUBLIC_FIREBASE_VAPID_KEY) console.log('INFO NEXT_PUBLIC_FIREBASE_VAPID_KEY: ausente; entrega de notificações web não validada.');
  else report('NEXT_PUBLIC_FIREBASE_VAPID_KEY', /^[A-Za-z0-9_-]{87,88}$/.test(front.NEXT_PUBLIC_FIREBASE_VAPID_KEY), 'formato da chave pública VAPID; entrega de notificações não testada');
  report('NEXT_PUBLIC_ENABLE_PWA', !front.NEXT_PUBLIC_ENABLE_PWA || /^(true|false)$/.test(front.NEXT_PUBLIC_ENABLE_PWA), 'opcional; ativação automática da PWA em produção');
  for (const [name, backName] of Object.entries({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'FIREBASE_PROJECT_ID', NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: 'IMAGEKIT_PUBLIC_KEY', NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: 'IMAGEKIT_URL_ENDPOINT' })) {
    report(name, Boolean(front[name] && front[name] === env[backName]), 'consistência entre frontend e backend');
  }
  const apiKey = front.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey && !/mock|placeholder|example|developmentonly/i.test(apiKey)) {
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(15000) });
      report('NEXT_PUBLIC_FIREBASE_API_KEY', response.ok, `consulta de configuração do Authentication HTTP ${response.status}`);
    } catch { report('NEXT_PUBLIC_FIREBASE_API_KEY', false, 'consulta de configuração indisponível'); }
  }
  for (const name of ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID']) {
    report(name, Boolean(front[name] && !/mock|placeholder|example|developmentonly/i.test(front[name])), 'presença e ausência de valores de exemplo');
  }
  try {
    const url = new URL(front.NEXT_PUBLIC_API_URL);
    const response = await fetch(new URL(`${url.pathname.replace(/\/$/, '')}/health`, url.origin), { signal: AbortSignal.timeout(10000) });
    report('NEXT_PUBLIC_API_URL', response.ok, `health check HTTP ${response.status}`);
  } catch { report('NEXT_PUBLIC_API_URL', false, 'API configurada não respondeu ao health check; pode estar desligada'); }
}
const checks = await Promise.allSettled([database('DATABASE_URL'), database('DIRECT_URL'), firebase(), imagekit()]);
for (const [index, check] of checks.entries()) {
  if (check.status === 'rejected') report(['DATABASE_URL', 'DIRECT_URL', 'Firebase', 'ImageKit'][index], false, 'consulta interrompida; detalhes suprimidos para proteger credenciais');
}
console.log(`\nResultado: ${failures} falha(s). Nenhum valor de credencial foi exibido. FCM, upload e configuração de produção externa não foram testados.`);
process.exitCode = failures ? 1 : 0;
