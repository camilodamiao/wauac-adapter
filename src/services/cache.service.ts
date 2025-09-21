import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { MappingData } from '../adapters/zapi/types';

/**
 * @anchor cache.service:CacheService
 * @description Serviço de cache Redis para mapeamentos Z-API <-> Chatwoot
 * @flow Inicializa Redis -> Configura eventos -> Fornece métodos CRUD com TTL
 * @dependencies Redis/ioredis, Winston Logger, MappingData interface
 * @validation Conexão Redis obrigatória, key prefix para namespace
 * @errors Redis connection, Network timeout, Serialization errors
 * @todo Implementar clustering, backup/restore, métricas de hit rate
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;
  private isConnected: boolean = false;

  /**
   * @anchor cache.service:constructor
   * @description Inicializa serviço de cache com configurações Redis
   * @flow Lê env vars -> Calcula TTL -> Configura cliente Redis -> Setup eventos
   * @dependencies Variáveis de ambiente, ioredis
   * @validation Porta Redis numérica, TTL em dias válido
   * @errors Invalid Redis config, Connection timeout
   * @todo Adicionar validação de conectividade inicial, configuração SSL
   */
  constructor() {
    // 🔧 CONFIG: Lê configurações Redis das variáveis de ambiente
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const cacheTTLDays = parseInt(process.env.CACHE_TTL_DAYS || '7');

    // ⏰ TTL: Converte dias para segundos (TTL padrão: 7 dias)
    this.defaultTTL = cacheTTLDays * 24 * 60 * 60;
    this.keyPrefix = 'wauac:mapping:'; // 🔑 Namespace para chaves do cache

    // 🔗 REDIS: Configura cliente com retry e timeouts
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryDelayOnFailover: 100,  // 🔄 Delay de retry em failover
      maxRetriesPerRequest: 3,    // 🔄 Máximo 3 tentativas por comando
      lazyConnect: true,          // 🚀 Conecta sob demanda
      keepAlive: 30000,           // 💓 Keep-alive de 30s
      connectTimeout: 10000,      // ⏱️ Timeout de conexão 10s
      commandTimeout: 5000,       // ⏱️ Timeout de comando 5s
      db: 0                       // 🗄️ Database 0 (padrão)
    });

    // 📡 EVENTS: Configura handlers de eventos Redis
    this.setupEventHandlers();

    // 📝 LOG: Registra inicialização com configurações
    logger.info('CacheService initialized', {
      host: redisHost,
      port: redisPort,
      ttlDays: cacheTTLDays,
      keyPrefix: this.keyPrefix
    });
  }

  /**
   * @anchor cache.service:setupEventHandlers
   * @description Configura handlers para eventos de conexão Redis
   * @flow Registra listeners -> Atualiza status -> Loga eventos
   * @dependencies Redis event system, Winston logger
   * @validation Nenhuma validação específica
   * @errors Connection errors, Network failures
   * @todo Adicionar métricas de uptime, alertas para falhas críticas
   */
  private setupEventHandlers(): void {
    // ✅ CONNECT: Redis conectou com sucesso
    this.redis.on('connect', () => {
      logger.info('Redis connection established');
      this.isConnected = true;
    });

    // 🟢 READY: Redis pronto para receber comandos
    this.redis.on('ready', () => {
      logger.info('Redis is ready to accept commands');
    });

    // ❌ ERROR: Erro na conexão Redis
    this.redis.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message,
        code: error.code || 'UNKNOWN'
      });
      this.isConnected = false;
    });

    // 🔴 CLOSE: Conexão Redis foi fechada
    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    // 🔄 RECONNECTING: Redis tentando reconectar
    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  /**
   * @anchor cache.service:getKey
   * @description Gera chave Redis normalizada a partir do telefone
   * @flow Remove caracteres não-numéricos -> Adiciona prefix -> Retorna chave
   * @dependencies String.replace() nativo
   * @validation Remove todos não-dígitos do telefone
   * @errors Nenhum erro específico
   * @todo Adicionar validação de formato de telefone, encoding especial
   */
  private getKey(phone: string): string {
    // 🧹 SANITIZE: Remove todos caracteres não-numéricos
    const sanitizedPhone = phone.replace(/\D/g, '');
    // 🔑 KEY: Combina prefix com telefone sanitizado
    return `${this.keyPrefix}${sanitizedPhone}`;
  }

  /**
   * @anchor cache.service:ensureConnection
   * @description Garante que conexão Redis está ativa antes de operações
   * @flow Verifica status -> Se desconectado -> Tenta conectar -> Loga resultado
   * @dependencies Redis.connect(), status interno
   * @validation Verifica isConnected flag
   * @errors Redis connection failed, Network unavailable
   * @todo Implementar circuit breaker, health check ping
   */
  private async ensureConnection(): Promise<void> {
    // 🔌 STATUS: Verifica se conexão está ativa
    if (!this.isConnected) {
      try {
        // 🔗 CONNECT: Tenta estabelecer conexão
        await this.redis.connect();
      } catch (error) {
        // ❌ ERROR: Falha na conexão
        logger.error('Failed to connect to Redis', { error: error.message });
        throw new Error('Cache service is not available');
      }
    }
  }

  /**
   * @anchor cache.service:getMapping
   * @description Busca mapeamento existente no cache por telefone
   * @flow ensureConnection -> getKey -> Redis GET -> Parse JSON -> Converte datas
   * @dependencies Redis connection, MappingData interface
   * @validation phone obrigatório, valida JSON parsing
   * @errors Redis unavailable, JSON parse error, Network timeout
   * @todo Implementar compressão, validação de schema, backup de dados
   */
  public async getMapping(phone: string, correlationId?: string): Promise<MappingData | null> {
    try {
      await this.ensureConnection();

      const key = this.getKey(phone);
      const startTime = Date.now();

      // 📝 DEBUG: Loga início da busca no cache
      logger.debug('Getting mapping from cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***', // 🔒 Phone mascarado
        key
      });

      // 🔍 GET: Busca dados no Redis
      const data = await this.redis.get(key);
      const duration = Date.now() - startTime;

      // ❌ NOT FOUND: Não encontrou dados no cache
      if (!data) {
        logger.debug('Mapping not found in cache', {
          correlationId,
          phone: phone.substring(0, 5) + '***',
          duration
        });
        return null;
      }

      // 📜 PARSE: Converte JSON para objeto MappingData
      const mapping: MappingData = JSON.parse(data);

      // 📅 DATES: Converte strings de data para objetos Date
      mapping.createdAt = new Date(mapping.createdAt);
      mapping.updatedAt = new Date(mapping.updatedAt);
      mapping.lastMessageAt = new Date(mapping.lastMessageAt);

      logger.debug('Mapping retrieved from cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        chatwootContactId: mapping.chatwootContactId,
        chatwootConversationId: mapping.chatwootConversationId,
        duration
      });

      return mapping;

    } catch (error) {
      logger.error('Error getting mapping from cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        error: error.message
      });

      if (error.message.includes('Cache service is not available')) {
        return null;
      }

      throw error;
    }
  }

  /**
   * @anchor cache.service:setMapping
   * @description Armazena mapeamento no cache com TTL
   * @flow ensureConnection -> Prepara dados -> Redis SETEX -> Loga resultado
   * @dependencies Redis connection, JSON serialization
   * @validation phone e data obrigatórios, TTL opcional
   * @errors Redis unavailable, Serialization error, Network timeout
   * @todo Implementar compressão, validação de dados, backup automático
   */
  public async setMapping(phone: string, data: MappingData, ttl?: number, correlationId?: string): Promise<void> {
    try {
      await this.ensureConnection();

      const key = this.getKey(phone);
      const effectiveTTL = ttl || this.defaultTTL;
      const startTime = Date.now();

      // 📆 DATA: Prepara dados com timestamp atualizado
      const mappingData: MappingData = {
        ...data,
        zapiPhone: phone,
        updatedAt: new Date() // 🔄 Atualiza timestamp
      };

      // 📝 DEBUG: Loga operação de escrita
      logger.debug('Setting mapping in cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***', // 🔒 Phone mascarado
        key,
        ttl: effectiveTTL,
        chatwootContactId: mappingData.chatwootContactId,
        chatwootConversationId: mappingData.chatwootConversationId
      });

      // 💾 SETEX: Armazena dados com TTL no Redis
      await this.redis.setex(key, effectiveTTL, JSON.stringify(mappingData));

      const duration = Date.now() - startTime;

      logger.debug('Mapping saved to cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        duration,
        ttl: effectiveTTL
      });

    } catch (error) {
      logger.error('Error setting mapping in cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        error: error.message
      });

      if (!error.message.includes('Cache service is not available')) {
        throw error;
      }
    }
  }

  /**
   * @anchor cache.service:deleteMapping
   * @description Remove mapeamento específico do cache
   * @flow ensureConnection -> getKey -> Redis DEL -> Loga resultado
   * @dependencies Redis connection
   * @validation phone obrigatório
   * @errors Redis unavailable, Network timeout
   * @todo Implementar soft delete, backup antes da remoção
   */
  public async deleteMapping(phone: string, correlationId?: string): Promise<void> {
    try {
      await this.ensureConnection();

      const key = this.getKey(phone);
      const startTime = Date.now();

      logger.debug('Deleting mapping from cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        key
      });

      const result = await this.redis.del(key);
      const duration = Date.now() - startTime;

      logger.debug('Mapping deletion completed', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        deleted: result > 0,
        duration
      });

    } catch (error) {
      logger.error('Error deleting mapping from cache', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        error: error.message
      });

      if (!error.message.includes('Cache service is not available')) {
        throw error;
      }
    }
  }

  /**
   * @anchor cache.service:updateLastMessageTime
   * @description Atualiza timestamp da última mensagem no mapeamento
   * @flow getMapping -> Se existe -> Atualiza lastMessageAt -> setMapping
   * @dependencies getMapping(), setMapping()
   * @validation phone obrigatório, mapeamento deve existir
   * @errors Mapeamento inexistente, Redis errors
   * @todo Implementar operação atômica, batch updates
   */
  public async updateLastMessageTime(phone: string, correlationId?: string): Promise<void> {
    try {
      const existingMapping = await this.getMapping(phone, correlationId);

      // 🗺️ UPDATE: Atualiza timestamp se mapeamento existe
      if (existingMapping) {
        existingMapping.lastMessageAt = new Date(); // ⏰ Novo timestamp
        await this.setMapping(phone, existingMapping, undefined, correlationId);
      }

    } catch (error) {
      logger.error('Error updating last message time', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        error: error.message
      });
    }
  }

  /**
   * @anchor cache.service:getAllMappings
   * @description Retorna todos os mapeamentos do cache (ou por padrão)
   * @flow ensureConnection -> Redis KEYS -> Redis MGET -> Parse JSON -> Converte datas
   * @dependencies Redis connection, JSON parsing
   * @validation pattern opcional (usa default se não fornecido)
   * @errors Redis unavailable, JSON parse errors, Network timeout
   * @todo Implementar paginação, SCAN em vez de KEYS, cache de resultado
   */
  public async getAllMappings(pattern?: string, correlationId?: string): Promise<MappingData[]> {
    try {
      await this.ensureConnection();

      const searchPattern = pattern || `${this.keyPrefix}*`;
      const startTime = Date.now();

      logger.debug('Getting all mappings from cache', {
        correlationId,
        pattern: searchPattern
      });

      const keys = await this.redis.keys(searchPattern);

      if (keys.length === 0) {
        logger.debug('No mappings found', { correlationId, pattern: searchPattern });
        return [];
      }

      const values = await this.redis.mget(...keys);
      const mappings: MappingData[] = [];

      for (const value of values) {
        if (value) {
          try {
            const mapping: MappingData = JSON.parse(value);
            mapping.createdAt = new Date(mapping.createdAt);
            mapping.updatedAt = new Date(mapping.updatedAt);
            mapping.lastMessageAt = new Date(mapping.lastMessageAt);
            mappings.push(mapping);
          } catch (parseError) {
            logger.warn('Failed to parse cached mapping', {
              correlationId,
              error: parseError.message
            });
          }
        }
      }

      const duration = Date.now() - startTime;

      logger.debug('All mappings retrieved', {
        correlationId,
        count: mappings.length,
        duration
      });

      return mappings;

    } catch (error) {
      logger.error('Error getting all mappings from cache', {
        correlationId,
        error: error.message
      });

      if (error.message.includes('Cache service is not available')) {
        return [];
      }

      throw error;
    }
  }

  public async clearExpiredMappings(correlationId?: string): Promise<number> {
    try {
      await this.ensureConnection();

      const pattern = `${this.keyPrefix}*`;
      const startTime = Date.now();

      logger.info('Starting cleanup of expired mappings', {
        correlationId,
        pattern
      });

      const keys = await this.redis.keys(pattern);
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          await this.redis.del(key);
          deletedCount++;
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Expired mappings cleanup completed', {
        correlationId,
        totalKeys: keys.length,
        deletedCount,
        duration
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error clearing expired mappings', {
        correlationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * @anchor cache.service:getStats
   * @description Retorna estatísticas do cache e conexão Redis
   * @flow ensureConnection -> Conta chaves -> Obtém info Redis -> Retorna stats
   * @dependencies Redis connection, Redis INFO command
   * @validation Nenhuma validação específica
   * @errors Redis unavailable (retorna stats vazias)
   * @todo Adicionar métricas de performance, hit rate, latency
   */
  public async getStats(correlationId?: string): Promise<{
    isConnected: boolean;
    totalMappings: number;
    redisInfo?: any;
  }> {
    try {
      await this.ensureConnection();

      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const info = await this.redis.info('memory');

      return {
        isConnected: this.isConnected,
        totalMappings: keys.length,
        redisInfo: {
          memory: info,
          keyspace: await this.redis.info('keyspace')
        }
      };

    } catch (error) {
      logger.error('Error getting cache stats', {
        correlationId,
        error: error.message
      });

      return {
        isConnected: false,
        totalMappings: 0,
        redisInfo: null
      };
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redis.disconnect();
        logger.info('Redis connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error: error.message });
    }
  }
}