import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  correlationId: string;
  version: string;
  environment: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'unknown';
      responseTime?: number;
      lastCheck: string;
    };
  };
}

const checkServiceHealth = async (serviceName: string): Promise<{ status: 'up' | 'down' | 'unknown'; responseTime?: number }> => {
  const startTime = Date.now();

  try {
    // Add actual service health checks here
    switch (serviceName) {
      case 'database':
        // Simulate database health check
        await new Promise(resolve => setTimeout(resolve, 50));
        return { status: 'up', responseTime: Date.now() - startTime };

      case 'whatsapp_api':
        // Simulate WhatsApp API health check
        await new Promise(resolve => setTimeout(resolve, 100));
        return { status: 'up', responseTime: Date.now() - startTime };

      default:
        return { status: 'unknown' };
    }
  } catch (error) {
    logger.error(`Health check failed for ${serviceName}`, { error: error instanceof Error ? error.message : String(error) });
    return { status: 'down', responseTime: Date.now() - startTime };
  }
};

router.get('/', async (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string || 'no-id';
  const timestamp = new Date().toISOString();

  try {
    const services = {
      database: await checkServiceHealth('database'),
      whatsapp_api: await checkServiceHealth('whatsapp_api')
    };

    const allServicesUp = Object.values(services).every(service => service.status === 'up');
    const anyServiceDown = Object.values(services).some(service => service.status === 'down');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (anyServiceDown) {
      overallStatus = 'unhealthy';
    } else if (!allServicesUp) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp,
      uptime: process.uptime(),
      correlationId,
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      services: Object.fromEntries(
        Object.entries(services).map(([name, health]) => {
          const serviceResult: { status: 'up' | 'down' | 'unknown'; responseTime?: number; lastCheck: string } = {
            status: health.status,
            lastCheck: timestamp
          };
          if (health.responseTime !== undefined) {
            serviceResult.responseTime = health.responseTime;
          }
          return [name, serviceResult];
        })
      )
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    logger.info('Health check performed', {
      correlationId,
      status: overallStatus,
      services: Object.keys(services)
    });

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', {
      correlationId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp,
      correlationId,
      error: 'Health check failed',
      uptime: process.uptime()
    });
  }
});

router.get('/liveness', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    correlationId: req.headers['x-correlation-id'] as string || 'no-id'
  });
});

router.get('/readiness', async (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string || 'no-id';

  try {
    const criticalServices = await Promise.all([
      checkServiceHealth('database'),
      checkServiceHealth('whatsapp_api')
    ]);

    const isReady = criticalServices.every(service => service.status === 'up');

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      correlationId,
      services: {
        database: criticalServices[0],
        whatsapp_api: criticalServices[1]
      }
    });

  } catch (error) {
    logger.error('Readiness check failed', {
      correlationId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      correlationId,
      error: 'Readiness check failed'
    });
  }
});

export default router;