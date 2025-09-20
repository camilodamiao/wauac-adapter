# Contexto Global - WAUAC (WhatsApp API Universal Adapter for Chatwoot)

**Última Atualização:** 20/09/2025

---

## 🎯 Estado Atual

- **Fase**: 🔋 Setup Inicial
- **Sprint**: Dia 0
- **Health Status**: 🟢 Ready to Start
- **Próximo Milestone**: MVP Funcional em 24h

### Resumo Executivo
Adaptador universal para conectar APIs de WhatsApp ao Chatwoot, resolvendo incompatibilidade total de formatos. Início com Z-API, arquitetura extensível para outras APIs. Foco em observabilidade e zero perda de mensagens.

---

## 🛠️ Stack Tecnológica

### Core
- **Runtime**: Node.js 20+ 
- **Framework**: Express 4.x
- **Language**: TypeScript 5.x (type safety)
- **Process Manager**: PM2 (dentro do Docker)

### Infraestrutura
- **Container**: Docker + Docker Compose
- **Cache**: Redis 7-alpine
- **Proxy**: Nginx (para SSL)
- **Network**: chatwoot_network (compartilhada)

### Observabilidade
- **Logs**: Winston (structured logging)
- **Metrics**: prom-client (Prometheus)
- **Trace**: Correlation IDs customizados
- **Debug**: Interface web própria

### Integrações
- **Z-API**: REST API (axios)
- **Chatwoot**: REST API v1
- **Webhooks**: Express raw body parser

---

## 📁 Estrutura do Projeto

```
/opt/wauac-adapter/
├── src/
│   ├── adapters/
│   │   ├── zapi/
│   │   │   ├── webhook.handler.ts    # Recebe webhooks Z-API
│   │   │   ├── translator.ts         # Traduz formatos
│   │   │   ├── sender.ts            # Envia para Z-API
│   │   │   └── types.ts             # Types Z-API
│   │   └── base.adapter.ts          # Interface base
│   ├── services/
│   │   ├── chatwoot.service.ts      # Cliente Chatwoot
│   │   ├── cache.service.ts         # Redis operations
│   │   ├── queue.service.ts         # Message queue
│   │   └── logger.service.ts        # Winston config
│   ├── routes/
│   │   ├── webhooks.routes.ts       # Todos webhooks
│   │   ├── debug.routes.ts          # Debug endpoints
│   │   └── health.routes.ts         # Health checks
│   ├── middleware/
│   │   ├── error.middleware.ts      # Error handling
│   │   ├── logging.middleware.ts    # Request logging
│   │   └── validation.middleware.ts # Input validation
│   ├── utils/
│   │   ├── correlationId.ts        # Trace IDs
│   │   └── retry.ts                # Retry logic
│   ├── config/
│   │   └── index.ts                # Config central
│   └── app.ts                      # Express app
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── tests/
│   └── webhooks/
│       ├── zapi.test.json          # Payload examples
│       └── chatwoot.test.json
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

---

## ✅ Features Implementadas

### Completas e Testadas
- ⏳ Aguardando implementação inicial

### Em Desenvolvimento
- 🚧 Setup do projeto
- 🚧 Estrutura base
- 🚧 Docker configuration

---

## 🚧 Em Desenvolvimento

### Sprint Atual - Dia 1
| Feature | Status | Progresso | Notas |
|---------|--------|-----------|-------|
| Setup Docker | 🔄 Starting | 0% | Criar Dockerfile e compose |
| Webhook Z-API | ⏳ Waiting | 0% | Endpoint /webhooks/zapi/* |
| Cache Redis | ⏳ Waiting | 0% | Mapeamento phone↔IDs |
| Chatwoot Client | ⏳ Waiting | 0% | CRUD contacts/conversations |
| Observability | ⏳ Waiting | 0% | Logs + Debug UI |

### Bloqueios
- 🚫 Nenhum bloqueio identificado

---

## 📋 Backlog Priorizado

### Dia 1 (Próximas 8 horas)
1. **[P0]** Docker setup completo
2. **[P0]** Receber webhook Z-API
3. **[P0]** Traduzir e enviar para Chatwoot
4. **[P0]** Cache funcionando
5. **[P0]** Debug interface

### Dia 2 
6. **[P1]** SSL/HTTPS setup
7. **[P1]** Métricas Prometheus
8. **[P1]** Queue com retry
9. **[P2]** Documentação completa

---

## 🐛 Problemas Conhecidos

| Tipo | Descrição | Workaround | Impacto | Prioridade |
|------|-----------|------------|---------|------------|
| - | - | - | - | - |

*Nenhum problema identificado ainda*

---

## 📊 Métricas e Performance

### Targets
- **Latência**: < 200ms p95
- **Throughput**: 1000 msg/min
- **Uptime**: 99.9%
- **Error Rate**: < 0.1%
- **Memory**: < 512MB

### Atual
- Em implementação

---

## 🗿 Decisões Técnicas (ADRs)

### ADR-001: Node.js + TypeScript
- **Data**: 20/09/2025
- **Status**: ✅ Aceito
- **Contexto**: Escolha entre Python, Node.js ou Go
- **Decisão**: Node.js por performance com webhooks, TypeScript para type safety
- **Consequências**: 
  - ✅ Melhor para I/O assíncrono
  - ✅ Ecossistema npm rico
  - ⚠️ Camilo menos familiar (mitigado com assistência)

### ADR-002: Docker desde o início
- **Data**: 20/09/2025
- **Status**: ✅ Aceito
- **Contexto**: Deploy direto vs containerizado
- **Decisão**: Docker compose desde o início
- **Consequências**:
  - ✅ Portabilidade garantida
  - ✅ Fácil replicação
  - ✅ Isolamento de dependências

### ADR-003: Redis para Cache
- **Data**: 20/09/2025
- **Status**: ✅ Aceito
- **Contexto**: Cache em memória vs persistente
- **Decisão**: Redis com TTL configurável
- **Consequências**:
  - ✅ Sobrevive a restarts
  - ✅ TTL nativo
  - ✅ Já disponível no servidor

### ADR-004: Observabilidade Integrada
- **Data**: 20/09/2025
- **Status**: ✅ Aceito
- **Contexto**: Logs básicos vs observabilidade completa
- **Decisão**: Winston + Debug UI + Correlation IDs desde MVP
- **Consequências**:
  - ✅ Troubleshooting facilitado
  - ✅ Rastreamento end-to-end
  - ⚠️ Complexidade inicial maior

---

## 💩 Débito Técnico

### Crítico
- Nenhum ainda

### Importante
- [ ] Testes automatizados (após MVP)
- [ ] CI/CD pipeline (após validação)

### Nice to Have
- [ ] Interface web de config
- [ ] Métricas em Grafana

---

## 🚀 Deploys e Releases

### Último Deploy
- **Versão**: N/A
- **Data**: -
- **Ambiente**: -

### Próximo Deploy Planejado
- **Versão**: v0.1.0-mvp
- **Data Prevista**: 21/09/2025
- **Features**: MVP completo Z-API↔Chatwoot
- **Breaking Changes**: N/A (primeira versão)

---

## 🔗 Links e Recursos

### Ambientes
- **Servidor**: 5.161.122.154
- **Adaptador**: http://5.161.122.154:3333 (futuro)
- **Debug UI**: http://5.161.122.154:3333/debug
- **Health**: http://5.161.122.154:3333/health
- **Chatwoot**: http://5.161.122.154:3000

### Documentação
- **Z-API**: https://developer.z-api.io/
- **Chatwoot API**: https://www.chatwoot.com/developers/api
- **Projeto**: /opt/wauac-adapter/

### Repositórios
- **GitHub**: [A criar]
- **Docker Hub**: [A criar se necessário]

### Ferramentas
- **Postman**: Collection em `/tests/postman/`
- **Scripts**: `/scripts/` para troubleshooting

---

## 👥 Time e Responsabilidades

| Papel | Nome | Responsabilidade | Contato |
|-------|------|------------------|---------|
| PO/Dev | Camilo | Tudo | - |
| Assistant | Claude | Suporte técnico | Este chat |

---

## 📝 Notas e Aprendizados

### Lições Aprendidas
- ✅ Z-API incompatível direto com Chatwoot (confirmado em testes)
- ✅ Necessário mapeamento phone↔contact_id↔conversation_id
- ✅ Z-API requer HTTPS para webhooks

### Decisões Importantes
- Começar com Z-API, arquitetura pronta para outras
- Observabilidade desde o início para troubleshooting
- Docker para facilitar deploy e replicação

### Dicas para Troubleshooting
```bash
# Ver logs do adaptador
docker logs wauac-adapter -f

# Verificar cache Redis
docker exec -it redis redis-cli
> KEYS *
> GET phone:5511999999999

# Testar webhook localmente
curl -X POST http://localhost:3333/webhooks/zapi/message-received \
  -H "Content-Type: application/json" \
  -d @tests/webhooks/zapi.test.json

# Debug UI
http://5.161.122.154:3333/debug
```

---

## 🚨 Ações Imediatas Necessárias

1. **[AGORA]** SSH no servidor e criar estrutura base
2. **[AGORA]** Configurar Docker compose
3. **[PRÓXIMO]** Implementar webhook receiver
4. **[PRÓXIMO]** Testar com Z-API real

---

## 📈 Evolução do Projeto

### Changelog
- **20/09/2025**: Projeto iniciado, decisões técnicas tomadas

### Projeção
- **24 horas**: MVP funcional Z-API↔Chatwoot
- **48 horas**: Produção com SSL e métricas
- **1 semana**: Suporte multi-API

---

*Este documento é a fonte de verdade do projeto. Mantenha-o atualizado!*
*Última pessoa a atualizar: Claude em 20/09/2025*
*Para usar: Copie este documento para /opt/wauac-adapter/docs/CONTEXT.md*