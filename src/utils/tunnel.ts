/**
 * @anchor tunnel:startTunnel
 * @description Utilitário para criar tunnel ngrok e expor servidor local
 * @flow Conecta ngrok -> Gera URL pública -> Loga informações -> Retorna URL
 * @dependencies ngrok package, Winston logger
 * @validation port numérico válido
 * @errors Ngrok connection failed, Invalid port, Network errors
 * @todo Adicionar configuração de região, auth token, domínio customizado
 */

import ngrok from 'ngrok';
import { logger } from './logger';

/**
 * @anchor tunnel:startTunnel
 * @description Inicia tunnel ngrok para expor servidor local publicamente
 * @flow ngrok.connect() -> Loga URL -> Exibe instruções -> Retorna URL público
 * @dependencies ngrok instalado e configurado
 * @validation port deve ser número válido
 * @errors Connection failed, Auth required, Network timeout
 * @todo Implementar retry, configuração de região, domínio customizado
 */
export async function startTunnel(port: number = 3333): Promise<string> {
  try {
    // 🌐 TUNNEL: Cria tunnel ngrok para a porta especificada
    const url = await ngrok.connect(port);

    // 📝 LOG: Registra criação do tunnel
    logger.info('🌐 Ngrok tunnel criado', { url, port });

    // 🚀 DISPLAY: Exibe informações importantes no console
    console.log('\n========================================');
    console.log('🚀 WEBHOOK URL PARA Z-API:');
    console.log(`${url}/webhook/zapi/message-received`);
    console.log('========================================\n');

    return url;
  } catch (error) {
    // ⚠️ ERROR: Loga erro na criação do tunnel
    logger.error('Erro ao criar tunnel ngrok', { error });
    throw error;
  }
}

/**
 * @anchor tunnel:stopTunnel
 * @description Para o tunnel ngrok ativo
 * @flow ngrok.disconnect() -> Loga resultado
 * @dependencies ngrok ativo
 * @validation Nenhuma validação específica
 * @errors Disconnect failed
 * @todo Adicionar cleanup de recursos, verificação de status
 */
export async function stopTunnel(): Promise<void> {
  try {
    // 🛑 STOP: Para o tunnel ngrok
    await ngrok.disconnect();
    logger.info('🛑 Ngrok tunnel encerrado');
  } catch (error) {
    logger.error('Erro ao encerrar tunnel ngrok', { error });
    throw error;
  }
}

/**
 * @anchor tunnel:getTunnelUrl
 * @description Obtém URL do tunnel ativo
 * @flow ngrok.getUrl() -> Retorna URL ou null
 * @dependencies ngrok ativo
 * @validation Verifica se tunnel está ativo
 * @errors No active tunnel
 * @todo Adicionar cache da URL, verificação de saúde
 */
export async function getTunnelUrl(): Promise<string | null> {
  try {
    // 🔍 GET: Obtém URL do tunnel ativo
    const url = await ngrok.getUrl();
    return url || null;
  } catch (error) {
    logger.debug('Nenhum tunnel ngrok ativo');
    return null;
  }
}