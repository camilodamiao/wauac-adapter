/**
 * @anchor types:ZApiMessageType
 * @description Enum com todos os tipos de mensagem suportados pela Z-API
 * @flow Define constantes para validação e roteamento de mensagens
 * @dependencies Nenhuma dependência externa
 * @validation Usado em schemas Joi e validações de payload
 * @errors Nenhum erro específico deste enum
 * @todo Adicionar suporte para POLL, LIVE_LOCATION e novos tipos WhatsApp
 */
export enum ZApiMessageType {
  TEXT = 'text',                    // 💬 Mensagem de texto simples
  IMAGE = 'image',                  // 🖼️ Imagem com caption opcional
  AUDIO = 'audio',                  // 🎵 Áudio ou nota de voz (PTT)
  VIDEO = 'video',                  // 🎥 Vídeo com caption opcional
  DOCUMENT = 'document',            // 📄 Documento/arquivo anexado
  LOCATION = 'location',            // 📍 Localização geográfica
  CONTACT = 'contact',              // 👤 Contato compartilhado
  STICKER = 'sticker',              // 😄 Sticker/figurinha
  BUTTON_RESPONSE = 'button_response', // 🔘 Resposta de botão interativo
  LIST_RESPONSE = 'list_response'   // 📋 Resposta de lista interativa
}

/**
 * @anchor types:ZApiStatusType
 * @description Enum com status de entrega de mensagens WhatsApp
 * @flow Define estados do ciclo de vida de uma mensagem
 * @dependencies Nenhuma dependência externa
 * @validation Usado para validar webhooks de status da Z-API
 * @errors Nenhum erro específico deste enum
 * @todo Adicionar VIEWED para status de visualização de mídia
 */
export enum ZApiStatusType {
  SENT = 'sent',          // 📤 Mensagem enviada para o servidor WhatsApp
  DELIVERED = 'delivered', // 📬 Mensagem entregue no dispositivo do destinatário
  READ = 'read',          // 👁️ Mensagem lida pelo destinatário
  FAILED = 'failed',      // ❌ Falha no envio da mensagem
  PENDING = 'pending'     // ⏳ Mensagem pendente de envio
}

/**
 * @anchor types:ZApiEventType
 * @description Enum com tipos de eventos webhook da Z-API
 * @flow Define callbacks suportados para configuração de webhooks
 * @dependencies Nenhuma dependência externa
 * @validation Usado para identificar tipo de webhook recebido
 * @errors Nenhum erro específico deste enum
 * @todo Adicionar INSTANCE_STATUS, CONNECTION_UPDATE eventos
 */
export enum ZApiEventType {
  MESSAGE_RECEIVED = 'received-callback', // 📨 Webhook de mensagem recebida
  MESSAGE_STATUS = 'delivery-callback'    // 📋 Webhook de status de mensagem
}

/**
 * @anchor types:ZApiContact
 * @description Interface para dados de contato WhatsApp
 * @flow Define estrutura de contato compartilhado ou remetente
 * @dependencies Nenhuma dependência externa
 * @validation phone obrigatório, outros campos opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar campos vCard, status, business info
 */
export interface ZApiContact {
  phone: string;        // 📱 Número de telefone no formato internacional
  name?: string;        // 👤 Nome do contato (opcional)
  profilePic?: string;  // 🖼️ URL da foto de perfil (opcional)
}

/**
 * @anchor types:ZApiImageData
 * @description Interface para dados de mensagem de imagem
 * @flow Define estrutura de imagem com metadados opcionais
 * @dependencies Nenhuma dependência externa
 * @validation imageUrl obrigatório, demais campos opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar validação de formato de imagem, tamanho máximo
 */
export interface ZApiImageData {
  caption?: string;     // 📝 Legenda da imagem (opcional)
  imageUrl: string;     // 🖼️ URL da imagem (obrigatório)
  thumbnailUrl?: string; // 🖼️ URL da miniatura (opcional)
  mimeType?: string;    // 📋 Tipo MIME da imagem (opcional)
}

/**
 * @anchor types:ZApiAudioData
 * @description Interface para dados de mensagem de áudio
 * @flow Define estrutura de áudio com suporte a PTT
 * @dependencies Nenhuma dependência externa
 * @validation audioUrl obrigatório, demais campos opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar duration, waveform para áudios longos
 */
export interface ZApiAudioData {
  audioUrl: string;  // 🎵 URL do arquivo de áudio (obrigatório)
  mimeType?: string; // 📋 Tipo MIME do áudio (opcional)
  ptt?: boolean;     // 🎤 Indica se é Push-to-Talk/nota de voz (opcional)
}

/**
 * @anchor types:ZApiVideoData
 * @description Interface para dados de mensagem de vídeo
 * @flow Define estrutura de vídeo com caption opcional
 * @dependencies Nenhuma dependência externa
 * @validation videoUrl obrigatório, demais campos opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar duration, resolution, thumbnail automático
 */
export interface ZApiVideoData {
  caption?: string;  // 📝 Legenda do vídeo (opcional)
  videoUrl: string;  // 🎥 URL do arquivo de vídeo (obrigatório)
  mimeType?: string; // 📋 Tipo MIME do vídeo (opcional)
}

/**
 * @anchor types:ZApiDocumentData
 * @description Interface para dados de mensagem de documento
 * @flow Define estrutura de documento/arquivo anexado
 * @dependencies Nenhuma dependência externa
 * @validation documentUrl obrigatório, demais campos opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar fileSize, downloadCount, expiration
 */
export interface ZApiDocumentData {
  documentUrl: string; // 📄 URL do documento (obrigatório)
  fileName?: string;   // 📝 Nome do arquivo (opcional)
  mimeType?: string;   // 📋 Tipo MIME do documento (opcional)
  title?: string;      // 📌 Título do documento (opcional)
}

/**
 * @anchor types:ZApiLocation
 * @description Interface para dados de localização geográfica
 * @flow Define coordenadas e metadados de localização
 * @dependencies Nenhuma dependência externa
 * @validation latitude e longitude obrigatórios, demais opcionais
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar accuracy, altitude, speed para live location
 */
export interface ZApiLocation {
  latitude: number;     // 🌍 Latitude da localização (obrigatório)
  longitude: number;    // 🌍 Longitude da localização (obrigatório)
  description?: string; // 📝 Descrição do local (opcional)
  address?: string;     // 🏠 Endereço formatado (opcional)
}

/**
 * @anchor types:ZApiButtonResponse
 * @description Interface para resposta de botão interativo
 * @flow Define estrutura de resposta quando usuário clica em botão
 * @dependencies Nenhuma dependência externa
 * @validation Todos os campos obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar timestamp, context da mensagem original
 */
export interface ZApiButtonResponse {
  buttonId: string;   // 🆔 ID único do botão clicado
  buttonText: string; // 📝 Texto do botão que foi clicado
  type: 'button_reply'; // 🔄 Tipo fixo para identificação
}

/**
 * @anchor types:ZApiListResponse
 * @description Interface para resposta de lista interativa
 * @flow Define estrutura complexa de lista com seções e itens
 * @dependencies Nenhuma dependência externa
 * @validation title e buttonText obrigatórios, seções com estrutura definida
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar maxItems, multiSelect, validation de limites
 */
export interface ZApiListResponse {
  listType: string;     // 📋 Tipo da lista (single_select, multi_select)
  title: string;        // 📝 Título principal da lista
  description?: string; // 📄 Descrição adicional (opcional)
  buttonText: string;   // 🔄 Texto do botão de ação
  sections: Array<{     // 📋 Seções da lista
    title: string;      // 📝 Título da seção
    rows: Array<{       // 📋 Itens da seção
      id: string;       // 🆔 ID único do item
      title: string;    // 📝 Título do item
      description?: string; // 📄 Descrição do item (opcional)
    }>;
  }>;
}

/**
 * @anchor types:ZApiMessage
 * @description Interface principal para mensagens recebidas da Z-API
 * @flow Define estrutura completa de mensagem com todos tipos de conteúdo
 * @dependencies ZApiImageData, ZApiAudioData, ZApiVideoData, ZApiDocumentData, ZApiLocation
 * @validation instanceId, messageId, phone, fromMe, momment, type obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar support para polls, reactions, quoted messages
 */
export interface ZApiMessage {
  waitingMessage?: boolean; // ⏳ Indica se é mensagem de espera
  isGroup?: boolean;        // 👥 Indica se é mensagem de grupo
  isNewsletter?: boolean;   // 📨 Indica se é de newsletter/canal
  instanceId: string;       // 🆔 ID da instância Z-API (obrigatório)
  messageId: string;        // 🆔 ID único da mensagem (obrigatório)
  phone: string;            // 📱 Número do remetente (obrigatório)
  fromMe: boolean;          // 🤖 Indica se foi enviada pelo bot (obrigatório)
  momment: number;          // ⏰ Timestamp da mensagem (obrigatório)
  status?: string;          // 📋 Status da mensagem (opcional)
  chatName?: string;        // 📝 Nome do chat/grupo (opcional)
  senderName?: string;      // 👤 Nome do remetente (opcional)
  senderPhoto?: string;     // 🖼️ Foto do remetente (opcional)
  type: string;             // 📋 Tipo da mensagem (obrigatório)

  // 📈 CONTEÚDO: Tipos de conteúdo suportados (mutuamente exclusivos)
  text?: {                  // 💬 Mensagem de texto
    message: string;
  };
  image?: ZApiImageData;    // 🖼️ Mensagem de imagem
  audio?: ZApiAudioData;    // 🎵 Mensagem de áudio
  video?: ZApiVideoData;    // 🎥 Mensagem de vídeo
  document?: ZApiDocumentData; // 📄 Mensagem de documento
  location?: ZApiLocation;  // 📍 Mensagem de localização
}

/**
 * @anchor types:ZApiStatus
 * @description Interface para webhooks de status de mensagem
 * @flow Define estrutura de atualizações de entrega/leitura
 * @dependencies ZApiStatusType enum
 * @validation messageId, instanceId, phone, status, momment obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar timestamp de cada transição de status
 */
export interface ZApiStatus {
  messageId: string;        // 🆔 ID da mensagem referenciada (obrigatório)
  instanceId: string;       // 🆔 ID da instância Z-API (obrigatório)
  phone: string;            // 📱 Número do destinatário (obrigatório)
  status: ZApiStatusType;   // 📋 Status atual da mensagem (obrigatório)
  momment: number;          // ⏰ Timestamp da atualização (obrigatório)
  chatName?: string;        // 📝 Nome do chat/grupo (opcional)
  senderName?: string;      // 👤 Nome do remetente original (opcional)
  participantPhone?: string; // 📱 Telefone do participante em grupo (opcional)
  isGroup?: boolean;        // 👥 Indica se é mensagem de grupo (opcional)
}

/**
 * @anchor types:ZApiWebhookPayload
 * @description Interface para payload completo de webhook Z-API
 * @flow Define estrutura unificada para todos tipos de webhook
 * @dependencies ZApiEventType, ZApiMessage, ZApiStatus
 * @validation event e instanceId obrigatórios, data varia por tipo
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar version, signature para validação de segurança
 */
export interface ZApiWebhookPayload {
  event: ZApiEventType;           // 📋 Tipo do evento webhook (obrigatório)
  instanceId: string;             // 🆔 ID da instância origem (obrigatório)
  data: ZApiMessage | ZApiStatus; // 📆 Dados do evento (varia por tipo)
}

/**
 * @anchor types:ZApiSendMessageRequest
 * @description Interface para requisições de envio de mensagem via Z-API
 * @flow Define estrutura para envio de todos tipos de conteúdo
 * @dependencies Nenhuma dependência externa
 * @validation phone obrigatório, pelo menos um tipo de conteúdo necessário
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar support para templates, bottons, lists
 */
export interface ZApiSendMessageRequest {
  phone: string;        // 📱 Número destinatário (obrigatório)
  message?: string;     // 💬 Mensagem de texto (opcional)
  image?: {             // 🖼️ Envio de imagem
    image: string;      // 🖼️ URL ou base64 da imagem
    caption?: string;   // 📝 Legenda da imagem (opcional)
  };
  audio?: {             // 🎵 Envio de áudio
    audio: string;      // 🎵 URL ou base64 do áudio
  };
  video?: {             // 🎥 Envio de vídeo
    video: string;      // 🎥 URL ou base64 do vídeo
    caption?: string;   // 📝 Legenda do vídeo (opcional)
  };
  document?: {          // 📄 Envio de documento
    document: string;   // 📄 URL ou base64 do documento
    fileName?: string;  // 📝 Nome do arquivo (opcional)
  };
  location?: {          // 📍 Envio de localização
    latitude: number;   // 🌍 Latitude da localização
    longitude: number;  // 🌍 Longitude da localização
    name?: string;      // 📝 Nome do local (opcional)
    address?: string;   // 🏠 Endereço formatado (opcional)
  };
}

/**
 * @anchor types:ZApiResponse
 * @description Interface genérica para respostas da API Z-API
 * @flow Define estrutura padrão de resposta com genéricos
 * @dependencies Nenhuma dependência externa (genérica)
 * @validation success obrigatório, data varia por tipo T
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar status code, rate limit info, request id
 */
export interface ZApiResponse<T = any> {
  success: boolean; // ✅ Indica se operação foi bem-sucedida (obrigatório)
  data?: T;         // 📆 Dados da resposta (tipo genérico)
  error?: string;   // ⚠️ Mensagem de erro (se success = false)
  message?: string; // 💬 Mensagem informativa adicional
}

/**
 * @anchor types:ZApiInstanceInfo
 * @description Interface para informações de instância WhatsApp
 * @flow Define estrutura de status e dados da instância
 * @dependencies Nenhuma dependência externa
 * @validation instanceId e status obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar lastSeen, webhookUrl, settings
 */
export interface ZApiInstanceInfo {
  instanceId: string;   // 🆔 ID único da instância (obrigatório)
  status: 'connected' | 'disconnected' | 'connecting'; // 🔄 Status da conexão
  qrcode?: string;      // 📦 QR Code para conexão (quando connecting)
  phone?: string;       // 📱 Número conectado (quando connected)
  profileName?: string; // 👤 Nome do perfil (quando connected)
  profilePic?: string;  // 🖼️ Foto do perfil (quando connected)
}

/**
 * @anchor types:MappingData
 * @description Interface para mapeamento entre Z-API e Chatwoot
 * @flow Define relação entre contatos/conversas dos sistemas
 * @dependencies Nenhuma dependência externa
 * @validation IDs numéricos, zapiPhone, timestamps obrigatórios
 * @errors Nenhum erro específico desta interface
 * @todo Adicionar sync status, metadata, custom fields
 */
export interface MappingData {
  chatwootContactId: number;      // 🆔 ID do contato no Chatwoot (obrigatório)
  chatwootConversationId: number; // 🆔 ID da conversa no Chatwoot (obrigatório)
  zapiPhone: string;              // 📱 Número Z-API mapeado (obrigatório)
  contactName?: string;           // 👤 Nome do contato (opcional)
  lastMessageAt: Date;            // ⏰ Última mensagem recebida (obrigatório)
  createdAt: Date;                // ⏰ Data de criação do mapping (obrigatório)
  updatedAt: Date;                // ⏰ Data da última atualização (obrigatório)
}