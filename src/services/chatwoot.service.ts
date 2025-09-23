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
import FormData from 'form-data';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
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
   * @anchor chatwoot.service:downloadAttachment
   * @description Baixa arquivo de uma URL e salva temporariamente
   * @flow Download URL -> Salva arquivo temp -> Retorna caminho local
   * @dependencies fs, axios, path
   * @validation URL válida obrigatória
   * @errors Download failed, write failed, invalid URL
   * @todo Implementar timeout, retry, validação de tamanho
   */
  private async downloadAttachment(url: string, fileName?: string): Promise<string> {
    try {
      logger.debug('📥 Baixando attachment', { url, fileName });

      // Gerar nome único se não fornecido
      const timestamp = Date.now();
      const extension = url.split('.').pop()?.split('?')[0] || 'bin';
      const finalFileName = fileName || `attachment_${timestamp}.${extension}`;
      const tempPath = join(process.cwd(), 'temp', finalFileName);

      // Criar diretório temp se não existir
      const tempDir = join(process.cwd(), 'temp');
      if (!existsSync(tempDir)) {
        require('fs').mkdirSync(tempDir, { recursive: true });
      }

      // Download do arquivo
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000, // 30 segundos timeout
        headers: {
          'User-Agent': 'Wauac-Adapter/1.0'
        }
      });

      // Salvar arquivo
      const writeStream = createWriteStream(tempPath);
      await pipeline(response.data, writeStream);

      logger.debug('✅ Attachment baixado', {
        url,
        tempPath,
        size: require('fs').statSync(tempPath).size
      });

      return tempPath;
    } catch (error) {
      logger.error('❌ Erro ao baixar attachment', { url, error });
      throw new Error(`Falha ao baixar attachment: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

      // 🔍 DETECT: Verifica se há attachments para baixar e enviar
      const attachments = messageData.content_attributes?.attachments;
      const hasAttachments = attachments && attachments.length > 0;

      if (hasAttachments) {
        // 📥 DOWNLOAD & SEND: Baixa arquivos e envia via multipart/form-data
        return await this.sendMessageWithAttachments(conversationId, messageData, attachments);
      } else {
        // 📝 TEXT: Envia mensagem de texto normal
        return await this.sendTextMessage(conversationId, messageData);
      }
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

  /**
   * @anchor chatwoot.service:sendTextMessage
   * @description Envia mensagem de texto simples via JSON
   * @flow Prepara payload JSON -> POST message -> Retorna resultado
   * @dependencies Axios configurado
   * @validation messageData completo obrigatório
   * @errors Network error, auth error, invalid response
   * @todo Adicionar retry logic, rate limiting
   */
  private async sendTextMessage(conversationId: number, messageData: ChatwootMessageData): Promise<any> {
    logger.debug('📝 Enviando mensagem de texto', {
      conversationId,
      content: messageData.content.substring(0, 50) + '...'
    });

    const response = await this.api.post(
      `/accounts/${this.accountId}/conversations/${conversationId}/messages`,
      messageData
    );

    logger.info('✉️ Mensagem de texto enviada', {
      conversationId,
      messageId: response.data.id,
      contentType: messageData.content_type
    });

    return response.data;
  }

  /**
   * @anchor chatwoot.service:sendMessageWithAttachments
   * @description Baixa arquivos de URLs e envia via multipart/form-data
   * @flow Download files -> Create FormData -> POST with files -> Cleanup -> Return
   * @dependencies downloadAttachment, FormData, fs
   * @validation attachments array obrigatório
   * @errors Download failed, upload failed, cleanup failed
   * @todo Implementar parallel downloads, compression, virus scan
   */
  private async sendMessageWithAttachments(
    conversationId: number,
    messageData: ChatwootMessageData,
    attachments: any[]
  ): Promise<any> {
    const tempFiles: string[] = [];

    try {
      logger.info('📎 Processando mensagem com attachments', {
        conversationId,
        attachmentCount: attachments.length,
        attachmentTypes: attachments.map(a => a.file_type)
      });

      // 📥 DOWNLOAD: Baixa todos os attachments
      const downloadPromises = attachments.map(async (attachment, index) => {
        const fileName = `attachment_${index}_${Date.now()}.${this.getFileExtension(attachment.file_type)}`;
        const tempPath = await this.downloadAttachment(attachment.data_url, fileName);
        tempFiles.push(tempPath);
        return tempPath;
      });

      const downloadedFiles = await Promise.all(downloadPromises);

      // 📦 FORM-DATA: Prepara multipart/form-data
      const formData = new FormData();

      // Adiciona campos básicos da mensagem
      formData.append('content', messageData.content);
      formData.append('message_type', messageData.message_type);
      formData.append('private', (messageData.private ?? false).toString());

      // 📎 ATTACHMENTS: Adiciona arquivos baixados
      downloadedFiles.forEach((filePath, index) => {
        const fileStream = require('fs').createReadStream(filePath);
        const fileName = filePath.split(/[/\\]/).pop() || `attachment_${index}`;
        formData.append('attachments[]', fileStream, fileName);
      });

      // 🚀 SEND: Envia via multipart/form-data
      logger.debug('🚀 Enviando mensagem com attachments via multipart/form-data', {
        conversationId,
        fileCount: downloadedFiles.length
      });

      const response = await this.api.post(
        `/accounts/${this.accountId}/conversations/${conversationId}/messages`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'api_access_token': config.chatwoot.apiKey
          },
          timeout: 60000 // 60 segundos para uploads grandes
        }
      );

      // ✅ SUCCESS: Log detalhado com attachments reais
      logger.info('🎉 Mensagem com attachments enviada com sucesso', {
        conversationId,
        messageId: response.data.id,
        attachmentCount: attachments.length,
        attachmentTypes: attachments.map(a => a.file_type),
        fileSizes: downloadedFiles.map(f => require('fs').statSync(f).size)
      });

      return response.data;

    } finally {
      // 🧹 CLEANUP: Remove arquivos temporários
      tempFiles.forEach(filePath => {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            logger.debug('🗑️ Arquivo temporário removido', { filePath });
          }
        } catch (cleanupError) {
          logger.warn('⚠️ Erro ao remover arquivo temporário', { filePath, cleanupError });
        }
      });
    }
  }

  /**
   * @anchor chatwoot.service:getFileExtension
   * @description Retorna extensão apropriada baseada no tipo de arquivo
   * @flow Mapeia file_type -> extensão padrão
   * @dependencies Nenhuma
   * @validation file_type string obrigatório
   * @errors Nenhum erro específico
   * @todo Adicionar mais tipos MIME, detecção automática
   */
  private getFileExtension(fileType: string): string {
    const extensionMap: { [key: string]: string } = {
      'image': 'jpg',
      'video': 'mp4',
      'audio': 'mp3',
      'file': 'pdf',
      'document': 'pdf'
    };

    return extensionMap[fileType] || 'bin';
  }
}