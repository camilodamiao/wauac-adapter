import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';

/**
 * @anchor chatwoot.service:ChatwootContact
 * @description Interface para representação de contato no Chatwoot
 * @flow Define estrutura de contato com inbox associations
 * @dependencies Nenhuma dependência externa
 * @validation id obrigatório, phone_number para identificação única
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar validação de formato de telefone, custom fields tipados
 */
export interface ChatwootContact {
  id: number;                    // 🆔 ID único do contato no Chatwoot
  name?: string;                 // 👤 Nome do contato (opcional)
  phone_number?: string;         // 📱 Número de telefone (identificador principal)
  email?: string;                // 📧 Email do contato (opcional)
  identifier?: string;           // 🔖 Identificador customizado (opcional)
  thumbnail?: string;            // 🖼️ URL da foto de perfil (opcional)
  custom_attributes: Record<string, any>; // 📋 Atributos personalizados
  contact_inboxes: Array<{       // 📬 Associações com inboxes
    id: number;                  // 🆔 ID da associação
    inbox_id: number;            // 📬 ID do inbox
    source_id: string;           // 🔗 ID externo (ex: número WhatsApp)
  }>;
}

/**
 * @anchor chatwoot.service:ChatwootConversation
 * @description Interface para representação de conversa no Chatwoot
 * @flow Define estrutura completa de conversa com mensagens e metadados
 * @dependencies ChatwootContact
 * @validation id, account_id, inbox_id obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar typing para messages array, status transitions
 */
export interface ChatwootConversation {
  id: number;                    // 🆔 ID único da conversa
  messages: Array<any>;          // 💬 Array de mensagens (TODO: tipar)
  account_id: number;            // 🏢 ID da conta Chatwoot
  inbox_id: number;              // 📬 ID do inbox
  status: 'open' | 'resolved' | 'pending'; // 📊 Status da conversa
  assignee_last_seen_at?: string; // 👁️ Última visualização do atendente
  agent_last_seen_at?: string;   // 👁️ Última visualização do agente
  unread_count: number;          // 📮 Contador de mensagens não lidas
  last_activity_at: string;      // ⏰ Timestamp da última atividade
  contact: ChatwootContact;      // 👤 Contato associado
  can_reply: boolean;            // ✅ Indica se pode responder
  channel: string;               // 📡 Canal de origem (whatsapp, email, etc)
  additional_attributes: Record<string, any>; // 📋 Atributos adicionais
  custom_attributes: Record<string, any>;    // 📋 Atributos personalizados
}

/**
 * @anchor chatwoot.service:ChatwootMessage
 * @description Interface para representação de mensagem no Chatwoot
 * @flow Define estrutura de mensagem com anexos e metadados
 * @dependencies Nenhuma dependência externa
 * @validation id, content, conversation_id, message_type obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar support para reactions, replies, mentions
 */
export interface ChatwootMessage {
  id: number;                    // 🆔 ID único da mensagem
  content: string;               // 💬 Conteúdo da mensagem
  account_id: number;            // 🏢 ID da conta Chatwoot
  inbox_id: number;              // 📬 ID do inbox
  conversation_id: number;       // 💬 ID da conversa
  message_type: 'incoming' | 'outgoing'; // 📥 Direção da mensagem
  content_type: 'text' | 'input_select' | 'cards' | 'form' | 'article'; // 📋 Tipo de conteúdo
  content_attributes: Record<string, any>; // 📋 Atributos do conteúdo
  created_at: string;            // ⏰ Timestamp de criação
  private: boolean;              // 🔒 Indica se é mensagem privada/nota
  source_id?: string;            // 🔗 ID da mensagem no sistema origem
  sender?: {                     // 👤 Dados do remetente
    id: number;                  // 🆔 ID do remetente
    name: string;                // 👤 Nome do remetente
    email: string;               // 📧 Email do remetente
    type: 'user' | 'contact';    // 👥 Tipo (agente ou contato)
  };
  attachments?: Array<{          // 📎 Anexos da mensagem
    id: number;                  // 🆔 ID do anexo
    message_id: number;          // 🆔 ID da mensagem
    file_type: string;           // 📄 Tipo do arquivo
    account_id: number;          // 🏢 ID da conta
    extension?: string;          // 📄 Extensão do arquivo
    data_url: string;            // 🔗 URL do arquivo
    thumb_url?: string;          // 🖼️ URL da miniatura
    file_size: number;           // 📏 Tamanho do arquivo
  }>;
}

/**
 * @anchor chatwoot.service:CreateContactRequest
 * @description Interface para requisição de criação de contato
 * @flow Define campos para criar novo contato no Chatwoot
 * @dependencies Nenhuma dependência externa
 * @validation Pelo menos phone_number ou email obrigatório
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar validação de formato, campos obrigatórios dinâmicos
 */
export interface CreateContactRequest {
  name?: string;                 // 👤 Nome do contato (opcional)
  phone_number?: string;         // 📱 Número de telefone (identificador)
  email?: string;                // 📧 Email do contato (opcional)
  identifier?: string;           // 🔖 Identificador customizado (opcional)
  custom_attributes?: Record<string, any>; // 📋 Atributos personalizados
  avatar_url?: string;           // 🖼️ URL da foto de perfil (opcional)
}

/**
 * @anchor chatwoot.service:CreateConversationRequest
 * @description Interface para requisição de criação de conversa
 * @flow Define parâmetros para criar nova conversa no Chatwoot
 * @dependencies Requer contato e inbox existentes
 * @validation contact_id e inbox_id obrigatórios
 * @errors Contato ou inbox inexistente, permissões
 * @todo Adicionar validação de existência, auto-assignment rules
 */
export interface CreateConversationRequest {
  contact_id: number;            // 👤 ID do contato (obrigatório)
  inbox_id: number;              // 📬 ID do inbox (obrigatório)
  status?: 'open' | 'resolved' | 'pending'; // 📊 Status inicial (padrão: open)
  assignee_id?: number;          // 👤 ID do atendente designado (opcional)
  team_id?: number;              // 👥 ID da equipe designada (opcional)
  custom_attributes?: Record<string, any>;    // 📋 Atributos personalizados
  additional_attributes?: Record<string, any>; // 📋 Atributos adicionais
}

/**
 * @anchor chatwoot.service:SendMessageRequest
 * @description Interface para requisição de envio de mensagem
 * @flow Define estrutura para enviar mensagens via API Chatwoot
 * @dependencies Conversa existente
 * @validation content e message_type obrigatórios
 * @errors Conversa inexistente, permissões, anexos inválidos
 * @todo Adicionar suporte para templates, quick replies, carousels
 */
export interface SendMessageRequest {
  content: string;               // 💬 Conteúdo da mensagem (obrigatório)
  message_type: 'incoming' | 'outgoing'; // 📥 Direção da mensagem
  private?: boolean;             // 🔒 Mensagem privada/nota interna (opcional)
  content_type?: 'text' | 'input_select' | 'cards' | 'form' | 'article'; // 📋 Tipo de conteúdo
  content_attributes?: Record<string, any>; // 📋 Atributos do conteúdo
  echo_id?: string;              // 🔄 ID para deduplicar mensagens (opcional)
  attachments?: Array<{          // 📎 Anexos da mensagem
    file_type: string;           // 📄 Tipo do arquivo (image, video, document)
    data_url: string;            // 🔗 URL do arquivo
    thumb_url?: string;          // 🖼️ URL da miniatura (opcional)
  }>;
}

/**
 * @anchor chatwoot.service:ChatwootService
 * @description Serviço principal para integração com API do Chatwoot
 * @flow Inicializa cliente HTTP -> Configura interceptors -> Fornece métodos CRUD
 * @dependencies Axios, Winston Logger, variáveis de ambiente
 * @validation API key obrigatória, URLs e IDs válidos
 * @errors Network errors, Auth failures, Rate limiting, Invalid responses
 * @todo Implementar cache, health checks, circuit breaker, métricas
 */
export class ChatwootService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private accountId: number;
  private defaultInboxId: number;

  /**
   * @anchor chatwoot.service:constructor
   * @description Inicializa serviço com configurações e cliente HTTP
   * @flow Lê env vars -> Valida API key -> Configura Axios -> Setup interceptors
   * @dependencies Variáveis de ambiente, Axios
   * @validation CHATWOOT_API_KEY obrigatória
   * @errors Missing API key, Invalid URLs, Network configuration
   * @todo Adicionar validação de conectividade, configuração de proxy
   */
  constructor() {
    // 🔧 CONFIG: Lê configurações das variáveis de ambiente
    this.baseUrl = process.env.CHATWOOT_URL || 'http://localhost:3000';
    this.apiKey = process.env.CHATWOOT_API_KEY || '';
    this.accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID || '1');
    this.defaultInboxId = parseInt(process.env.CHATWOOT_INBOX_ID || '1');

    // ✅ VALIDATION: Verifica se API key foi fornecida
    if (!this.apiKey) {
      throw new Error('CHATWOOT_API_KEY environment variable is required');
    }

    // 🌐 HTTP: Configura cliente Axios com headers e timeout
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1/accounts/${this.accountId}`,
      headers: {
        'api_access_token': this.apiKey,    // 🔑 Token de autenticação
        'Content-Type': 'application/json', // 📝 Tipo de conteúdo padrão
      },
      timeout: 30000,                       // ⏱️ Timeout de 30 segundos
    });

    // 🔧 SETUP: Configura interceptors de request/response
    this.setupInterceptors();

    // 📝 LOG: Registra inicialização bem-sucedida
    logger.info('ChatwootService initialized', {
      baseUrl: this.baseUrl,
      accountId: this.accountId,
      defaultInboxId: this.defaultInboxId
    });
  }

  /**
   * @anchor chatwoot.service:setupInterceptors
   * @description Configura interceptors para logging e tratamento de erros
   * @flow Request interceptor -> Response interceptor -> Error handling
   * @dependencies Axios interceptors, Winston logger
   * @validation Sanitiza tokens em logs, valida estrutura de erro
   * @errors Network errors, Rate limiting (429), Auth failures (401/403)
   * @todo Adicionar retry automático, circuit breaker, métricas de latência
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        // 📝 DEBUG: Loga requisições com token sanitizado
        logger.debug('Chatwoot API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: { ...config.headers, api_access_token: '[REDACTED]' }
        });
        return config;
      },
      (error) => {
        // ⚠️ ERROR: Loga erros de configuração de requisição
        logger.error('Chatwoot API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        // ✅ SUCCESS: Loga respostas bem-sucedidas
        logger.debug('Chatwoot API response', {
          status: response.status,
          url: response.config.url,
          dataType: typeof response.data
        });
        return response;
      },
      async (error: AxiosError) => {
        // 🔍 DEBUG: Extrai correlationId para rastreamento
        const correlationId = error.config?.headers?.['X-Correlation-ID'] as string || 'unknown';

        // 🚨 ERROR HANDLING: Diferentes tipos de erro da API
        if (error.response) {
          // ❌ HTTP Error: Resposta com código de erro
          logger.error('Chatwoot API error response', {
            correlationId,
            status: error.response.status,
            statusText: error.response.statusText,
            url: error.config?.url,
            data: error.response.data,
            method: error.config?.method?.toUpperCase()
          });
        } else if (error.request) {
          // 🌐 Network Error: Falha de conectividade
          logger.error('Chatwoot API network error', {
            correlationId,
            url: error.config?.url,
            message: error.message
          });
        } else {
          // ⚙️ Setup Error: Erro de configuração
          logger.error('Chatwoot API setup error', {
            correlationId,
            message: error.message
          });
        }

        // 🐌 RATE LIMIT: Aplica delay automático para 429
        if (error.response?.status === 429) {
          await this.delay(2000); // ⏱️ Espera 2s antes de continuar
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * @anchor chatwoot.service:delay
   * @description Utilitário para criar delay assíncrono
   * @flow Cria Promise que resolve após timeout especificado
   * @dependencies setTimeout nativo
   * @validation ms deve ser número positivo
   * @errors Nenhum erro específico
   * @todo Adicionar cancelamento, progress callback
   */
  private async delay(ms: number): Promise<void> {
    // ⏱️ TIMER: Cria delay não-bloqueante
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * @anchor chatwoot.service:retryWithBackoff
   * @description Implementa retry com backoff exponencial para operações
   * @flow Executa operação -> Se falhar -> Calcula delay -> Espera -> Retry
   * @dependencies delay(), Winston logger
   * @validation maxRetries > 0, baseDelay > 0, operation é função
   * @errors Propaga erro final se esgotar tentativas
   * @todo Adicionar jitter, retry condicional por tipo de erro
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    correlationId?: string
  ): Promise<T> {
    // 🔄 RETRY LOOP: Tenta executar operação com backoff
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // 🚫 FINAL ATTEMPT: Não faz retry na última tentativa
        if (attempt === maxRetries) {
          throw error;
        }

        // 📈 BACKOFF: Calcula delay exponencial (1s, 2s, 4s, 8s...)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn('Retrying Chatwoot operation', {
          correlationId,
          attempt,
          maxRetries,
          delayMs: delay,
          error: error.message
        });

        // ⏳ WAIT: Espera antes da próxima tentativa
        await this.delay(delay);
      }
    }
    throw new Error('Retry logic failed unexpectedly');
  }

  /**
   * @anchor chatwoot.service:findContactByPhone
   * @description Busca contato existente por número de telefone
   * @flow API call -> Filtra resultados -> Retorna contato ou null
   * @dependencies Chatwoot API /contacts endpoint, retry logic
   * @validation phone string não vazia
   * @errors API errors, Network timeout, Authentication failure
   * @todo Implementar cache, busca fuzzy, normalização de telefone
   */
  public async findContactByPhone(phone: string, correlationId?: string): Promise<ChatwootContact | null> {
    try {
      // 📝 LOG: Registra início da busca com phone parcialmente mascarado
      logger.info('Searching for contact by phone', { correlationId, phone: phone.substring(0, 5) + '***' });

      // 🔍 SEARCH: Busca contatos na API com retry automático
      const response = await this.retryWithBackoff(
        () => this.client.get<{ payload: ChatwootContact[] }>('/contacts', {
          params: { q: phone },                         // 📱 Query pelo telefone
          headers: { 'X-Correlation-ID': correlationId } // 🔗 Tracking header
        }),
        3,        // 🔄 Máximo 3 tentativas
        1000,     // ⏱️ Delay inicial de 1s
        correlationId
      );

      // 🎯 FILTER: Filtra resultados para match exato do telefone
      const contacts = response.data.payload || [];
      const contact = contacts.find(c => c.phone_number === phone) || null;

      // 📊 METRICS: Loga resultado da busca
      logger.info('Contact search completed', {
        correlationId,
        found: !!contact,
        contactId: contact?.id
      });

      return contact;
    } catch (error) {
      // ⚠️ ERROR: Loga erro na busca de contato
      logger.error('Error finding contact by phone', {
        correlationId,
        phone: phone.substring(0, 5) + '***', // 🔒 Phone mascarado por segurança
        error: error.message
      });
      throw error; // 🚨 Repassa erro para chamador
    }
  }

  /**
   * @anchor chatwoot.service:createContact
   * @description Cria novo contato no Chatwoot
   * @flow Valida dados -> POST /contacts -> Retorna contato criado
   * @dependencies Chatwoot API, CreateContactRequest interface
   * @validation phone_number ou email obrigatório
   * @errors Duplicate contact, Invalid data, API errors
   * @todo Implementar validação de duplicatas, normalização de dados
   */
  public async createContact(data: CreateContactRequest, correlationId?: string): Promise<ChatwootContact> {
    try {
      logger.info('Creating new contact', {
        correlationId,
        phone: data.phone_number?.substring(0, 5) + '***',
        name: data.name
      });

      const response = await this.retryWithBackoff(
        () => this.client.post<{ payload: { contact: ChatwootContact } }>('/contacts', data, {
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      const contact = response.data.payload.contact;

      logger.info('Contact created successfully', {
        correlationId,
        contactId: contact.id,
        phone: data.phone_number?.substring(0, 5) + '***'
      });

      return contact;
    } catch (error) {
      logger.error('Error creating contact', {
        correlationId,
        phone: data.phone_number?.substring(0, 5) + '***',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * @anchor chatwoot.service:findOrCreateContact
   * @description Busca contato existente ou cria novo se não encontrar
   * @flow findContactByPhone -> se null -> createContact -> retorna contato
   * @dependencies findContactByPhone(), createContact()
   * @validation phone obrigatório, name opcional
   * @errors Erros dos métodos dependentes
   * @todo Implementar cache distribuído, conflict resolution
   */
  public async findOrCreateContact(phone: string, name?: string, correlationId?: string): Promise<ChatwootContact> {
    try {
      let contact = await this.findContactByPhone(phone, correlationId);

      if (!contact) {
        contact = await this.createContact({
          phone_number: phone,
          name: name || `Contact ${phone.substring(0, 5)}***`,
          custom_attributes: {
            phone_formatted: phone,
            source: 'z-api',
            created_via: 'wauac-adapter'
          }
        }, correlationId);
      }

      return contact;
    } catch (error) {
      logger.error('Error in findOrCreateContact', {
        correlationId,
        phone: phone.substring(0, 5) + '***',
        error: error.message
      });
      throw error;
    }
  }

  public async findConversationByContact(contactId: number, inboxId: number, correlationId?: string): Promise<ChatwootConversation | null> {
    try {
      logger.info('Searching for conversation', { correlationId, contactId, inboxId });

      const response = await this.retryWithBackoff(
        () => this.client.get<{ payload: ChatwootConversation[] }>('/conversations', {
          params: {
            status: 'open',
            inbox_id: inboxId,
            contact_id: contactId
          },
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      const conversations = response.data.payload || [];
      const conversation = conversations.find(c =>
        c.contact.id === contactId &&
        c.inbox_id === inboxId &&
        c.status === 'open'
      ) || null;

      logger.info('Conversation search completed', {
        correlationId,
        found: !!conversation,
        conversationId: conversation?.id
      });

      return conversation;
    } catch (error) {
      logger.error('Error finding conversation', {
        correlationId,
        contactId,
        inboxId,
        error: error.message
      });
      throw error;
    }
  }

  public async createConversation(data: CreateConversationRequest, correlationId?: string): Promise<ChatwootConversation> {
    try {
      logger.info('Creating new conversation', {
        correlationId,
        contactId: data.contact_id,
        inboxId: data.inbox_id
      });

      const response = await this.retryWithBackoff(
        () => this.client.post<{ payload: ChatwootConversation }>('/conversations', data, {
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      const conversation = response.data.payload;

      logger.info('Conversation created successfully', {
        correlationId,
        conversationId: conversation.id,
        contactId: data.contact_id
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation', {
        correlationId,
        contactId: data.contact_id,
        inboxId: data.inbox_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * @anchor chatwoot.service:findOrCreateConversation
   * @description Busca conversa existente ou cria nova para o contato
   * @flow findConversationByContact -> se null -> createConversation -> retorna conversa
   * @dependencies findConversationByContact(), createConversation()
   * @validation contactId obrigatório, inboxId opcional (usa default)
   * @errors Contact not found, Inbox permission errors
   * @todo Implementar reativação de conversas resolvidas
   */
  public async findOrCreateConversation(contactId: number, inboxId?: number, correlationId?: string): Promise<ChatwootConversation> {
    try {
      const targetInboxId = inboxId || this.defaultInboxId;
      let conversation = await this.findConversationByContact(contactId, targetInboxId, correlationId);

      if (!conversation) {
        conversation = await this.createConversation({
          contact_id: contactId,
          inbox_id: targetInboxId,
          status: 'open',
          additional_attributes: {
            source: 'z-api',
            created_via: 'wauac-adapter'
          }
        }, correlationId);
      }

      return conversation;
    } catch (error) {
      logger.error('Error in findOrCreateConversation', {
        correlationId,
        contactId,
        inboxId: inboxId || this.defaultInboxId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * @anchor chatwoot.service:sendMessage
   * @description Envia mensagem para conversa específica no Chatwoot
   * @flow Valida dados -> POST /conversations/{id}/messages -> Retorna mensagem
   * @dependencies Chatwoot API, conversa ativa
   * @validation conversationId obrigatório, content e message_type obrigatórios
   * @errors Conversation not found, Permission denied, Invalid attachments
   * @todo Implementar queue de mensagens, deduplicação por echo_id
   */
  public async sendMessage(conversationId: number, data: SendMessageRequest, correlationId?: string): Promise<ChatwootMessage> {
    try {
      logger.info('Sending message to Chatwoot', {
        correlationId,
        conversationId,
        messageType: data.message_type,
        contentType: data.content_type,
        hasAttachments: !!(data.attachments?.length)
      });

      const response = await this.retryWithBackoff(
        () => this.client.post<{ payload: ChatwootMessage }>(`/conversations/${conversationId}/messages`, data, {
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      const message = response.data.payload;

      logger.info('Message sent successfully', {
        correlationId,
        messageId: message.id,
        conversationId,
        sourceId: message.source_id
      });

      return message;
    } catch (error) {
      logger.error('Error sending message', {
        correlationId,
        conversationId,
        messageType: data.message_type,
        error: error.message
      });
      throw error;
    }
  }

  public async getConversation(conversationId: number, correlationId?: string): Promise<ChatwootConversation> {
    try {
      const response = await this.retryWithBackoff(
        () => this.client.get<{ payload: ChatwootConversation }>(`/conversations/${conversationId}`, {
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      return response.data.payload;
    } catch (error) {
      logger.error('Error getting conversation', {
        correlationId,
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  public async updateConversationStatus(conversationId: number, status: 'open' | 'resolved' | 'pending', correlationId?: string): Promise<void> {
    try {
      logger.info('Updating conversation status', {
        correlationId,
        conversationId,
        status
      });

      await this.retryWithBackoff(
        () => this.client.patch(`/conversations/${conversationId}`, { status }, {
          headers: { 'X-Correlation-ID': correlationId }
        }),
        3,
        1000,
        correlationId
      );

      logger.info('Conversation status updated', {
        correlationId,
        conversationId,
        status
      });
    } catch (error) {
      logger.error('Error updating conversation status', {
        correlationId,
        conversationId,
        status,
        error: error.message
      });
      throw error;
    }
  }
}