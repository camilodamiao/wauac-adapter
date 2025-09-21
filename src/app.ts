import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { correlationIdMiddleware } from './middleware/correlationId';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import webhookRoutes from './routes/webhook';
import healthRoutes from './routes/health';

export class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.setupSecurity();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupSecurity(): void {
    this.express.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    this.express.use(cors({
      origin: function (origin, callback) {
        // Allow Z-API and other webhook origins
        const allowedOrigins = [
          config.chatwoot.url,
          'http://localhost:3000',
          'http://localhost:3333',
          'https://api.z-api.io'
        ];

        // Allow requests without origin (e.g., mobile apps, Postman, webhook services)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          // For webhook debugging, log rejected origins
          console.log('CORS rejected origin:', origin);
          callback(null, true); // Allow all origins for webhook testing
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
    }));

    this.express.disable('x-powered-by');
    this.express.set('trust proxy', 1);
  }

  private setupMiddleware(): void {
    this.express.use(correlationIdMiddleware);
    this.express.use(rateLimitMiddleware);

    // JSON parsing middleware (removed problematic raw middleware)
    this.express.use(express.json({
      limit: '10mb',
      strict: true
    }));

    this.express.use(express.urlencoded({
      extended: true,
      limit: '1mb'
    }));

    this.express.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string;
      logger.info('Request received', {
        method: req.method,
        url: req.url,
        correlationId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.express.use('/health', healthRoutes);
    this.express.use('/webhook', webhookRoutes);

    this.express.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'WAUAC - WhatsApp Universal Adapter for Chatwoot',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    this.express.all('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    this.express.use(errorHandler);

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  }

  public listen(): void {
    const port = config.server.port;

    this.express.listen(port, () => {
      logger.info(`WAUAC server started successfully`, {
        port,
        environment: config.server.nodeEnv,
        timestamp: new Date().toISOString()
      });
    });
  }
}

const app = new App();
app.listen();

export default App;