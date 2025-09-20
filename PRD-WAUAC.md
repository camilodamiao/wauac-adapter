# PRD - WhatsApp API Universal Adapter for Chatwoot (WAUAC)

## 1. Visão Geral

### Problema
O Chatwoot não consegue se comunicar diretamente com APIs de WhatsApp (Z-API, Evolution, WAHA) devido a incompatibilidade total de formatos de webhook e estrutura de mensagens. Cada API usa seu próprio formato proprietário, impossibilitando integração direta.

### Solução Proposta  
Desenvolver um adaptador universal que atue como tradutor bidirecional entre qualquer API de WhatsApp e o Chatwoot, começando com Z-API. O adaptador receberá webhooks em formato nativo, traduzirá para o formato Chatwoot, gerenciará estado de conversas e roteará mensagens mantendo contexto completo.

### Proposta de Valor Única
- **Plug-and-play**: Conecta qualquer API de WhatsApp sem modificar Chatwoot
- **Observable**: Logs detalhados e métricas em cada etapa do fluxo
- **Extensível**: Arquitetura preparada para adicionar novas APIs em horas
- **Resiliente**: Recovery automático, retry inteligente, zero perda de mensagens

### Usuários-Alvo
- **Primário**: Equipes de atendimento usando Chatwoot
- **Secundário**: DevOps mantendo a integração
- **Stakeholders**: Gestores precisando de WhatsApp como canal

## 2. Requisitos Funcionais

### Features Core (MVP - Dia 1)

#### Recepção de Webhooks Z-API
- **User Story**: Como sistema, preciso receber eventos da Z-API para processar mensagens do WhatsApp
- **Critérios de Aceite**:
  - [ ] Endpoint POST /webhooks/zapi/message-received funcionando
  - [ ] Validação de payload Z-API implementada
  - [ ] Log detalhado de CADA webhook recebido
  - [ ] Health check mostrando último webhook recebido
- **Prioridade**: P0
- **Estimativa**: 2 horas

#### Tradução Z-API → Chatwoot
- **User Story**: Como adaptador, preciso converter formato Z-API para Chatwoot API
- **Critérios de Aceite**:
  - [ ] Conversão de mensagens de texto funcionando
  - [ ] Suporte a imagens (jpg, png, webp)
  - [ ] Suporte a documentos (pdf, doc, xls)
  - [ ] Suporte a áudio (opus, mp3)
  - [ ] Mapeamento phone → contact_id → conversation_id
- **Prioridade**: P0
- **Estimativa**: 3 horas

#### Gestão de Estado com Cache
- **User Story**: Como sistema, preciso manter mapeamento de conversas para correlacionar mensagens
- **Critérios de Aceite**:
  - [ ] Redis configurado e funcionando
  - [ ] Cache de mapeamentos phone ↔ IDs
  - [ ] TTL configurável (default 7 dias)
  - [ ] Endpoint GET /debug/mappings para troubleshooting
- **Prioridade**: P0
- **Estimativa**: 2 horas

#### Envio para Chatwoot
- **User Story**: Como adaptador, preciso criar contatos e conversas no Chatwoot
- **Critérios de Aceite**:
  - [ ] Auto-criação de contato se não existir
  - [ ] Auto-criação de conversa se não existir
  - [ ] Envio de mensagem na conversa correta
  - [ ] Tratamento de rate limiting
- **Prioridade**: P0
- **Estimativa**: 3 horas

#### Resposta Chatwoot → WhatsApp
- **User Story**: Como agente, quero responder no Chatwoot e a mensagem chegar no WhatsApp
- **Critérios de Aceite**:
  - [ ] Webhook /webhooks/chatwoot/message funcionando
  - [ ] Busca de phone no cache
  - [ ] Envio via Z-API (texto e mídia)
  - [ ] Confirmação de entrega
- **Prioridade**: P0
- **Estimativa**: 2 horas

#### Sistema de Observabilidade
- **User Story**: Como DevOps, preciso debugar problemas rapidamente
- **Critérios de Aceite**:
  - [ ] Logs estruturados com correlation ID
  - [ ] Dashboard /debug com últimas 100 mensagens
  - [ ] Endpoint /health com status detalhado
  - [ ] Métricas: mensagens/min, latência, erros
  - [ ] Trace completo do fluxo de cada mensagem
- **Prioridade**: P0
- **Estimativa**: 3 horas

### Features v1.0 (Dia 2)

#### Gestão de Reconexão
- Detectar desconexão Z-API
- Notificar administradores
- Queue de mensagens durante offline

#### Suporte a Grupos
- Processar mensagens de grupos WhatsApp
- Criar conversas separadas por grupo

#### Rate Limiting Inteligente
- Controle de taxa para Z-API
- Controle de taxa para Chatwoot
- Queue com priorização

### Backlog Futuro
- Interface web de configuração
- Suporte Evolution API
- Suporte WAHA
- Multi-tenant com isolamento
- Backup/restore de mapeamentos

## 3. Requisitos Não-Funcionais

### Performance
- **Latência**: < 200ms por mensagem (P95)
- **Throughput**: 1000 mensagens/minuto
- **Concorrência**: 100 webhooks simultâneos
- **Memory**: < 512MB RAM

### Segurança  
- **HTTPS**: Obrigatório para webhooks Z-API
- **Validação**: Sanitização de todos inputs
- **Secrets**: Variáveis de ambiente, nunca em código
- **Logs**: Sem dados sensíveis (sem conteúdo de mensagens em prod)

### Confiabilidade
- **Uptime**: 99.9% (43 min downtime/mês máximo)
- **Recovery**: Auto-restart em caso de crash
- **Retry**: Exponential backoff para falhas
- **Idempotência**: Mensagens duplicadas não geram duplicação

### Observabilidade
- **Logs**: Estruturados, com níveis (DEBUG, INFO, WARN, ERROR)
- **Traces**: Correlation ID em todo fluxo
- **Metrics**: Prometheus-compatible
- **Debug**: Interface web para troubleshooting

## 4. Restrições e Premissas

### Restrições
- **Servidor**: VPS Hetzner existente (5.161.122.154)
- **Porta**: 3333 para o adaptador
- **Network**: chatwoot_network (Docker)
- **Timeline**: MVP funcional em 1-2 dias

### Premissas
- Chatwoot já está funcionando corretamente
- Z-API está configurada e ativa
- Redis está disponível
- SSL certificado disponível (Let's Encrypt)

## 5. Fora de Escopo (MVP)
- Interface gráfica de configuração
- Suporte a outras APIs além de Z-API
- Backup automático de conversas
- Analytics e relatórios
- Autenticação no adaptador

## 6. Métricas de Sucesso

| Métrica | Meta | Como Medir | Quando Avaliar |
|---------|------|------------|----------------|
| Taxa de Entrega | 100% | Logs correlacionados | Contínuo |
| Latência | < 200ms | Timestamp início/fim | Contínuo |
| Uptime | 99.9% | Health checks | Diário |
| Erros | < 0.1% | Error logs | Hora em hora |

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação | Owner |
|-------|---------------|---------|-----------|--------|
| Rate limit Chatwoot | Média | Alto | Queue com retry + backoff | Camilo |
| Mudança formato Z-API | Baixa | Alto | Validação de schema + alertas | Camilo |
| Perda de cache Redis | Baixa | Médio | Recreate automático do cache | Camilo |
| SSL expirado | Baixa | Alto | Auto-renovação Let's Encrypt | Camilo |

## 8. Roadmap

### Sprint 0 - Setup (2 horas)
- [x] Servidor configurado
- [x] Docker instalado
- [ ] Estrutura do projeto
- [ ] Dependências instaladas

### Dia 1 - MVP (8 horas)
- [ ] Webhooks Z-API funcionando
- [ ] Tradução bidirecional
- [ ] Cache Redis
- [ ] Integração Chatwoot
- [ ] Observabilidade básica
- [ ] Testes com mensagens reais

### Dia 2 - Produção (4 horas)
- [ ] SSL configurado
- [ ] Métricas Prometheus
- [ ] Dashboard debug melhorado
- [ ] Documentação de troubleshooting
- [ ] Deploy final

### Semana 2 - Expansão
- [ ] Suporte Evolution API
- [ ] Interface de configuração
- [ ] Multi-tenant

---

*Última atualização: 20/09/2025*
*Para usar: Copie este documento para /opt/wauac-adapter/docs/PRD.md do novo projeto*