/**
 * @anchor translator:ZApiTranslator
 * @description Tradutor completo entre formatos Z-API e Chatwoot
 * @flow Recebe mensagem origem -> Analisa tipo -> Converte formato -> Retorna traduzido
 * @dependencies Winston logger, interfaces Z-API e Chatwoot
 * @validation Valida estruturas de entrada e saída
 * @errors Translation failed, unsupported types, missing data
 * @todo Implementar cache de traduções, otimização de mídia, batch processing
 */

import { logger } from '../../utils/logger';
import { ZApiMessage } from './types';

/**
 * @anchor translator:ChatwootMessage
 * @description Interface para mensagem Chatwoot usada nas traduções
 * @flow Define estrutura para mensagens do Chatwoot
 * @dependencies Nenhuma dependência externa
 * @validation id, content e message_type obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Sincronizar com interface oficial do Chatwoot
 */
export interface ChatwootMessage {
  id?: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  content_type: 'text' | 'image' | 'audio' | 'video' | 'file';
  private?: boolean;
  content_attributes?: Record<string, any>;
  attachments?: Array<{
    file_type: string;
    account_id?: number;
    data_url: string;
  }>;
}

/**
 * @anchor translator:TranslationContext
 * @description Contexto para operações de tradução
 * @flow Define metadados necessários para tradução correta
 * @dependencies Nenhuma dependência externa
 * @validation correlationId para rastreamento, direction obrigatória
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar configurações de tradução, preferências do usuário
 */
export interface TranslationContext {
  correlationId?: string;              // 🔗 ID para rastreamento
  direction: 'zapi-to-chatwoot' | 'chatwoot-to-zapi'; // 🔄 Direção da tradução
  instanceId?: string;                 // 🆔 ID da instância Z-API
  conversationId?: number;             // 💬 ID da conversa Chatwoot
}

/**
 * @anchor translator:ChatwootMessageData
 * @description Estrutura de dados para mensagem Chatwoot
 * @flow Define formato esperado pela API do Chatwoot
 * @dependencies Nenhuma dependência externa
 * @validation content e message_type obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar suporte para templates, botões, carousels
 */
export interface ChatwootMessageData {
  content: string;                     // 💬 Conteúdo da mensagem
  message_type: 'incoming' | 'outgoing'; // 📥 Direção da mensagem
  content_type: 'text' | 'input_select' | 'cards' | 'form' | 'article'; // 📋 Tipo de conteúdo
  content_attributes: Record<string, any>; // 📋 Atributos adicionais
  echo_id?: string;                    // 🔄 ID para deduplicação
  attachments?: Array<{                // 📎 Anexos opcionais
    file_type: string;                 // 📄 Tipo do arquivo
    data_url: string;                  // 🔗 URL do arquivo
    thumb_url?: string;                // 🖼️ URL da miniatura
  }>;
}

/**
 * @anchor translator:ZApiTranslator
 * @description Classe principal para tradução entre Z-API e Chatwoot
 * @flow Métodos de tradução bidirecionais + utilitários
 * @dependencies Logger, interfaces de mensagem
 * @validation Valida formatos de entrada em cada método
 * @errors Translation errors, unsupported formats, data corruption
 * @todo Implementar cache, métricas de performance, validação schema
 */
export class ZApiTranslator {

  /**
   * @anchor translator:translateZApiToChatwoot
   * @description Traduz mensagem Z-API para formato Chatwoot
   * @flow Analisa tipo mensagem -> Extrai conteúdo -> Formata Chatwoot -> Retorna
   * @dependencies ZApiMessage, TranslationContext, logger
   * @validation zapiMessage válida, context com direction
   * @errors Translation failed, unsupported message type, missing content
   * @todo Otimizar tradução de mídia, adicionar cache, batch processing
   */
  public translateZApiToChatwoot(zapiMessage: ZApiMessage, context: TranslationContext): ChatwootMessageData {
    try {
      logger.debug('Translating Z-API message to Chatwoot format', {
        correlationId: context.correlationId,
        messageId: zapiMessage.messageId,
        messageType: zapiMessage.type,
        fromMe: zapiMessage.fromMe
      });

      const baseMessage: ChatwootMessageData = {
        content: '',
        message_type: zapiMessage.fromMe ? 'outgoing' : 'incoming',
        content_type: 'text',
        content_attributes: {
          source: 'z-api',
          zapi_message_id: zapiMessage.messageId,
          zapi_instance_id: zapiMessage.instanceId,
          zapi_timestamp: zapiMessage.momment,
          zapi_phone: zapiMessage.phone,
          zapi_sender_name: zapiMessage.senderName,
          zapi_chat_name: zapiMessage.chatName,
          zapi_is_group: zapiMessage.isGroup || false
        },
        echo_id: zapiMessage.messageId
      };

      // Text message
      if (zapiMessage.text) {
        baseMessage.content = zapiMessage.text.message;
        return baseMessage;
      }

      // Image message
      if (zapiMessage.image) {
        baseMessage.content = zapiMessage.image.caption || '[Image]';
        baseMessage.attachments = [{
          file_type: 'image',
          data_url: zapiMessage.image.imageUrl,
          thumb_url: zapiMessage.image.thumbnailUrl || zapiMessage.image.imageUrl
        }];
        baseMessage.content_attributes['media_info'] = {
          mimeType: zapiMessage.image.mimeType,
          caption: zapiMessage.image.caption
        };
        return baseMessage;
      }

      // Audio message
      if (zapiMessage.audio) {
        baseMessage.content = '[Audio Message]';
        baseMessage.attachments = [{
          file_type: 'audio',
          data_url: zapiMessage.audio.audioUrl
        }];
        baseMessage.content_attributes['media_info'] = {
          mimeType: zapiMessage.audio.mimeType,
          ptt: zapiMessage.audio.ptt
        };
        return baseMessage;
      }

      // Video message
      if (zapiMessage.video) {
        baseMessage.content = zapiMessage.video.caption || '[Video]';
        baseMessage.attachments = [{
          file_type: 'video',
          data_url: zapiMessage.video.videoUrl,
          thumb_url: zapiMessage.video.videoUrl
        }];
        baseMessage.content_attributes['media_info'] = {
          mimeType: zapiMessage.video.mimeType,
          caption: zapiMessage.video.caption
        };
        return baseMessage;
      }

      // Document message
      if (zapiMessage.document) {
        baseMessage.content = `[Document: ${zapiMessage.document.fileName || zapiMessage.document.title || 'Unknown'}]`;
        baseMessage.attachments = [{
          file_type: 'file',
          data_url: zapiMessage.document.documentUrl
        }];
        baseMessage.content_attributes['media_info'] = {
          fileName: zapiMessage.document.fileName,
          title: zapiMessage.document.title,
          mimeType: zapiMessage.document.mimeType
        };
        return baseMessage;
      }

      // Location message
      if (zapiMessage.location) {
        const locationText = [
          zapiMessage.location.description && `📍 ${zapiMessage.location.description}`,
          zapiMessage.location.address && `📍 ${zapiMessage.location.address}`,
          `🌍 Latitude: ${zapiMessage.location.latitude}`,
          `🌍 Longitude: ${zapiMessage.location.longitude}`
        ].filter(Boolean).join('\n');

        baseMessage.content = locationText || '[Location Shared]';
        baseMessage.content_attributes['location_info'] = {
          latitude: zapiMessage.location.latitude,
          longitude: zapiMessage.location.longitude,
          address: zapiMessage.location.address,
          description: zapiMessage.location.description,
          google_maps_url: `https://www.google.com/maps?q=${zapiMessage.location.latitude},${zapiMessage.location.longitude}`
        };
        return baseMessage;
      }

      // Unsupported message type
      logger.warn('Unsupported Z-API message type', {
        correlationId: context.correlationId,
        messageType: zapiMessage.type,
        messageId: zapiMessage.messageId
      });

      baseMessage.content = `[Unsupported message type: ${zapiMessage.type}]`;
      baseMessage.content_attributes['unsupported_type'] = zapiMessage.type;
      return baseMessage;

    } catch (error: any) {
      logger.error('Error translating Z-API message to Chatwoot', {
        correlationId: context.correlationId,
        messageId: zapiMessage.messageId,
        messageType: zapiMessage.type,
        error: error.message
      });

      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  public translateChatwootToZApi(chatwootMessage: ChatwootMessage, context: TranslationContext): any {
    try {
      logger.debug('Translating Chatwoot message to Z-API format', {
        correlationId: context.correlationId,
        messageId: chatwootMessage.id,
        messageType: chatwootMessage.message_type,
        contentType: chatwootMessage.content_type
      });

      // Basic text message
      if (chatwootMessage.content_type === 'text' && (!chatwootMessage.attachments || chatwootMessage.attachments.length === 0)) {
        return {
          message: chatwootMessage.content
        };
      }

      // Message with attachments
      if (chatwootMessage.attachments && chatwootMessage.attachments.length > 0) {
        const attachment = chatwootMessage.attachments[0];

        if (!attachment) {
          return { message: chatwootMessage.content || '[Empty message]' };
        }

        switch (attachment.file_type) {
          case 'image':
            return {
              image: attachment.data_url,
              caption: chatwootMessage.content || undefined
            };

          case 'audio':
            return {
              audio: attachment.data_url
            };

          case 'video':
            return {
              video: attachment.data_url,
              caption: chatwootMessage.content || undefined
            };

          case 'file':
            return {
              document: attachment.data_url,
              fileName: chatwootMessage.content_attributes?.['filename'] || 'document'
            };

          default:
            logger.warn('Unsupported attachment type for Z-API', {
              correlationId: context.correlationId,
              fileType: attachment.file_type,
              messageId: chatwootMessage.id
            });

            return {
              message: chatwootMessage.content || '[Unsupported attachment]'
            };
        }
      }

      // Fallback to text message
      return {
        message: chatwootMessage.content || '[Empty message]'
      };

    } catch (error: any) {
      logger.error('Error translating Chatwoot message to Z-API', {
        correlationId: context.correlationId,
        messageId: chatwootMessage.id,
        error: error.message
      });

      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  public extractPhoneNumber(zapiMessage: ZApiMessage): string {
    return zapiMessage.phone.replace(/\D/g, '');
  }

  public extractSenderName(zapiMessage: ZApiMessage): string | undefined {
    if (zapiMessage.isGroup && zapiMessage.senderName) {
      return zapiMessage.senderName;
    }

    if (zapiMessage.chatName && !zapiMessage.isGroup) {
      return zapiMessage.chatName;
    }

    if (zapiMessage.senderName) {
      return zapiMessage.senderName;
    }

    return undefined;
  }

  public generateMessagePreview(zapiMessage: ZApiMessage, maxLength: number = 100): string {
    let preview = '';

    if (zapiMessage.text) {
      preview = zapiMessage.text.message || '[Empty text]';
    } else if (zapiMessage.image) {
      preview = zapiMessage.image.caption || '[Image]';
    } else if (zapiMessage.video) {
      preview = zapiMessage.video.caption || '[Video]';
    } else if (zapiMessage.audio) {
      preview = '[Audio message]';
    } else if (zapiMessage.document) {
      preview = `[Document: ${zapiMessage.document.fileName || zapiMessage.document.title || 'Unknown'}]`;
    } else if (zapiMessage.location) {
      preview = `[Location: ${zapiMessage.location.description || 'Shared location'}]`;
    } else {
      preview = `[${zapiMessage.type}]`;
    }

    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength - 3) + '...';
    }

    return preview;
  }
}