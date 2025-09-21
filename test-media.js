const axios = require('axios');

async function testMediaWebhook() {
  try {
    // Test with image message
    const imageMessage = {
      instanceId: "TEST",
      messageId: `IMG_${Date.now()}`,
      phone: "5511999999999",
      fromMe: false,
      momment: Date.now(),
      senderName: "Teste Mídia",
      type: "ReceivedCallback",
      image: {
        caption: "Teste de imagem via webhook",
        imageUrl: "https://example.com/image.jpg",
        thumbnailUrl: "https://example.com/thumb.jpg",
        mimeType: "image/jpeg"
      }
    };

    console.log('🖼️ Testando mensagem com imagem...');
    const response = await axios.post(
      'http://localhost:3340/webhook/zapi/message-received',
      imageMessage
    );

    console.log('✅ Resposta da imagem:', response.data);

    // Test with audio message
    const audioMessage = {
      instanceId: "TEST",
      messageId: `AUD_${Date.now()}`,
      phone: "5511999999999",
      fromMe: false,
      momment: Date.now(),
      senderName: "Teste Áudio",
      type: "ReceivedCallback",
      audio: {
        audioUrl: "https://example.com/audio.mp3",
        mimeType: "audio/mpeg"
      }
    };

    console.log('🎵 Testando mensagem com áudio...');
    const audioResponse = await axios.post(
      'http://localhost:3340/webhook/zapi/message-received',
      audioMessage
    );

    console.log('✅ Resposta do áudio:', audioResponse.data);

  } catch (error) {
    console.log('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testMediaWebhook();