import Joi from 'joi';

/**
 * @anchor validation:zapiMessageSchema
 * @description Schema FLEXÍVEL que aceita QUALQUER mensagem da Z-API
 * @flow Validação mínima obrigatória + campos opcionais flexíveis
 * @dependencies Joi para validação de schema
 * @validation Apenas campos essenciais obrigatórios, resto opcional e flexível
 * @errors Falha apenas em campos críticos (instanceId, messageId, phone, fromMe, type)
 * @todo Monitorar novos tipos de mensagem da Z-API e ajustar se necessário
 */
export const zapiMessageSchema = Joi.object({
  // 🔴 CAMPOS OBRIGATÓRIOS MÍNIMOS - Só o essencial para funcionar
  instanceId: Joi.string().required(),
  messageId: Joi.string().required(),
  phone: Joi.string().required(),
  fromMe: Joi.boolean().required(),
  type: Joi.string().required(),

  // 🟡 CAMPOS BÁSICOS OPCIONAIS - Aceitar qualquer valor ou null
  momment: Joi.number().optional(),
  status: Joi.string().allow('', null).optional(),
  chatName: Joi.string().allow('', null).optional(),
  senderName: Joi.string().allow('', null).optional(),
  senderPhoto: Joi.string().allow('', null).optional(),
  photo: Joi.string().allow('', null).optional(),
  broadcast: Joi.boolean().optional(),
  isGroup: Joi.boolean().optional(),
  isNewsletter: Joi.boolean().optional(),
  waitingMessage: Joi.boolean().optional(),

  // 🔄 REPLY - Z-API usa referenceMessageId (campo principal)
  referenceMessageId: Joi.string().allow('', null).optional(),
  isReply: Joi.boolean().optional(),
  quotedMessage: Joi.object().unknown(true).optional(),
  replyMessage: Joi.object().unknown(true).optional(),
  quotedMsg: Joi.object().unknown(true).optional(),
  contextInfo: Joi.object().unknown(true).optional(),

  // 💬 TEXTO - Estrutura simples
  text: Joi.object({
    message: Joi.string().required()
  }).unknown(true).optional(),

  // 🖼️ IMAGEM - Aceitar qualquer estrutura
  image: Joi.object({
    imageUrl: Joi.string().uri().optional(),
    caption: Joi.string().allow('', null).optional()
  }).unknown(true).optional(),

  // 🎵 ÁUDIO - Aceitar qualquer estrutura
  audio: Joi.object({
    audioUrl: Joi.string().uri().optional(),
    ptt: Joi.boolean().optional()
  }).unknown(true).optional(),

  // 🎥 VÍDEO - Aceitar qualquer estrutura
  video: Joi.object({
    videoUrl: Joi.string().uri().optional(),
    caption: Joi.string().allow('', null).optional()
  }).unknown(true).optional(),

  // 📄 DOCUMENTO - Aceitar QUALQUER estrutura (problema principal resolvido)
  document: Joi.object({
    documentUrl: Joi.string().uri().optional(),
    fileName: Joi.string().allow('', null).optional(),
    documentName: Joi.string().allow('', null).optional(),
    caption: Joi.string().allow('', null).optional(),
    documentCaption: Joi.string().allow('', null).optional(),
    mimeType: Joi.string().allow('', null).optional(),
    documentMimeType: Joi.string().allow('', null).optional(),
    title: Joi.string().allow('', null).optional(),
    pageCount: Joi.number().allow(null).optional(),
    url: Joi.string().uri().optional()
  }).unknown(true).optional(),

  // 📍 LOCALIZAÇÃO - Aceitar campos vazios/nulos
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    address: Joi.string().allow('', null).optional(),
    name: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    url: Joi.string().allow('', null).optional()
  }).unknown(true).optional(),

  // 👤 CONTATO/VCARD - Múltiplos formatos
  contact: Joi.object({
    displayName: Joi.string().allow('', null).optional(),
    vCard: Joi.string().allow('', null).optional(),
    vcard: Joi.string().allow('', null).optional()
  }).unknown(true).optional(),

  vcard: Joi.object({
    displayName: Joi.string().allow('', null).optional(),
    vCard: Joi.string().allow('', null).optional(),
    vcard: Joi.string().allow('', null).optional()
  }).unknown(true).optional(),

  // 📊 ENQUETE/POLL - Aceitar qualquer estrutura
  poll: Joi.object({
    name: Joi.string().allow('', null).optional(),
    question: Joi.string().allow('', null).optional(),
    options: Joi.array().items(Joi.any()).optional(),
    choices: Joi.array().items(Joi.any()).optional()
  }).unknown(true).optional(),

  // 😄 STICKER - Aceitar qualquer estrutura
  sticker: Joi.object({
    stickerUrl: Joi.string().uri().optional(),
    url: Joi.string().uri().optional()
  }).unknown(true).optional(),

  // 😀 REACTION - Aceitar qualquer estrutura
  reaction: Joi.object({
    messageId: Joi.string().optional(),
    emoji: Joi.string().optional()
  }).unknown(true).optional(),

  // 🔘 BUTTON RESPONSE - Aceitar qualquer estrutura
  buttonResponse: Joi.object().unknown(true).optional(),

  // 📋 LIST RESPONSE - Aceitar qualquer estrutura
  listResponse: Joi.object().unknown(true).optional()

}).unknown(true); // 🔑 CRÍTICO: Permitir QUALQUER campo adicional não mapeado

/**
 * @anchor validation:zapiDebugSchema
 * @description Schema de emergência que aceita TUDO exceto campos mínimos
 * @flow Validação mínima apenas para funcionalidade básica
 * @dependencies Joi para validação de schema
 * @validation Apenas 4 campos obrigatórios: instanceId, messageId, phone, fromMe
 * @errors Falha apenas se faltarem campos críticos
 * @todo Usar apenas em caso de falha do schema principal
 */
export const zapiDebugSchema = Joi.object({
  instanceId: Joi.string().required(),
  messageId: Joi.string().required(),
  phone: Joi.string().required(),
  fromMe: Joi.boolean().required()
}).unknown(true); // Aceitar QUALQUER outro campo

/**
 * @anchor validation:zapiStatusSchema
 * @description Schema flexível para webhooks de status de mensagem
 * @flow Validação básica para status updates
 * @dependencies Joi para validação de schema
 * @validation Campos essenciais para rastreamento de status
 * @errors Falha apenas em campos críticos de status
 * @todo Monitorar novos tipos de status da Z-API
 */
export const zapiStatusSchema = Joi.object({
  messageId: Joi.string().required(),
  instanceId: Joi.string().required(),
  phone: Joi.string().required(),
  status: Joi.string().required(),
  momment: Joi.number().optional(),
  chatName: Joi.string().allow('', null).optional(),
  senderName: Joi.string().allow('', null).optional(),
  isGroup: Joi.boolean().optional()
}).unknown(true); // Permitir campos extras de status