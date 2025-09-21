// start-tunnel.js - VERSÃO 2
const ngrok = require('ngrok');

async function start() {
  try {
    console.log('🔄 Iniciando ngrok...');
    
    // Primeiro, configurar o authtoken
    await ngrok.authtoken('3313XT01QaFsIwaOqxZH1lPyZno_5kpE1sMaWhRDEJvAJRQzL');
    
    // Depois conectar
    const url = await ngrok.connect(3333);
    
    console.log('\n========================================');
    console.log('✅ NGROK TUNNEL ATIVO!');
    console.log('URL:', url);
    console.log('');
    console.log('WEBHOOK Z-API:');
    console.log(`${url}/webhook/zapi/message-received`);
    console.log('========================================\n');
    
    // Manter rodando
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Erro:', error);
    
    // Tentar método alternativo
    console.log('\n🔄 Tentando método alternativo...\n');
    try {
      const url = await ngrok.connect({
        proto: 'http',
        addr: 3333
      });
      console.log('✅ Funcionou! URL:', url);
    } catch (error2) {
      console.error('❌ Falhou também:', error2.message);
      console.log('\nTente usar localtunnel em vez do ngrok:');
      console.log('npm install -g localtunnel');
      console.log('lt --port 3333');
    }
  }
}

process.on('SIGINT', async () => {
  await ngrok.disconnect();
  await ngrok.kill();
  process.exit(0);
});

start();