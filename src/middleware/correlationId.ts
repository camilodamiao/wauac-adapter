import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.get('X-Correlation-ID') || uuidv4();

  req.correlationId = correlationId;
  res.set('X-Correlation-ID', correlationId);

  next();
};