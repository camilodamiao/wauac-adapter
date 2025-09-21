import winston from 'winston';
import path from 'path';
import { config } from '../config/environment';

// Removed sensitiveKeys array - now using inline checks in sanitizeData function

function sanitizeData(data: any, seen = new WeakSet()): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Evitar loops infinitos com objetos circulares
  if (typeof data === 'object' && data !== null) {
    if (seen.has(data)) {
      return '[Circular Reference]';
    }
    seen.add(data);
  }

  if (typeof data === 'string') {
    // Mascarar dados sensíveis
    if (data.includes('Bearer ') || data.includes('api_key')) {
      return data.substring(0, 10) + '***';
    }
    // Mascarar telefones parcialmente
    if (/^\+?\d{10,}$/.test(data)) {
      return data.substring(0, 6) + '***';
    }
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, seen));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Pular propriedades que causam problemas
        if (key === '_req' || key === '_res' || key === 'socket' || key === 'client') {
          sanitized[key] = '[Omitted]';
          continue;
        }

        if (key === 'password' || key === 'token' || key === 'api_key') {
          sanitized[key] = '***';
        } else {
          sanitized[key] = sanitizeData(data[key], seen);
        }
      }
    }
    return sanitized;
  }

  return data;
}

// const _customFormat = winston.format.combine(
//   winston.format.timestamp({
//     format: 'YYYY-MM-DD HH:mm:ss.SSS'
//   }),
//   winston.format.errors({ stack: true }),
//   winston.format.printf((info) => {
//     const { timestamp, level, message, ...meta } = info;

//     const sanitizedMeta = Object.keys(meta).length > 0 ? sanitizeData(meta) : undefined;
//
//     let logEntry = `${timestamp} [${level.toUpperCase()}]: ${message}`;
//
//     if (sanitizedMeta && Object.keys(sanitizedMeta).length > 0) {
//       logEntry += ` ${JSON.stringify(sanitizedMeta)}`;
//     }
//
//     return logEntry;
//   })
// );

const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    const sanitizedMeta = sanitizeData(meta);

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedMeta
    });
  })
);

const colorFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    const sanitizedMeta = Object.keys(meta).length > 0 ? sanitizeData(meta) : undefined;

    let logEntry = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (sanitizedMeta && Object.keys(sanitizedMeta).length > 0) {
      logEntry += ` ${JSON.stringify(sanitizedMeta, null, 2)}`;
    }

    return logEntry;
  })
);

const createDailyRotateFileTransport = (filename: string, level: string) => {
  const DailyRotateFile = require('winston-daily-rotate-file');

  return new DailyRotateFile({
    filename: path.join('logs', `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level,
    format: jsonFormat,
    createSymlink: true,
    symlinkName: `${filename}.log`
  });
};

const transports: winston.transport[] = [];

if (config.server.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: colorFormat
    })
  );
} else {
  transports.push(
    createDailyRotateFileTransport('app', 'info'),
    createDailyRotateFileTransport('error', 'error'),
    new winston.transports.Console({
      level: 'error',
      format: jsonFormat
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

logger.on('error', (error) => {
  console.error('Logger error:', error);
});

export const createContextLogger = (context: string) => {
  return {
    error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
  };
};

export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const correlationId = req.headers['x-correlation-id'];

    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });

  next();
};

export default logger;