import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import Queue from 'bull';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../middleware/errorHandler';
import {
  ZApiMessage,
  ZApiStatus
} from './types';
import { ChatwootService } from '../../services/chatwoot.service';
import { ZApiTranslator, TranslationContext } from './translator';

/**
 * @anchor webhook.handler:messageReceivedSchema
 * @description Schema Joi para validação de mensagens recebidas da Z-API
 * @flow Valida estrutura completa do webhook incluindo todos tipos de mídia
 * @dependencies Joi para validação de schema
 * @validation Campos obrigatórios: instanceId, messageId, phone, momment
 * @errors Retorna detalhes específicos do campo inválido
 * @todo Adicionar validação de tamanho máximo para arquivos
 */
const messageReceivedSchema = Joi.object({
  waitingMessage: Joi.boolean().optional(),
  isGroup: Joi.boolean().optional(),
  isNewsletter: Joi.boolean().optional(),
  instanceId: Joi.string().required(),
  messageId: Joi.string().required(),
  phone: Joi.string().required(),
  fromMe: Joi.boolean().default(false),
  momment: Joi.number().required(),
  status: Joi.string().optional(),
  chatName: Joi.string().optional(),
  senderName: Joi.string().optional(),
  senderPhoto: Joi.string().uri().optional(),
  type: Joi.string().default('ReceivedCallback'),

  // 💬 TEXT: Mensagem de texto simples
  text: Joi.object({
    message: Joi.string().required()
  }).optional(),

  // 🖼️ IMAGE: Mensagem com imagem e caption opcional
  image: Joi.object({
    caption: Joi.string().optional(),
    imageUrl: Joi.string().uri().required(),
    thumbnailUrl: Joi.string().uri().optional(),
    mimeType: Joi.string().optional()
  }).optional(),

  // 🎵 AUDIO: Mensagem de áudio (incluindo PTT)
  audio: Joi.object({
    audioUrl: Joi.string().uri().required(),
    mimeType: Joi.string().optional(),
    ptt: Joi.boolean().optional()
  }).optional(),

  // 🎥 VIDEO: Mensagem de vídeo com caption opcional
  video: Joi.object({
    caption: Joi.string().optional(),
    videoUrl: Joi.string().uri().required(),
    mimeType: Joi.string().optional()
  }).optional(),

  // 📄 DOCUMENT: Arquivo/documento anexado
  document: Joi.object({
    documentUrl: Joi.string().uri().required(),
    fileName: Joi.string().optional(),
    mimeType: Joi.string().optional(),
    title: Joi.string().optional()
  }).optional(),

  // 📍 LOCATION: Localização geográfica
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    description: Joi.string().optional(),
    address: Joi.string().optional()
  }).optional()
});

/**
 * @anchor webhook.handler:messageStatusSchema
 * @description Schema Joi para validação de status de mensagens da Z-API
 * @flow Valida webhooks de mudança de status (enviado, entregue, lido)
 * @dependencies Joi para validação de schema
 * @validation Campos obrigatórios: messageId, instanceId, phone, status, momment
 * @errors Retorna detalhes específicos do campo inválido
 * @todo Adicionar enum para validar status válidos
 */
const messageStatusSchema = Joi.object({
  messageId: Joi.string().required(),
  instanceId: Joi.string().required(),
  phone: Joi.string().required(),
  status: Joi.string().required(),
  momment: Joi.number().required(),
  chatName: Joi.string().optional(),
  senderName: Joi.string().optional(),
  isGroup: Joi.boolean().optional()
});

/**
 * @anchor webhook.handler:ZApiWebhookHandler
 * @description Handler principal para processar webhooks da Z-API
 * @flow Recebe webhook -> Valida formato -> Adiciona na fila -> Retorna 200
 * @dependencies Bull (Redis), Joi, Winston Logger, ErrorHandler
 * @validation Schema Joi para cada tipo de webhook (mensagem/status)
 * @errors Redis indisponível, Formato inválido, Timeout de processamento
 * @todo Implementar retry com backoff exponencial, adicionar métricas de performance
 */
export class ZApiWebhookHandler {
  private messageQueue: Queue.Queue;
  private chatwootService: ChatwootService;
  private translator: ZApiTranslator;
  private contactCache = new Map<string, number>();
  private conversationCache = new Map<string, number>();

  /**
   * @anchor webhook.handler:constructor
   * @description Inicializa handler com conexão Redis e configuração de fila
   * @flow Lê env vars -> Configura Redis -> Cria fila Bull -> Configura retry
   * @dependencies Redis server ativo, variáveis de ambiente válidas
   * @validation Valida porta Redis como número, configura fallbacks
   * @errors Redis connection failed, Invalid port number
   * @todo Adicionar health check do Redis, configurar cluster mode
   */
  constructor() {
    // 🔧 CONFIG: Lê configurações Redis das variáveis de ambiente
    const redisHost = process.env['REDIS_HOST'] || 'localhost';
    const redisPort = parseInt(process.env['REDIS_PORT'] || '6379');
    const redisPassword = process.env['REDIS_PASSWORD'];

    // 🚀 QUEUE: Inicializa fila Bull com configurações de retry
    this.messageQueue = new Queue('z-api-messages', redisPassword ?
      `redis://:${redisPassword}@${redisHost}:${redisPort}` :
      `redis://${redisHost}:${redisPort}`, {
      defaultJobOptions: {
        removeOnComplete: 10,    // 🧹 Manter apenas 10 jobs completos
        removeOnFail: 25,        // 🧹 Manter 25 jobs falhados para debug
        attempts: 3,             // 🔄 Máximo 3 tentativas por job
        backoff: {
          type: 'exponential',   // 📈 Backoff exponencial entre tentativas
          delay: 2000,           // ⏱️ Delay inicial de 2 segundos
        },
      }
    });

    // 🔧 SERVICES: Inicializa serviços integrados
    this.chatwootService = new ChatwootService();
    this.translator = new ZApiTranslator();

    // 📝 LOG: Registra inicialização bem-sucedida
    logger.info('ZApiWebhookHandler initialized', {
      redisHost,
      redisPort,
      chatwootIntegration: true
    });
  }

  /**
   * @anchor webhook.handler:handleMessageReceived
   * @description Processa webhook de mensagem recebida da Z-API
   * @flow Valida payload -> Loga recebimento -> Filtra bot -> Enfileira -> Responde 200
   * @dependencies messageReceivedSchema, Redis queue, correlationId middleware
   * @validation Schema Joi com todos tipos de mídia suportados
   * @errors Payload inválido (400), Redis indisponível (500), Validation error
   * @todo Adicionar rate limiting, implementar deduplicação de mensagens
   */
  public handleMessageReceived = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      // 🔍 DEBUG: Captura correlationId para rastreamento de requisição
      const correlationId = req.headers['x-correlation-id'] as string || 'no-id';

      // 📝 LOG: Registra recebimento do webhook para auditoria
      logger.info('Z-API message received webhook triggered', {
        correlationId,
        body: req.body,
        headers: {
          'user-agent': req.get('User-Agent'),
          'content-type': req.get('Content-Type')
        }
      });

      // ✅ VALIDAÇÃO: Aplica schema Joi no payload recebido
      const { error, value } = messageReceivedSchema.validate(req.body);
      if (error) {
        throw new ValidationError(`Invalid Z-API message: ${error.details.map(d => d.message).join(', ')}`);
      }

      const message: ZApiMessage = value;

      // 🤖 FILTRO: Ignora mensagens enviadas pelo próprio bot
      if (message.fromMe) {
        logger.info('Ignoring message sent by bot', {
          correlationId,
          messageId: message.messageId,
          phone: message.phone
        });

        res.status(200).json({
          success: true,
          message: 'Message from bot ignored',
          correlationId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 🔄 INTEGRATION: Processamento REAL com Chatwoot
      await this.processMessageWithChatwoot(message, correlationId);

      // ✅ RESPONSE: Confirma processamento bem-sucedido
      res.status(200).json({
        status: 'accepted',
        correlationId,
        processed: true,
        messageId: message.messageId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      // ⚠️ ERROR: Loga erro completo
      const correlationId = req.headers['x-correlation-id'] as string || 'no-id';
      logger.error('❌ Erro ao processar webhook', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // 🚨 RESPONSE: Retorna erro 500 com detalhes
      res.status(500).json({
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId
      });
    }
  };

  /**
   * @anchor webhook.handler:processMessageWithChatwoot
   * @description Processa mensagem Z-API com integração real ao Chatwoot
   * @flow Busca/cria contato → Busca/cria conversa → Traduz mensagem → Envia ao Chatwoot
   * @dependencies ChatwootService, ZApiTranslator, cache interno
   * @validation message e correlationId obrigatórios
   * @errors Contact creation failed, conversation failed, message send failed
   * @todo Implementar retry automático, fallback para fila, cache distribuído
   */
  private async processMessageWithChatwoot(message: ZApiMessage, correlationId: string): Promise<void> {
    try {
      // 1️⃣ CONTACT: Buscar ou criar contato
      let contactId = this.contactCache.get(message.phone);
      if (!contactId) {
        const contact = await this.chatwootService.findOrCreateContact(
          message.phone,
          message.senderName || message.chatName
        );
        contactId = contact.id;
        this.contactCache.set(message.phone, contactId);

        logger.info('👤 Contato processado', {
          correlationId,
          contactId,
          phone: message.phone.substring(0, 5) + '***',
          cached: false
        });
      } else {
        logger.debug('👤 Contato do cache', {
          correlationId,
          contactId,
          phone: message.phone.substring(0, 5) + '***',
          cached: true
        });
      }

      // 2️⃣ CONVERSATION: Buscar ou criar conversa
      let conversationId = this.conversationCache.get(message.phone);
      if (!conversationId) {
        const conversation = await this.chatwootService.findOrCreateConversation(contactId);
        conversationId = conversation.id;
        this.conversationCache.set(message.phone, conversationId);

        logger.info('💬 Conversa processada', {
          correlationId,
          conversationId,
          contactId,
          cached: false
        });
      } else {
        logger.debug('💬 Conversa do cache', {
          correlationId,
          conversationId,
          contactId,
          cached: true
        });
      }

      // 3️⃣ TRANSLATE: Traduzir mensagem Z-API para Chatwoot
      const translationContext: TranslationContext = {
        correlationId,
        direction: 'zapi-to-chatwoot',
        instanceId: message.instanceId,
        conversationId
      };

      const chatwootMessage = this.translator.translateZApiToChatwoot(message, translationContext);

      logger.debug('🔄 Mensagem traduzida', {
        correlationId,
        messageType: chatwootMessage.message_type,
        contentType: chatwootMessage.content_type,
        hasAttachments: !!(chatwootMessage.attachments?.length)
      });

      // 4️⃣ SEND: Enviar mensagem para Chatwoot
      await this.chatwootService.sendMessage(
        conversationId,
        chatwootMessage.content,
        chatwootMessage.message_type
      );

      // ✅ SUCCESS: Loga processamento bem-sucedido
      logger.info('✉️ Mensagem processada com sucesso no Chatwoot', {
        correlationId,
        messageId: message.messageId,
        contactId,
        conversationId,
        phone: message.phone.substring(0, 5) + '***'
      });

    } catch (error) {
      // ⚠️ ERROR: Loga erro detalhado do processamento
      logger.error('❌ Erro no processamento com Chatwoot', {
        correlationId,
        messageId: message.messageId,
        phone: message.phone.substring(0, 5) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error; // 🚨 Repassa erro para handleMessageReceived
    }
  }

  /**
   * @anchor webhook.handler:handleMessageStatus
   * @description Processa webhook de mudança de status de mensagem da Z-API
   * @flow Valida payload -> Loga status -> Enfileira com delay -> Responde 200
   * @dependencies messageStatusSchema, Redis queue, correlationId middleware
   * @validation Schema Joi para campos de status obrigatórios
   * @errors Payload inválido (400), Redis indisponível (500), Validation error
   * @todo Adicionar filtro para status duplicados, implementar batch processing
   */
  public handleMessageStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 🔍 DEBUG: Captura correlationId para rastreamento
      const correlationId = req.headers['x-correlation-id'] as string || 'no-id';

      // 📝 LOG: Registra recebimento de webhook de status
      logger.info('Z-API message status webhook triggered', {
        correlationId,
        body: req.body
      });

      // ✅ VALIDAÇÃO: Aplica schema Joi específico para status
      const { error, value } = messageStatusSchema.validate(req.body);
      if (error) {
        throw new ValidationError(`Invalid Z-API status: ${error.details.map(d => d.message).join(', ')}`);
      }

      const status: ZApiStatus = value;

      // 📦 PAYLOAD: Prepara dados de status para fila
      const jobData = {
        correlationId,
        status,
        receivedAt: new Date().toISOString(),
        type: 'message_status'
      };

      // 🚀 QUEUE: Adiciona job com prioridade menor e delay
      const job = await this.messageQueue.add('process-status', jobData, {
        priority: 3,      // 📊 Prioridade baixa (status menos crítico que mensagens)
        delay: 1000       // ⏱️ Delay de 1s para agrupar status sequenciais
      });

      // 📊 METRICS: Loga estatísticas do job de status
      logger.info('Status update queued for processing', {
        correlationId,
        jobId: job.id,
        messageId: status.messageId,
        phone: status.phone,
        status: status.status
      });

      // ✅ RESPONSE: Confirma recebimento do status
      res.status(200).json({
        success: true,
        message: 'Status update received and queued for processing',
        correlationId,
        jobId: job.id,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      // ⚠️ ERROR: Loga erro de status e repassa para middleware
      logger.error('Error handling Z-API message status', {
        correlationId: req.headers['x-correlation-id'] as string || 'no-id',
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  };

  /**
   * @anchor webhook.handler:getQueueStats
   * @description Retorna estatísticas detalhadas da fila de mensagens
   * @flow Consulta Redis -> Conta jobs por status -> Calcula total -> Retorna stats
   * @dependencies Redis connection ativa, Bull queue funcionando
   * @validation Nenhuma validação específica necessária
   * @errors Redis timeout, Connection failed, Permission denied
   * @todo Adicionar métricas de performance, tempo médio de processamento
   */
  public getQueueStats = async (): Promise<any> => {
    try {
      // 📊 METRICS: Consulta contadores de jobs por status
      const waiting = await this.messageQueue.getWaiting();    // ⏳ Jobs aguardando processamento
      const active = await this.messageQueue.getActive();      // 🔄 Jobs sendo processados
      const completed = await this.messageQueue.getCompleted(); // ✅ Jobs finalizados com sucesso
      const failed = await this.messageQueue.getFailed();      // ❌ Jobs que falharam

      // 🧮 CALC: Calcula estatísticas consolidadas
      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error: any) {
      // ⚠️ ERROR: Loga erro de consulta de estatísticas
      logger.error('Error getting queue stats', { error: error.message });
      throw error;
    }
  };
}