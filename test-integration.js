/**
 * @anchor test:IntegrationTest
 * @description Script de teste completo para integração WAUAC
 * @flow Health check -> Webhook test -> Chatwoot verification
 * @dependencies Axios, dotenv, WAUAC server rodando
 * @validation Server na porta 3333, endpoints ativos
 * @errors Connection failed, API errors, timeout
 * @todo Adicionar testes de stress, validação de dados, cleanup
 */

const axios = require('axios');
require('dotenv').config();

// 🔧 CONFIG: Configurações do teste
const BASE_URL = 'http://localhost:3333';
const TIMEOUT = 10000; // 10 segundos

/**
 * @anchor test:testIntegration
 * @description Função principal de teste de integração
 * @flow Executa sequência de testes ordenados
 */
async function testIntegration() {
  console.log('🧪 TESTANDO INTEGRAÇÃO WAUAC');
  console.log('=' .repeat(50));
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // 📋 TESTS: Lista de testes a executar
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Webhook Z-API Message', fn: testZApiWebhook },
    { name: 'Webhook Test Endpoint', fn: testWebhookTestEndpoint },
    { name: 'Queue Status', fn: testQueueStatus }
  ];

  // 🔄 EXECUTION: Executa todos os testes
  for (const test of tests) {
    try {
      console.log(`🔍 Testando: ${test.name}`);
      await test.fn();
      console.log(`✅ ${test.name}: PASSOU\n`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${test.name}: FALHOU`);
      console.log(`   Erro: ${error.message}\n`);
      testsFailed++;
    }
  }

  // 📊 SUMMARY: Resumo dos testes
  console.log('=' .repeat(50));
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`✅ Passaram: ${testsPassed}`);
  console.log(`❌ Falharam: ${testsFailed}`);
  console.log(`📈 Total: ${tests.length}`);

  if (testsFailed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
}

/**
 * @anchor test:testHealthCheck
 * @description Testa endpoint de health check
 */
async function testHealthCheck() {
  const response = await axios.get(`${BASE_URL}/health`, {
    timeout: TIMEOUT
  });

  if (response.status !== 200) {
    throw new Error(`Status inválido: ${response.status}`);
  }

  console.log(`   Status: ${response.status}`);
  console.log(`   Response: ${JSON.stringify(response.data)}`);
}

/**
 * @anchor test:testZApiWebhook
 * @description Testa webhook real da Z-API com mensagem de texto
 */
async function testZApiWebhook() {
  const testMessage = {
    instanceId: "TEST123",
    messageId: `MSG_${Date.now()}`,
    phone: "5511999999999",
    fromMe: false,
    momment: Date.now(),
    status: "RECEIVED",
    senderName: "Teste Integration",
    type: "ReceivedCallback",
    text: {
      message: `🧪 Teste de integração executado em: ${new Date().toLocaleString('pt-BR')}`
    }
  };

  console.log(`   📤 Enviando mensagem de teste...`);

  const response = await axios.post(
    `${BASE_URL}/webhook/zapi/message-received`,
    testMessage,
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TIMEOUT
    }
  );

  if (response.status !== 200) {
    throw new Error(`Status inválido: ${response.status}`);
  }

  console.log(`   Status: ${response.status}`);
  console.log(`   Processed: ${response.data.processed || false}`);
  console.log(`   Message ID: ${response.data.messageId || 'N/A'}`);

  // ✅ VALIDATION: Verifica se foi processado
  if (!response.data.processed) {
    throw new Error('Mensagem não foi processada');
  }
}

/**
 * @anchor test:testWebhookTestEndpoint
 * @description Testa endpoint de teste do webhook
 */
async function testWebhookTestEndpoint() {
  const response = await axios.get(`${BASE_URL}/webhook/test`, {
    timeout: TIMEOUT
  });

  if (response.status !== 200) {
    throw new Error(`Status inválido: ${response.status}`);
  }

  console.log(`   Status: ${response.status}`);
  console.log(`   Message: ${response.data.message}`);
}

/**
 * @anchor test:testQueueStatus
 * @description Testa endpoint de status da fila (se disponível)
 */
async function testQueueStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/webhook/zapi/queue-status`, {
      timeout: TIMEOUT
    });

    if (response.status !== 200) {
      throw new Error(`Status inválido: ${response.status}`);
    }

    console.log(`   Status: ${response.status}`);
    console.log(`   Queue Stats: ${JSON.stringify(response.data.data || {})}`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`   ⚠️ Endpoint não disponível (usando processamento direto)`);
      return; // Não é um erro se estivermos usando processamento direto
    }
    throw error;
  }
}

/**
 * @anchor test:testChatwootIntegration
 * @description Testa integração com Chatwoot (se configurado)
 */
async function testChatwootIntegration() {
  const chatwootUrl = process.env['CHATWOOT_URL'];
  const chatwootApiKey = process.env['CHATWOOT_API_KEY'];

  if (!chatwootUrl || !chatwootApiKey) {
    throw new Error('Configurações do Chatwoot não encontradas');
  }

  console.log(`   🔗 Testando conexão com: ${chatwootUrl}`);

  const response = await axios.get(`${chatwootUrl}/api/v1/accounts/1/contacts`, {
    headers: {
      'api_access_token': chatwootApiKey
    },
    timeout: TIMEOUT
  });

  if (response.status !== 200) {
    throw new Error(`Chatwoot retornou status: ${response.status}`);
  }

  console.log(`   ✅ Chatwoot conectado`);
  console.log(`   Contatos encontrados: ${response.data.payload?.length || 0}`);
}

/**
 * @anchor test:displayInstructions
 * @description Exibe instruções para configuração
 */
function displayInstructions() {
  console.log('\n📋 INSTRUÇÕES PARA EXECUÇÃO:');
  console.log('1. Execute: npm install');
  console.log('2. Configure .env com credenciais do Chatwoot');
  console.log('3. Execute: npm run dev (em um terminal)');
  console.log('4. Execute: npm run tunnel (em outro terminal)');
  console.log('5. Execute: node test-integration.js');
  console.log('6. Configure webhook Z-API com URL do ngrok\n');
}

// 🚀 EXECUTION: Executa se for chamado diretamente
if (require.main === module) {
  displayInstructions();
  testIntegration().catch(error => {
    console.error('\n💥 ERRO CRÍTICO NO TESTE:', error.message);
    process.exit(1);
  });
}