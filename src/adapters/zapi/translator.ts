import { logger } from '../../utils/logger';
import { ZApiMessage } from './types';
import { ChatwootMessage } from '../../services/chatwoot.service';

export interface TranslationContext {
  correlationId?: string;
  direction: 'zapi-to-chatwoot' | 'chatwoot-to-zapi';
  instanceId?: string;
  conversationId?: number;
}

export interface ChatwootMessageData {
  content: string;
  message_type: 'incoming' | 'outgoing';
  content_type: 'text' | 'input_select' | 'cards' | 'form' | 'article';
  content_attributes: Record<string, any>;
  echo_id?: string;
  attachments?: Array<{
    file_type: string;
    data_url: string;
    thumb_url?: string;
  }>;
}

export class ZApiTranslator {

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