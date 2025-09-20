import { Router, Request, Response, NextFunction } from 'express';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  source: string;
}

const validateWebhookPayload = (req: Request, res: Response, next: NextFunction): void => {
  const { event, data, timestamp, source } = req.body;

  if (!event || typeof event !== 'string') {
    throw new ValidationError('Event is required and must be a string');
  }

  if (!data) {
    throw new ValidationError('Data is required');
  }

  if (!timestamp || typeof timestamp !== 'string') {
    throw new ValidationError('Timestamp is required and must be a string');
  }

  if (!source || typeof source !== 'string') {
    throw new ValidationError('Source is required and must be a string');
  }

  next();
};

router.use(webhookRateLimiter);

router.post('/', validateWebhookPayload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: WebhookPayload = req.body;
    const correlationId = req.correlationId;

    logger.info('Webhook received', {
      correlationId,
      event: payload.event,
      source: payload.source,
      timestamp: payload.timestamp
    });

    // Process webhook based on event type
    switch (payload.event) {
      case 'message.received':
        logger.info('Processing message received event', { correlationId });
        break;

      case 'status.update':
        logger.info('Processing status update event', { correlationId });
        break;

      case 'delivery.confirmation':
        logger.info('Processing delivery confirmation event', { correlationId });
        break;

      default:
        logger.warn('Unknown webhook event type', {
          correlationId,
          event: payload.event
        });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

router.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Webhook endpoint is working',
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  });
});

export default router;