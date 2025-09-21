/**
 * @anchor chatwoot.service:ChatwootServiceReal
 * @description Serviço REAL para integração com API do Chatwoot
 * @flow Inicializa cliente HTTP -> Testa conexão -> Fornece métodos CRUD
 * @dependencies Axios, Winston Logger, variáveis de ambiente
 * @validation API key obrigatória, URLs e IDs válidos
 * @errors Network errors, Auth failures, Rate limiting, Invalid responses
 * @todo Implementar cache, health checks, circuit breaker, métricas
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

/**
 * @anchor chatwoot.service:ChatwootContact
 * @description Interface para contato do Chatwoot (simplificada)
 */
interface ChatwootContact {
  id: number;
  name: string;
  phone_number: string;
  email?: string;
}

/**
 * @anchor chatwoot.service:ChatwootConversation
 * @description Interface para conversa do Chatwoot (simplificada)
 */
interface ChatwootConversation {
  id: number;
  contact_id: number;
  inbox_id: number;
  status: string;
}

/**
 * @anchor chatwoot.service:ChatwootMessageData
 * @description Interface para dados completos de mensagem do Chatwoot
 * @supports Texto, imagens, áudio, vídeo, documentos
 * @validation content obrigatório, attachments opcional
 */
interface ChatwootMessageData {
  content: string;
  message_type?: 'incoming' | 'outgoing';
  private?: boolean;
  content_type?: 'text' | 'input_text' | 'cards' | 'input_select' | 'form' | 'article';
  content_attributes?: {
    attachments?: Array<{
      thumb_url?: string;
      data_url: string;
      message_id?: number;
      file_type?: 'image' | 'audio' | 'video' | 'file';
      file_size?: number;
    }>;
  };
}

/**
 * @anchor chatwoot.service:ChatwootService
 * @description Serviço REAL para integração completa com Chatwoot
 * @flow Conexão -> Autenticação -> Operações CRUD -> Logging detalhado
 * @dependencies Axios, environment variables, logger
 * @validation Credenciais obrigatórias, endpoints válidos
 * @errors API errors, network failures, authentication issues
 * @todo Adicionar retry logic, circuit breaker, caching
 */
export class ChatwootService {
  private api: AxiosInstance;
  private accountId: string;
  private inboxId: string;

  /**
   * @anchor chatwoot.service:constructor
   * @description Inicializa serviço com configurações reais do Chatwoot
   * @flow Lê env vars -> Configura Axios -> Setup interceptors -> Valida conexão
   * @dependencies Environment variables, Axios
   * @validation API key obrigatória se não em modo mock
   * @errors Missing credentials, invalid URLs
   * @todo Adicionar health check inicial, configuração SSL
   */
  constructor() {
    const baseURL = config.chatwoot.url;
    const apiKey = config.chatwoot.apiKey;

    // ⚠️ WARNING: Modo mock se API key não configurada
    if (!apiKey || apiKey === 'your_api_key_here') {
      logger.warn('⚠️ CHATWOOT_API_KEY não configurada - modo mock ativo');
    }

    this.accountId = config.chatwoot.accountId.toString();
    this.inboxId = config.chatwoot.inboxId.toString();

    // 🌐 HTTP: Cliente Axios configurado
    this.api = axios.create({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        'api_access_token': apiKey || 'mock-token',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // ⏱️ Timeout de 10 segundos
    });

    // 📝 INTERCEPTORS: Logging detalhado para debug
    this.api.interceptors.request.use(request => {
      logger.debug('📤 Chatwoot Request', {
        method: request.method,
        url: request.url,
        data: request.data
      });
      return request;
    });

    this.api.interceptors.response.use(
      response => {
        // ✅ SUCCESS: Loga respostas bem-sucedidas
        logger.debug('📥 Chatwoot Response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      error => {
        // ❌ ERROR: Loga erros detalhados
        logger.error('❌ Chatwoot Error', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * @anchor chatwoot.service:testConnection
   * @description Testa conectividade com API do Chatwoot
   * @flow GET /contacts -> Analisa resposta -> Retorna status
   * @dependencies API configurada, credenciais válidas
   * @validation Endpoint acessível, autenticação OK
   * @errors Connection failed, auth failed, timeout
   * @todo Adicionar ping específico, verificação de permissões
   */
  async testConnection(): Promise<boolean> {
    try {
      // 🔍 TEST: Faz requisição de teste para verificar conectividade
      await this.api.get(`/accounts/${this.accountId}/contacts`);
      logger.info('✅ Chatwoot conectado com sucesso');
      return true;
    } catch (error) {
      // ⚠️ ERROR: Falha na conexão
      logger.error('❌ Falha na conexão com Chatwoot', { error });
      return false;
    }
  }

  /**
   * @anchor chatwoot.service:findOrCreateContact
   * @description Busca contato existente ou cria novo
   * @flow Search by phone -> Se encontrou return -> Senão create -> Return
   * @dependencies API funcional, permissões de read/write
   * @validation phone obrigatório, name opcional
   * @errors Search failed, create failed, duplicate contact
   * @todo Implementar cache, normalização de telefone, deduplicação
   */
  async findOrCreateContact(phone: string, name?: string): Promise<ChatwootContact> {
    try {
      // Converter para formato E164 se necessário
      let phoneE164 = phone;
      if (!phone.startsWith('+')) {
        // Se começa com 55, adicionar +
        if (phone.startsWith('55')) {
          phoneE164 = `+${phone}`;
        } else {
          // Assumir Brasil se não tem código de país
          phoneE164 = `+55${phone}`;
        }
      }

      logger.info('📞 Buscando/criando contato', {
        originalPhone: phone,
        phoneE164
      });

      // 🔍 SEARCH: Busca contato existente por telefone
      const searchResponse = await this.api.get(`/accounts/${this.accountId}/contacts/search`, {
        params: { q: phoneE164 }
      });

      // ✅ FOUND: Contato encontrado
      if (searchResponse.data.payload && searchResponse.data.payload.length > 0) {
        logger.info('📞 Contato encontrado', { phoneE164, id: searchResponse.data.payload[0].id });
        return searchResponse.data.payload[0];
      }

      // 🆕 CREATE: Criar novo contato
      const createResponse = await this.api.post(`/accounts/${this.accountId}/contacts`, {
        phone_number: phoneE164,
        name: name || phoneE164
      });

      logger.info('👤 Novo contato criado', {
        phoneE164,
        name,
        id: createResponse.data.payload.contact.id
      });

      return createResponse.data.payload.contact;
    } catch (error) {
      // ⚠️ ERROR: Erro na operação de contato
      logger.error('Erro ao buscar/criar contato', { phone, error });
      throw error;
    }
  }

  /**
   * @anchor chatwoot.service:findOrCreateConversation
   * @description Busca conversa existente ou cria nova para o contato
   * @flow Search conversations -> Se encontrou return -> Senão create -> Return
   * @dependencies Contato existente, inbox configurado
   * @validation contactId obrigatório, inbox válido
   * @errors Contact not found, inbox permission, create failed
   * @todo Implementar reativação de conversas resolvidas, cache
   */
  async findOrCreateConversation(contactId: number): Promise<ChatwootConversation> {
    try {
      // 🔍 SEARCH: Busca conversas abertas do contato
      const searchResponse = await this.api.get(`/accounts/${this.accountId}/conversations`, {
        params: {
          inbox_id: this.inboxId,
          contact_id: contactId,
          status: 'open'
        }
      });

      // ✅ FOUND: Conversa encontrada
      if (searchResponse.data.data.payload && searchResponse.data.data.payload.length > 0) {
        logger.info('💬 Conversa encontrada', {
          contactId,
          conversationId: searchResponse.data.data.payload[0].id
        });
        return searchResponse.data.data.payload[0];
      }

      // 🆕 CREATE: Criar nova conversa
      const createResponse = await this.api.post(`/accounts/${this.accountId}/conversations`, {
        contact_id: contactId,
        inbox_id: this.inboxId
      });

      logger.info('🆕 Nova conversa criada', {
        contactId,
        conversationId: createResponse.data.id
      });

      return createResponse.data;
    } catch (error) {
      // ⚠️ ERROR: Erro na operação de conversa
      logger.error('Erro ao buscar/criar conversa', { contactId, error });
      throw error;
    }
  }

  /**
   * @anchor chatwoot.service:sendMessage
   * @description Envia mensagem com suporte completo a mídias
   * @flow Detecta tipo -> Prepara payload -> POST message -> Loga resultado
   * @dependencies Conversa existente, permissões de escrita
   * @validation conversationId obrigatório, contentOrData string ou objeto
   * @supports Texto, imagens, áudio, vídeo, documentos com attachments
   * @errors Conversation not found, permission denied, send failed
   * @todo Implementar retry, queue de mensagens, validação de mídia
   */
  async sendMessage(
    conversationId: number,
    contentOrData: string | ChatwootMessageData,
    messageType: string = 'incoming'
  ): Promise<any> {
    try {
      let messageData: ChatwootMessageData;

      // 🔄 COMPATIBILITY: Mantém compatibilidade com chamadas antigas (string)
      if (typeof contentOrData === 'string') {
        messageData = {
          content: contentOrData,
          message_type: messageType as 'incoming' | 'outgoing',
          private: false,
          content_type: 'text'
        };
      } else {
        // 📱 MEDIA: Dados completos com possíveis anexos
        messageData = {
          ...contentOrData,
          message_type: contentOrData.message_type || messageType as 'incoming' | 'outgoing',
          private: contentOrData.private ?? false,
          content_type: contentOrData.content_type || 'text'
        };
      }

      // 📤 SEND: Envia mensagem completa para o Chatwoot
      const response = await this.api.post(
        `/accounts/${this.accountId}/conversations/${conversationId}/messages`,
        messageData
      );

      // ✅ SUCCESS: Log detalhado do tipo de mensagem enviada
      const hasAttachments = messageData.content_attributes?.attachments?.length && messageData.content_attributes.attachments.length > 0;
      logger.info('✉️ Mensagem enviada ao Chatwoot', {
        conversationId,
        messageId: response.data.id,
        contentType: messageData.content_type,
        hasAttachments,
        attachmentCount: messageData.content_attributes?.attachments?.length || 0
      });

      return response.data;
    } catch (error) {
      // ⚠️ ERROR: Erro detalhado no envio
      logger.error('Erro ao enviar mensagem', {
        conversationId,
        contentType: typeof contentOrData === 'string' ? 'text' : 'media',
        error
      });
      throw error;
    }
  }
}