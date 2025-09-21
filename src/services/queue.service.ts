import Queue, { Job, JobOptions } from 'bull';
import { logger } from '../utils/logger';
import { ChatwootService } from './chatwoot.service';
import { CacheService } from './cache.service';
import { ZApiTranslator, TranslationContext } from '../adapters/zapi/translator';
import {
  ZApiWebhookPayload,
  ZApiMessage,
  ZApiStatus,
  ZApiEventType,
  MappingData
} from '../adapters/zapi/types';

export interface QueueJobData {
  correlationId: string;
  payload: ZApiWebhookPayload;
  receivedAt: string;
  type: 'message_received' | 'message_status';
}

export interface ProcessingResult {
  success: boolean;
  messageId?: string;
  conversationId?: number;
  contactId?: number;
  error?: string;
  processingTime: number;
}

export class QueueService {
  private messageQueue: Queue.Queue;
  private chatwootService: ChatwootService;
  private cacheService: CacheService;
  private translator: ZApiTranslator;

  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    this.messageQueue = new Queue('z-api-messages', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 20,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    });

    this.chatwootService = new ChatwootService();
    this.cacheService = new CacheService();
    this.translator = new ZApiTranslator();

    this.setupProcessors();
    this.setupEventHandlers();

    logger.info('QueueService initialized', {
      redisHost: redisConfig.host,
      redisPort: redisConfig.port
    });
  }

  private setupProcessors(): void {
    // Message processor
    this.messageQueue.process('process-message', 5, this.processMessage.bind(this));

    // Status processor
    this.messageQueue.process('process-status', 3, this.processStatus.bind(this));

    logger.info('Queue processors setup completed', {
      messageWorkers: 5,
      statusWorkers: 3
    });
  }

  private setupEventHandlers(): void {
    this.messageQueue.on('completed', (job: Job, result: ProcessingResult) => {
      logger.info('Job completed successfully', {
        jobId: job.id,
        type: job.name,
        correlationId: job.data.correlationId,
        processingTime: result.processingTime,
        messageId: result.messageId,
        conversationId: result.conversationId
      });
    });

    this.messageQueue.on('failed', (job: Job, error: Error) => {
      logger.error('Job failed', {
        jobId: job.id,
        type: job.name,
        correlationId: job.data.correlationId,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.message,
        stack: error.stack
      });
    });

    this.messageQueue.on('stalled', (job: Job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        type: job.name,
        correlationId: job.data.correlationId
      });
    });

    this.messageQueue.on('error', (error: Error) => {
      logger.error('Queue error', {
        error: error.message,
        stack: error.stack
      });
    });

    logger.info('Queue event handlers setup completed');
  }

  private async processMessage(job: Job<QueueJobData>): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { correlationId, payload } = job.data;

    try {
      logger.info('Processing message job', {
        jobId: job.id,
        correlationId,
        type: job.data.type
      });

      if (payload.event !== ZApiEventType.MESSAGE_RECEIVED) {
        throw new Error('Invalid event type for message processor');
      }

      const zapiMessage = payload.data as ZApiMessage;

      // Extract phone number and sender info
      const phone = this.translator.extractPhoneNumber(zapiMessage);
      const senderName = this.translator.extractSenderName(zapiMessage);

      logger.debug('Processing message details', {
        correlationId,
        messageId: zapiMessage.messageId,
        phone: phone.substring(0, 5) + '***',
        messageType: zapiMessage.type,
        isGroup: zapiMessage.isGroup,
        senderName
      });

      // Step 1: Find or create contact
      const contact = await this.chatwootService.findOrCreateContact(
        phone,
        senderName,
        correlationId
      );

      // Step 2: Find or create conversation
      const conversation = await this.chatwootService.findOrCreateConversation(
        contact.id,
        undefined,
        correlationId
      );

      // Step 3: Translate message format
      const translationContext: TranslationContext = {
        correlationId,
        direction: 'zapi-to-chatwoot',
        instanceId: zapiMessage.instanceId,
        conversationId: conversation.id
      };

      const chatwootMessageData = this.translator.translateZApiToChatwoot(
        zapiMessage,
        translationContext
      );

      // Step 4: Send message to Chatwoot
      const chatwootMessage = await this.chatwootService.sendMessage(
        conversation.id,
        chatwootMessageData,
        correlationId
      );

      // Step 5: Update cache
      const mappingData: MappingData = {
        chatwootContactId: contact.id,
        chatwootConversationId: conversation.id,
        zapiPhone: phone,
        contactName: senderName,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.cacheService.setMapping(phone, mappingData, undefined, correlationId);

      const processingTime = Date.now() - startTime;

      logger.info('Message processed successfully', {
        correlationId,
        messageId: zapiMessage.messageId,
        chatwootMessageId: chatwootMessage.id,
        contactId: contact.id,
        conversationId: conversation.id,
        processingTime
      });

      return {
        success: true,
        messageId: chatwootMessage.id.toString(),
        conversationId: conversation.id,
        contactId: contact.id,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Error processing message', {
        correlationId,
        error: error.message,
        stack: error.stack,
        processingTime
      });

      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  private async processStatus(job: Job<QueueJobData>): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { correlationId, payload } = job.data;

    try {
      logger.info('Processing status job', {
        jobId: job.id,
        correlationId,
        type: job.data.type
      });

      if (payload.event !== ZApiEventType.MESSAGE_STATUS) {
        throw new Error('Invalid event type for status processor');
      }

      const zapiStatus = payload.data as ZApiStatus;

      logger.debug('Processing status details', {
        correlationId,
        messageId: zapiStatus.messageId,
        phone: zapiStatus.phone.substring(0, 5) + '***',
        status: zapiStatus.status
      });

      // TODO: Implement status update logic
      // This could include:
      // 1. Find the corresponding Chatwoot message
      // 2. Update message status if supported
      // 3. Log status change for analytics

      logger.info('Status update logged', {
        correlationId,
        messageId: zapiStatus.messageId,
        status: zapiStatus.status,
        note: 'Status processing not fully implemented'
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Error processing status', {
        correlationId,
        error: error.message,
        stack: error.stack,
        processingTime
      });

      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  }

  public async addMessageJob(
    data: QueueJobData,
    options?: JobOptions
  ): Promise<Job<QueueJobData>> {
    try {
      const jobOptions: JobOptions = {
        priority: 10,
        delay: 0,
        ...options
      };

      const job = await this.messageQueue.add('process-message', data, jobOptions);

      logger.debug('Message job added to queue', {
        jobId: job.id,
        correlationId: data.correlationId,
        priority: jobOptions.priority,
        delay: jobOptions.delay
      });

      return job;

    } catch (error) {
      logger.error('Error adding message job to queue', {
        correlationId: data.correlationId,
        error: error.message
      });
      throw error;
    }
  }

  public async addStatusJob(
    data: QueueJobData,
    options?: JobOptions
  ): Promise<Job<QueueJobData>> {
    try {
      const jobOptions: JobOptions = {
        priority: 5,
        delay: 1000,
        ...options
      };

      const job = await this.messageQueue.add('process-status', data, jobOptions);

      logger.debug('Status job added to queue', {
        jobId: job.id,
        correlationId: data.correlationId,
        priority: jobOptions.priority,
        delay: jobOptions.delay
      });

      return job;

    } catch (error) {
      logger.error('Error adding status job to queue', {
        correlationId: data.correlationId,
        error: error.message
      });
      throw error;
    }
  }

  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.messageQueue.getWaiting(),
        this.messageQueue.getActive(),
        this.messageQueue.getCompleted(),
        this.messageQueue.getFailed(),
        this.messageQueue.getDelayed(),
        this.messageQueue.getPaused()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length
      };

    } catch (error) {
      logger.error('Error getting queue stats', { error: error.message });
      throw error;
    }
  }

  public async getFailedJobs(limit: number = 10): Promise<Job[]> {
    try {
      return await this.messageQueue.getFailed(0, limit - 1);
    } catch (error) {
      logger.error('Error getting failed jobs', { error: error.message });
      throw error;
    }
  }

  public async retryFailedJob(jobId: string): Promise<void> {
    try {
      const job = await this.messageQueue.getJob(jobId);
      if (job) {
        await job.retry();
        logger.info('Job retried successfully', { jobId });
      } else {
        throw new Error(`Job ${jobId} not found`);
      }
    } catch (error) {
      logger.error('Error retrying job', { jobId, error: error.message });
      throw error;
    }
  }

  public async cleanCompletedJobs(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cleaned = await this.messageQueue.clean(maxAge, 'completed');
      logger.info('Completed jobs cleaned', { count: cleaned.length, maxAge });
      return cleaned.length;
    } catch (error) {
      logger.error('Error cleaning completed jobs', { error: error.message });
      throw error;
    }
  }

  public async pauseQueue(): Promise<void> {
    try {
      await this.messageQueue.pause();
      logger.info('Queue paused');
    } catch (error) {
      logger.error('Error pausing queue', { error: error.message });
      throw error;
    }
  }

  public async resumeQueue(): Promise<void> {
    try {
      await this.messageQueue.resume();
      logger.info('Queue resumed');
    } catch (error) {
      logger.error('Error resuming queue', { error: error.message });
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.messageQueue.close();
      await this.cacheService.disconnect();
      logger.info('Queue service closed gracefully');
    } catch (error) {
      logger.error('Error closing queue service', { error: error.message });
    }
  }
}