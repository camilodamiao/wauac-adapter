import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const createRateLimiter = (windowMs: number = 60000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Try again later.',
        correlationId: req.correlationId
      });
    }
  });
};

export const defaultRateLimiter = createRateLimiter();

export const strictRateLimiter = createRateLimiter(15 * 60 * 1000, 50);

export const webhookRateLimiter = createRateLimiter(60 * 1000, 30);