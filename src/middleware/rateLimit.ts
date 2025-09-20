import rateLimit from 'express-rate-limit';

// Configuração simples sem keyGenerator customizado
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // limite de 100 requests
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Export default para compatibilidade
export default rateLimitMiddleware;