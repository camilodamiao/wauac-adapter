const axios = require('axios');

async function testWebhook() {
  try {
    const response = await axios.post(
      'https://a7b05ae26924.ngrok-free.app/webhook/zapi/message-received',
      {
        instanceId: "TEST",
        messageId: `MSG_${Date.now()}`,
        phone: "5511999999999",
        fromMe: false,
        momment: Date.now(),
        senderName: "Teste Ngrok Real",
        type: "ReceivedCallback",
        text: { message: "Mensagem teste via ngrok!" }
      }
    );
    
    console.log('✅ Sucesso:', response.data);
    
    if (response.data.contactId) {
      console.log(`\n📱 Contato criado: ${response.data.contactId}`);
      console.log(`💬 Conversa criada: ${response.data.conversationId}`);
      console.log('\nVerifique no Chatwoot: http://5.161.122.154:3000');
    }
    
  } catch (error) {
    console.log('❌ Erro:', error.response?.data || error.message);
  }
}

testWebhook();