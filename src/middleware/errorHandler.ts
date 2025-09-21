import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const correlationId = req.headers['x-correlation-id'] as string || 'unknown';

  logger.error('Error occurred', {
    correlationId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  const isAppError = 'statusCode' in error && 'isOperational' in error;
  const statusCode = isAppError ? (error as AppError).statusCode : 500;
  const message = isAppError ? error.message : 'Internal server error';

  const errorResponse = {
    error: true,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  if (process.env['NODE_ENV'] === 'development' && !isAppError) {
    (errorResponse as any).stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};