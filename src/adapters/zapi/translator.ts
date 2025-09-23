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
  content_attributes?: {
    attachments?: Array<{
      file_type: string;
      data_url: string;
      thumb_url?: string;
    }>;
    media_info?: Record<string, any>;
    source?: string;
    [key: string]: any;
  };
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
   * @anchor translator:translateTextMessage
   * @description Processa mensagens de texto
   */
  private translateTextMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    baseMessage.content = zapiMessage.text!.message;

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateImageMessage
   * @description Processa mensagens de imagem
   */
  private translateImageMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const img = zapiMessage.image!;

    baseMessage.content = img.caption || '';
    baseMessage.content_type = 'text';
    baseMessage.content_attributes['attachments'] = [{
      file_type: 'image',
      data_url: img.imageUrl,
      thumb_url: img.thumbnailUrl || img.imageUrl
    }];
    baseMessage.content_attributes['media_info'] = {
      mimeType: img.mimeType,
      caption: img.caption
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateAudioMessage
   * @description Processa mensagens de áudio
   */
  private translateAudioMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const audio = zapiMessage.audio!;

    baseMessage.content = audio.ptt ? '🎤 [Nota de Voz]' : '🎵 [Áudio]';
    baseMessage.content_type = 'text';
    baseMessage.content_attributes['attachments'] = [{
      file_type: 'audio',
      data_url: audio.audioUrl
    }];
    baseMessage.content_attributes['media_info'] = {
      mimeType: audio.mimeType,
      ptt: audio.ptt
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateVideoMessage
   * @description Processa mensagens de vídeo
   */
  private translateVideoMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const video = zapiMessage.video!;

    baseMessage.content = video.caption || '🎥 [Vídeo]';
    baseMessage.content_type = 'text';
    baseMessage.content_attributes['attachments'] = [{
      file_type: 'video',
      data_url: video.videoUrl,
      thumb_url: video.videoUrl
    }];
    baseMessage.content_attributes['media_info'] = {
      mimeType: video.mimeType,
      caption: video.caption
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateDocumentMessage
   * @description Processa mensagens de documento - FLEXÍVEL para aceitar qualquer estrutura
   * @flow Múltiplas fontes de dados -> Não força extensão -> Trata nulls
   */
  private translateDocumentMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const doc = zapiMessage.document!;

    logger.debug('📄 Processando documento flexível', {
      correlationId: context.correlationId,
      documentData: doc,
      availableFields: Object.keys(doc)
    });

    // 🔄 FLEXÍVEL: Múltiplas fontes para URL do documento
    const documentUrl = doc.documentUrl || (doc as any).url || (doc as any).document;

    if (!documentUrl) {
      logger.error('📄 Documento sem URL em nenhum campo', {
        correlationId: context.correlationId,
        messageId: zapiMessage.messageId,
        document: doc
      });

      baseMessage.content = '📎 [Documento sem URL disponível]';
      baseMessage.content_attributes['document_error'] = 'URL não encontrada';
      return baseMessage;
    }

    // 🔄 FLEXÍVEL: Múltiplas fontes para nome do arquivo (NÃO adicionar extensão forçada)
    const fileName = doc.fileName || (doc as any).documentName || doc.title || 'documento';

    // 🔄 FLEXÍVEL: Múltiplas fontes para caption (aceitar null)
    const caption = doc.caption || (doc as any).documentCaption || '';

    // Configurar conteúdo
    baseMessage.content = caption || `📎 ${fileName}`;
    baseMessage.content_type = 'text';

    // Configurar attachment (usar nome original SEM modificar)
    baseMessage.content_attributes['attachments'] = [{
      file_type: 'file',
      data_url: documentUrl,
      file_name: fileName // ✅ CORRIGIDO: NÃO adicionar .pdf automaticamente
    }];

    // Configurar metadata flexível
    baseMessage.content_attributes['document_info'] = {
      original_name: fileName,
      title: doc.title,
      mime_type: doc.mimeType || (doc as any).documentMimeType,
      page_count: doc.pageCount,
      caption: caption
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    logger.info('📄 Documento processado com sucesso', {
      correlationId: context.correlationId,
      messageId: zapiMessage.messageId,
      documentName: fileName,
      hasCaption: !!caption,
      documentUrl
    });

    return baseMessage;
  }

  /**
   * @anchor translator:translateLocationMessage
   * @description Processa mensagens de localização - FLEXÍVEL para campos opcionais
   */
  private translateLocationMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const loc = zapiMessage.location!;

    // Tratar campos opcionais que podem ser null/vazios
    const address = loc.address || loc.description || '';
    const name = (loc as any).name || '';
    const displayName = name || address || 'Localização compartilhada';

    const mapsUrl = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;

    let content = `📍 ${displayName}\n`;
    content += `🌍 Latitude: ${loc.latitude}\n`;
    content += `🌍 Longitude: ${loc.longitude}\n`;
    content += `🗺️ ${mapsUrl}`;

    baseMessage.content = content;
    baseMessage.content_attributes['location_info'] = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: address,
      name: name,
      url: (loc as any).url || mapsUrl,
      google_maps_url: mapsUrl
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateContactMessage
   * @description Processa mensagens de contato/vCard - FLEXÍVEL para múltiplos formatos
   */
  private translateContactMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const contact = zapiMessage.contact || zapiMessage.vcard || {};
    const vCardData = (contact as any).vCard || (contact as any).vcard || '';

    // Extrair nome do vCard se possível
    const nameMatch = vCardData.match(/FN:(.*?)[\r\n]/);
    const name = nameMatch ? nameMatch[1] : (contact as any).displayName || 'Contato';

    let content = `👤 Contato compartilhado: ${name}`;
    if (vCardData) {
      content += `\n\n${vCardData}`;
    }

    baseMessage.content = content;
    baseMessage.content_attributes['contact_info'] = {
      display_name: name,
      vcard_data: vCardData,
      original_contact: contact
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translatePollMessage
   * @description Processa mensagens de enquete - FLEXÍVEL para múltiplos formatos
   */
  private translatePollMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const poll = zapiMessage.poll || {};
    const pollName = (poll as any).name || (poll as any).question || 'Enquete';
    const options = (poll as any).options || (poll as any).choices || [];

    let content = `📊 Enquete: ${pollName}\n`;
    if (Array.isArray(options)) {
      options.forEach((opt: any, i: number) => {
        const optText = typeof opt === 'string' ? opt : opt.name || opt.text || `Opção ${i + 1}`;
        content += `\n${i + 1}. ${optText}`;
      });
    }

    baseMessage.content = content;
    baseMessage.content_attributes['poll_info'] = {
      poll_name: pollName,
      options: options,
      original_poll: poll
    };

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateStickerMessage
   * @description Processa mensagens de sticker - FLEXÍVEL para múltiplas fontes de URL
   */
  private translateStickerMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const sticker = zapiMessage.sticker || {};
    const stickerUrl = (sticker as any).stickerUrl || (sticker as any).url;

    baseMessage.content = '😄 [Sticker]';

    if (stickerUrl) {
      baseMessage.content_attributes['attachments'] = [{
        file_type: 'image',
        data_url: stickerUrl
      }];
    }

    baseMessage.content_attributes['sticker_info'] = sticker;

    // Adicionar prefixo de reply se detectado
    if (zapiMessage.referenceMessageId) {
      baseMessage.content = `↩️ [Resposta]\n${baseMessage.content}`;
    }

    return baseMessage;
  }

  /**
   * @anchor translator:translateReactionMessage
   * @description Processa mensagens de reação
   */
  private translateReactionMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const reaction = zapiMessage.reaction!;

    baseMessage.content = `${reaction.emoji} [Reação à mensagem]`;
    baseMessage.content_attributes['reaction_info'] = reaction;

    return baseMessage;
  }

  /**
   * @anchor translator:translateButtonResponseMessage
   * @description Processa respostas de botão
   */
  private translateButtonResponseMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const buttonResponse = zapiMessage.buttonResponse!;

    baseMessage.content = `🔘 ${buttonResponse.buttonText}`;
    baseMessage.content_attributes['button_response_info'] = buttonResponse;

    return baseMessage;
  }

  /**
   * @anchor translator:translateListResponseMessage
   * @description Processa respostas de lista
   */
  private translateListResponseMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): ChatwootMessageData {
    const listResponse = zapiMessage.listResponse!;

    baseMessage.content = `📋 ${listResponse.title}: ${listResponse.response?.title || 'Selecionado'}`;
    baseMessage.content_attributes['list_response_info'] = listResponse;

    return baseMessage;
  }

  /**
   * @anchor translator:getDocumentExtension
   * @description Determina extensão apropriada baseada no MIME type
   * @flow Mapeia MIME -> extensão padrão
   * @dependencies Nenhuma
   * @validation mimeType string opcional
   * @errors Nenhum erro específico
   * @todo Adicionar mais tipos MIME, detecção de conteúdo
   */
  private getDocumentExtension(mimeType?: string, fileName?: string): string {
    // Tentar extrair extensão do nome do arquivo primeiro
    if (fileName && fileName.includes('.')) {
      const parts = fileName.split('.');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const ext = lastPart.toLowerCase();
        if (ext.length <= 4) return ext; // Extensões válidas geralmente têm 2-4 caracteres
      }
    }

    // Mapear MIME types para extensões
    const mimeMap: { [key: string]: string } = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'application/x-rar-compressed': 'rar',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif'
    };

    return mimeType ? (mimeMap[mimeType] || 'bin') : 'pdf';
  }

  /**
   * @anchor translator:processReplyMessage
   * @description Detecta e processa mensagens de reply de múltiplos formatos
   * @flow Detecta reply -> Extrai dados -> Configura contexto -> Adiciona metadata
   * @dependencies ZApiMessage, ChatwootMessageData, logger
   * @validation Múltiplos formatos suportados
   * @errors Nenhum erro crítico, fallback gracioso
   * @todo Adicionar cache de mensagens para referência completa
   */
  private processReplyMessage(
    zapiMessage: ZApiMessage,
    baseMessage: ChatwootMessageData,
    context: TranslationContext
  ): void {
    // Detectar se é uma mensagem de reply
    const isReply = zapiMessage.isReply ||
                   !!zapiMessage.referenceMessageId ||  // ← CORREÇÃO: Z-API usa este campo
                   !!zapiMessage.quotedMessage ||
                   !!zapiMessage.replyMessage ||
                   !!zapiMessage.quotedMsg ||
                   !!zapiMessage.contextInfo;

    if (!isReply) return;

    logger.debug('📝 Detectada mensagem de reply', {
      correlationId: context.correlationId,
      messageId: zapiMessage.messageId,
      hasReferenceMessageId: !!zapiMessage.referenceMessageId,  // ← ADICIONADO
      referenceMessageId: zapiMessage.referenceMessageId,       // ← ADICIONADO
      hasQuotedMessage: !!zapiMessage.quotedMessage,
      hasReplyMessage: !!zapiMessage.replyMessage,
      hasQuotedMsg: !!zapiMessage.quotedMsg,
      hasContextInfo: !!zapiMessage.contextInfo,
      isReplyFlag: zapiMessage.isReply
    });

    // Extrair dados da mensagem original de múltiplas fontes
    let replyData: any = null;

    // ⭐ PRIORIDADE 1: referenceMessageId (campo principal da Z-API)
    if (zapiMessage.referenceMessageId) {
      replyData = {
        messageId: zapiMessage.referenceMessageId,
        fromMe: false, // Não temos essa info no referenceMessageId
        sender: 'alguém', // Placeholder - Z-API não fornece sender neste campo
        content: '', // Placeholder - Z-API não fornece conteúdo neste campo
        type: 'text'
      };
    } else if (zapiMessage.quotedMessage) {
      replyData = {
        messageId: zapiMessage.quotedMessage.messageId,
        fromMe: zapiMessage.quotedMessage.fromMe,
        sender: zapiMessage.quotedMessage.participant,
        content: zapiMessage.quotedMessage.body || zapiMessage.quotedMessage.caption || '',
        type: zapiMessage.quotedMessage.type || 'text'
      };
    } else if (zapiMessage.replyMessage) {
      replyData = {
        messageId: zapiMessage.replyMessage.messageId,
        fromMe: zapiMessage.replyMessage.fromMe,
        sender: zapiMessage.replyMessage.senderName,
        content: zapiMessage.replyMessage.message || zapiMessage.replyMessage.caption || '',
        type: zapiMessage.replyMessage.type || 'text'
      };
    } else if (zapiMessage.quotedMsg) {
      replyData = {
        messageId: zapiMessage.quotedMsg.messageId || zapiMessage.quotedMsg.id,
        fromMe: zapiMessage.quotedMsg.fromMe,
        sender: zapiMessage.quotedMsg.senderName || zapiMessage.quotedMsg.participant,
        content: zapiMessage.quotedMsg.message || zapiMessage.quotedMsg.body || zapiMessage.quotedMsg.caption || '',
        type: zapiMessage.quotedMsg.type || 'text'
      };
    } else if (zapiMessage.contextInfo) {
      replyData = {
        messageId: zapiMessage.contextInfo.stanzaId || zapiMessage.contextInfo.quotedMessage?.id,
        fromMe: zapiMessage.contextInfo.quotedMessage?.fromMe,
        sender: zapiMessage.contextInfo.participant || zapiMessage.contextInfo.quotedMessage?.senderName,
        content: zapiMessage.contextInfo.quotedMessage?.conversation || zapiMessage.contextInfo.quotedMessage?.body || '',
        type: 'text'
      };
    }

    if (!replyData || !replyData.messageId) {
      logger.warn('📝 Reply detectado mas sem dados da mensagem original', {
        correlationId: context.correlationId,
        messageId: zapiMessage.messageId
      });
      return;
    }

    // Configurar contexto de reply no Chatwoot
    baseMessage.content_attributes['in_reply_to_external_id'] = replyData.messageId;
    baseMessage.content_attributes['quoted_message'] = {
      id: replyData.messageId,
      type: replyData.type,
      content: replyData.content,
      from_me: replyData.fromMe || false,
      sender: replyData.sender
    };

    // Adicionar indicação visual de reply no conteúdo
    if (replyData.content) {
      const senderName = replyData.sender || (replyData.fromMe ? 'você' : 'alguém');
      const quotedPreview = replyData.content.length > 50
        ? replyData.content.substring(0, 50) + '...'
        : replyData.content;

      baseMessage.content_attributes['reply_context'] = `↩️ Em resposta a ${senderName}: "${quotedPreview}"`;

      // Se o conteúdo da mensagem atual estiver vazio, adicionar o contexto
      if (!baseMessage.content || baseMessage.content.trim() === '') {
        baseMessage.content = `↩️ Em resposta a ${senderName}: "${quotedPreview}"`;
      }
    }

    logger.info('📝 Reply processado com sucesso', {
      correlationId: context.correlationId,
      messageId: zapiMessage.messageId,
      originalMessageId: replyData.messageId,
      originalSender: replyData.sender,
      hasOriginalContent: !!replyData.content
    });
  }

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

      // 🔄 REPLY: Detectar e processar replies via referenceMessageId
      if (zapiMessage.referenceMessageId) {
        baseMessage.content_attributes['is_reply'] = true;
        baseMessage.content_attributes['reply_to_message_id'] = zapiMessage.referenceMessageId;
        logger.info('📩 Reply detectado via referenceMessageId', {
          correlationId: context.correlationId,
          originalMessageId: zapiMessage.referenceMessageId,
          currentMessageId: zapiMessage.messageId
        });
      }

      // 🔄 REPLY: Processa mensagem citada se presente (múltiplos formatos)
      this.processReplyMessage(zapiMessage, baseMessage, context);

      // Identificar tipo de mensagem e processar
      if (zapiMessage.text) {
        return this.translateTextMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.image) {
        return this.translateImageMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.audio) {
        return this.translateAudioMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.video) {
        return this.translateVideoMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.document) {
        return this.translateDocumentMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.location) {
        return this.translateLocationMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.contact || zapiMessage.vcard) {
        return this.translateContactMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.sticker) {
        return this.translateStickerMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.poll) {
        return this.translatePollMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.reaction) {
        return this.translateReactionMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.buttonResponse) {
        return this.translateButtonResponseMessage(zapiMessage, baseMessage, context);
      } else if (zapiMessage.listResponse) {
        return this.translateListResponseMessage(zapiMessage, baseMessage, context);
      } else {
        // Mensagem não suportada - mostrar tipo e dados disponíveis
        const availableKeys = Object.keys(zapiMessage).filter(key =>
          !['instanceId', 'messageId', 'phone', 'fromMe', 'type', 'momment', 'status', 'chatName', 'senderName'].includes(key)
        );

        baseMessage.content = `[Tipo de mensagem não suportado: ${zapiMessage.type}]`;
        baseMessage.content_attributes['unsupported_type'] = zapiMessage.type;
        baseMessage.content_attributes['available_fields'] = availableKeys;

        logger.warn('Tipo de mensagem não suportado', {
          correlationId: context.correlationId,
          type: zapiMessage.type,
          messageId: zapiMessage.messageId,
          availableKeys
        });

        return baseMessage;
      }

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
      if (chatwootMessage.content_type === 'text' && (!chatwootMessage.content_attributes?.attachments || chatwootMessage.content_attributes.attachments.length === 0)) {
        return {
          message: chatwootMessage.content
        };
      }

      // Message with attachments
      if (chatwootMessage.content_attributes?.attachments && chatwootMessage.content_attributes.attachments.length > 0) {
        const attachment = chatwootMessage.content_attributes.attachments[0];

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