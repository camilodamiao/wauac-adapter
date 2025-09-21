import { Router, Request, Response, NextFunction } from 'express';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { ZApiWebhookHandler } from '../adapters/zapi/webhook.handler';

/**
 * @anchor webhook.routes:router
 * @description Router principal para todas as rotas de webhook
 * @flow Define rotas -> Aplica middlewares -> Roteia para handlers específicos
 * @dependencies Express Router, Rate limiter, Error handler
 * @validation Rate limiting aplicado, validação de payload por rota
 * @errors Rate limit exceeded, Validation errors, Handler errors
 * @todo Implementar autenticação webhook, logging estruturado, métricas
 */
const router = Router();

// 🏗️ INIT: Inicializa handler específico da Z-API
const zapiHandler = new ZApiWebhookHandler();

/**
 * @anchor webhook.routes:WebhookPayload
 * @description Interface para payload genérico de webhook (legacy support)
 * @flow Define estrutura padrão para webhooks não-específicos
 * @dependencies Nenhuma dependência externa
 * @validation event, data, timestamp, source obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Deprecar em favor de interfaces específicas por provedor
 */
interface WebhookPayload {
  event: string;    // 📅 Tipo do evento webhook
  data: any;        // 📦 Dados específicos do evento
  timestamp: string; // ⏰ Timestamp do evento
  source: string;   // 🏷️ Origem do webhook (z-api, chatwoot, etc)
}

/**
 * @anchor webhook.routes:validateWebhookPayload
 * @description Middleware para validação de payload webhook genérico
 * @flow Extrai campos -> Valida tipos -> Lança erros ou continua
 * @dependencies ValidationError, Express middleware
 * @validation event, data, timestamp, source obrigatórios e tipados
 * @errors ValidationError para campos inválidos ou ausentes
 * @todo Implementar validação de schema mais robusta, sanitização
 */
const validateWebhookPayload = (req: Request, res: Response, next: NextFunction): void => {
  const { event, data, timestamp, source } = req.body;

  // ✅ EVENT: Valida evento obrigatório
  if (!event || typeof event !== 'string') {
    throw new ValidationError('Event is required and must be a string');
  }

  // ✅ DATA: Valida dados obrigatórios
  if (!data) {
    throw new ValidationError('Data is required');
  }

  // ✅ TIMESTAMP: Valida timestamp obrigatório
  if (!timestamp || typeof timestamp !== 'string') {
    throw new ValidationError('Timestamp is required and must be a string');
  }

  // ✅ SOURCE: Valida origem obrigatória
  if (!source || typeof source !== 'string') {
    throw new ValidationError('Source is required and must be a string');
  }

  next(); // ➡️ Continua para próximo middleware
};

/**
 * @anchor webhook.routes:testJson
 * @description Endpoint de debug para testar parsing de JSON
 * @flow Loga headers/body -> Analisa estrutura -> Retorna diagnóstico
 * @dependencies Console logging, Express request/response
 * @validation Nenhuma validação específica
 * @errors Nenhum erro específico
 * @todo Remover em produção, implementar debug middleware dedicado
 */
router.post('/test-json', (req: Request, res: Response) => {
  // 🔍 DEBUG: Console logs para diagnóstico
  console.log('Test endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));

  // 📊 RESPONSE: Retorna informações de diagnóstico
  res.json({
    received: req.body,
    bodyType: typeof req.body,
    hasInstanceId: 'instanceId' in (req.body || {}),
    instanceIdValue: req.body?.instanceId
  });
});

/**
 * @anchor webhook.routes:zapiRoutes
 * @description Rotas específicas para webhooks da Z-API
 * @flow Rate limiting -> Handler específico -> Resposta padronizada
 * @dependencies webhookRateLimiter, zapiHandler
 * @validation Rate limiting + validação específica no handler
 * @errors Rate limit, validation errors, processing errors
 * @todo Adicionar autenticação Z-API, webhook signature validation
 */
// 📨 Z-API: Rota para mensagens recebidas
router.post('/zapi/message-received', webhookRateLimiter, zapiHandler.handleMessageReceived);
// 📋 Z-API: Rota para status de mensagens
router.post('/zapi/message-status', webhookRateLimiter, zapiHandler.handleMessageStatus);

/**
 * @anchor webhook.routes:chatwootMessage
 * @description Rota para webhooks de mensagens saintes do Chatwoot
 * @flow Rate limiting -> Loga recebimento -> TODO: Processa -> Responde
 * @dependencies webhookRateLimiter, Winston logger
 * @validation Rate limiting aplicado
 * @errors Rate limit, processing errors, network errors
 * @todo Implementar processamento real Chatwoot -> Z-API, validação de assinatura
 */
router.post('/chatwoot/message', webhookRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔍 DEBUG: Captura correlationId para rastreamento
    const correlationId = req.correlationId;

    // 📝 LOG: Registra recebimento de webhook Chatwoot
    logger.info('Chatwoot webhook received', {
      correlationId,
      body: req.body,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type')
      }
    });

    // 🚧 TODO: Implementar processamento Chatwoot -> Z-API
    logger.info('Chatwoot webhook processing not yet implemented', { correlationId });

    // ✅ RESPONSE: Confirma recebimento (temporário)
    res.status(200).json({
      success: true,
      message: 'Chatwoot webhook received (processing not implemented)',
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // ⚠️ ERROR: Loga erro e repassa para middleware
    logger.error('Error handling Chatwoot webhook', {
      correlationId: req.correlationId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

/**
 * @anchor webhook.routes:queueStatus
 * @description Endpoint para consulta de estatísticas da fila Z-API
 * @flow Chama getQueueStats -> Loga resultado -> Retorna estatísticas
 * @dependencies zapiHandler.getQueueStats(), Winston logger
 * @validation Nenhuma validação específica (GET endpoint)
 * @errors Queue unavailable, Redis connection errors
 * @todo Adicionar autenticação, cache das estatísticas, métricas históricas
 */
router.get('/zapi/queue-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔍 DEBUG: Captura correlationId
    const correlationId = req.correlationId;
    // 📊 STATS: Obtém estatísticas da fila
    const stats = await zapiHandler.getQueueStats();

    // 📝 LOG: Registra consulta de estatísticas
    logger.info('Queue status requested', { correlationId, stats });

    // ✅ RESPONSE: Retorna estatísticas formatadas
    res.status(200).json({
      success: true,
      data: stats,
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // ⚠️ ERROR: Loga erro na consulta
    logger.error('Error getting queue status', {
      correlationId: req.correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * @anchor webhook.routes:genericWebhook
 * @description Handler genérico para webhooks legacy (suporte retroativo)
 * @flow Rate limiting -> Validação -> Switch por evento -> Loga -> Responde
 * @dependencies webhookRateLimiter, validateWebhookPayload, Winston logger
 * @validation Rate limiting + validação de payload genérico
 * @errors Rate limit, validation errors, unknown event types
 * @todo Deprecar em favor de handlers específicos, adicionar router por source
 */
// 🔄 LEGACY: Aplica rate limiting para rotas genéricas
router.use(webhookRateLimiter);

router.post('/', validateWebhookPayload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 📦 PAYLOAD: Extrai payload validado
    const payload: WebhookPayload = req.body;
    const correlationId = req.correlationId;

    // 📝 LOG: Registra recebimento de webhook genérico
    logger.info('Webhook received', {
      correlationId,
      event: payload.event,
      source: payload.source,
      timestamp: payload.timestamp
    });

    // 🔄 ROUTER: Processa baseado no tipo de evento
    switch (payload.event) {
      case 'message.received':
        // 📨 MESSAGE: Mensagem recebida
        logger.info('Processing message received event', { correlationId });
        break;

      case 'status.update':
        // 📋 STATUS: Atualização de status
        logger.info('Processing status update event', { correlationId });
        break;

      case 'delivery.confirmation':
        // ✅ DELIVERY: Confirmação de entrega
        logger.info('Processing delivery confirmation event', { correlationId });
        break;

      default:
        // ⚠️ UNKNOWN: Evento desconhecido
        logger.warn('Unknown webhook event type', {
          correlationId,
          event: payload.event
        });
    }

    // ✅ RESPONSE: Confirma processamento
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      correlationId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error); // 🚀 Repassa erro para middleware
  }
});

/**
 * @anchor webhook.routes:healthCheck
 * @description Endpoint de health check para verificar funcionamento
 * @flow Responde imediatamente com status OK e metadados
 * @dependencies Express request/response, correlationId middleware
 * @validation Nenhuma validação (endpoint público)
 * @errors Nenhum erro específico
 * @todo Adicionar checks de dependências (Redis, Chatwoot), métricas de uptime
 */
router.get('/test', (req: Request, res: Response) => {
  // ✅ HEALTH: Resposta simples de health check
  res.status(200).json({
    message: 'Webhook endpoint is working',
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  });
});

export default router;