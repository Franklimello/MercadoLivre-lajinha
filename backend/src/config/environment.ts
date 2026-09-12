const REQUIRED_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'FRONTEND_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT',
] as const;

const PLACEHOLDER_PATTERN =
  /(?:^|[-_.:/])(xyz|example|placeholder|replace|changeme|your|xxxxx)(?:$|[-_.:/])/i;

function isTrue(value: unknown) {
  return String(value).toLowerCase() === 'true';
}

function looksLikePlaceholder(value: string) {
  return PLACEHOLDER_PATTERN.test(value) || value.includes('<') || value.includes('>');
}

export function validateEnvironment(input: Record<string, unknown>) {
  const config = { ...input };
  const nodeEnv = String(config.NODE_ENV || 'development');
  const allowDevAuth = isTrue(config.ALLOW_INSECURE_DEV_AUTH);
  const errors: string[] = [];

  if (nodeEnv === 'production' && allowDevAuth) {
    errors.push('ALLOW_INSECURE_DEV_AUTH nunca pode ser true em produção');
  }

  for (const key of REQUIRED_KEYS) {
    const value = String(config[key] || '').trim();
    const canUseDevAuth =
      allowDevAuth &&
      nodeEnv !== 'production' &&
      key.startsWith('FIREBASE_');

    if ((!value || looksLikePlaceholder(value)) && !canUseDevAuth) {
      errors.push(`${key} está ausente ou ainda contém um placeholder`);
    }
  }

  const port = Number(config.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT deve ser um número inteiro entre 1 e 65535');
  }

  const rateLimitMax = Number(config.RATE_LIMIT_MAX || 120);
  const rateLimitWindowMs = Number(config.RATE_LIMIT_WINDOW_MS || 60_000);
  if (!Number.isInteger(rateLimitMax) || rateLimitMax < 1) {
    errors.push('RATE_LIMIT_MAX deve ser um inteiro positivo');
  }
  if (!Number.isInteger(rateLimitWindowMs) || rateLimitWindowMs < 1000) {
    errors.push('RATE_LIMIT_WINDOW_MS deve ser um inteiro de pelo menos 1000');
  }

  for (const key of [
    'DATABASE_URL',
    'DIRECT_URL',
    'FRONTEND_URL',
    'IMAGEKIT_URL_ENDPOINT',
  ]) {
    const value = String(config[key] || '').trim();
    if (!value || looksLikePlaceholder(value)) continue;
    try {
      new URL(value);
    } catch {
      errors.push(`${key} deve ser uma URL válida`);
    }
  }

  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    const value = String(config[key] || '');
    if (value && !looksLikePlaceholder(value) && !value.startsWith('postgresql://')) {
      errors.push(`${key} deve usar o protocolo postgresql`);
    }
  }

  const firebaseKey = String(config.FIREBASE_PRIVATE_KEY || '');
  if (
    !allowDevAuth &&
    firebaseKey &&
    !looksLikePlaceholder(firebaseKey) &&
    !firebaseKey.includes('BEGIN PRIVATE KEY')
  ) {
    errors.push('FIREBASE_PRIVATE_KEY não possui o formato PEM esperado');
  }

  if (errors.length > 0) {
    throw new Error(`Configuração inválida:\n- ${errors.join('\n- ')}`);
  }

  config.NODE_ENV = nodeEnv;
  config.PORT = port;
  config.RATE_LIMIT_MAX = rateLimitMax;
  config.RATE_LIMIT_WINDOW_MS = rateLimitWindowMs;
  config.ALLOW_INSECURE_DEV_AUTH = allowDevAuth;
  return config;
}
