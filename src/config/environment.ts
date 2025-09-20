import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  redis: {
    url: string;
  };
  chatwoot: {
    url: string;
    apiKey: string;
    accountId: number;
    inboxId: number;
  };
  zapi: {
    instanceId: string;
    token: string;
    clientToken: string;
    baseUrl: string;
  };
  logging: {
    level: string;
  };
  debug: {
    uiEnabled: boolean;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

function getEnvBoolean(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

export const config: Config = {
  server: {
    port: getEnvNumber('PORT', 3333),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
  },
  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  },
  chatwoot: {
    url: getEnvVar('CHATWOOT_URL'),
    apiKey: getEnvVar('CHATWOOT_API_KEY'),
    accountId: getEnvNumber('CHATWOOT_ACCOUNT_ID'),
    inboxId: getEnvNumber('CHATWOOT_INBOX_ID'),
  },
  zapi: {
    instanceId: getEnvVar('ZAPI_INSTANCE_ID'),
    token: getEnvVar('ZAPI_TOKEN'),
    clientToken: getEnvVar('ZAPI_CLIENT_TOKEN'),
    baseUrl: getEnvVar('ZAPI_BASE_URL', 'https://api.z-api.io'),
  },
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
  },
  debug: {
    uiEnabled: getEnvBoolean('DEBUG_UI_ENABLED', false),
  },
};

export function validateConfig(): void {
  const requiredVars = [
    'CHATWOOT_URL',
    'CHATWOOT_API_KEY',
    'CHATWOOT_ACCOUNT_ID',
    'CHATWOOT_INBOX_ID',
    'ZAPI_INSTANCE_ID',
    'ZAPI_TOKEN',
    'ZAPI_CLIENT_TOKEN',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.server.nodeEnv === 'production') {
    if (config.chatwoot.url.startsWith('http://')) {
      console.warn('Warning: Using HTTP for Chatwoot URL in production is not recommended');
    }
    if (config.zapi.baseUrl.startsWith('http://')) {
      console.warn('Warning: Using HTTP for Z-API URL in production is not recommended');
    }
  }
}

validateConfig();