# Setup Local - WAUAC Development Guide

## 📋 Pré-requisitos

Antes de começar, verifique se você tem:

- [ ] **Node.js 20+** instalado ([Download](https://nodejs.org/))
- [ ] **Git** instalado ([Download](https://git-scm.com/))
- [ ] **VS Code** instalado ([Download](https://code.visualstudio.com/))
- [ ] **Docker Desktop** instalado ([Download](https://www.docker.com/products/docker-desktop/))
- [ ] **Acesso SSH** ao servidor 5.161.122.154

## 🚀 Passo a Passo Completo

### PASSO 1: Baixar os Documentos do Claude

1. **No chat do Claude**, clique em cada arquivo gerado:
   - `PRD-WAUAC.md`
   - `CONTEXT-WAUAC.md`
   - `ARCHITECTURE-WAUAC.md`
   - `COMMANDS-WAUAC-SECURE.md`
   - `INSTRUCTIONS-WAUAC-SECURE.md`

2. **Para cada arquivo**:
   - Clique no arquivo
   - Selecione todo conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

### PASSO 2: Criar Projeto Local

1. **Abra o Terminal/PowerShell**

2. **Crie a estrutura do projeto**:
```bash
# Windows
cd C:\Users\SeuUsuario\Documents
mkdir Projetos
cd Projetos
mkdir wauac-adapter
cd wauac-adapter

# Mac/Linux
cd ~/
mkdir -p projetos/wauac-adapter
cd projetos/wauac-adapter
```

3. **Abra no VS Code**:
```bash
code .
```

### PASSO 3: Organizar Documentação

No VS Code:

1. **Criar pasta docs**:
   - Clique com botão direito no explorer
   - New Folder → `docs`

2. **Criar arquivos de documentação**:
   - Dentro de `docs`, criar novo arquivo → `PRD.md`
   - Colar conteúdo do PRD-WAUAC.md
   - Repetir para todos os documentos:
     - `CONTEXT.md`
     - `ARCHITECTURE.md`
     - `COMMANDS.md` (usar COMMANDS-WAUAC-SECURE.md)
     - `INSTRUCTIONS.md` (usar INSTRUCTIONS-WAUAC-SECURE.md)

### PASSO 4: Executar Setup Inicial

1. **No terminal do VS Code** (Ctrl+`):

```bash
# Inicializar Git
git init

# Executar comandos do COMMANDS.md
# Copie os comandos da seção "1. Criar Estrutura Base com Segurança"
# Cole e execute no terminal
```

2. **Criar arquivos base**:
   - Execute os comandos das seções 2-7 do COMMANDS.md
   - Cada comando cria um arquivo necessário

### PASSO 5: Instalar Claude Coder (Extensão VS Code)

#### Opção A: Continue (Recomendado)
1. No VS Code, vá em Extensions (Ctrl+Shift+X)
2. Procure por "Continue"
3. Instale a extensão
4. Configure com API key do Anthropic/Claude

#### Opção B: Codeium
1. Procure por "Codeium"
2. Instale e crie conta gratuita
3. Configure no VS Code

#### Opção C: GitHub Copilot
1. Procure por "GitHub Copilot"
2. Requer assinatura GitHub

### PASSO 6: Configurar Ambiente

1. **Criar arquivo .env**:
```bash
cp .env.example .env
```

2. **Editar .env** com suas credenciais:
```env
# Z-API - Pegar no painel Z-API
ZAPI_INSTANCE_ID=seu_instance_id_aqui
ZAPI_TOKEN=seu_token_aqui
ZAPI_CLIENT_TOKEN=seu_client_token_aqui

# Chatwoot - Pegar no Chatwoot
CHATWOOT_URL=http://5.161.122.154:3000
CHATWOOT_API_KEY=sua_api_key_aqui
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=seu_inbox_id_aqui
```

### PASSO 7: Desenvolvimento com Claude Coder

1. **Abrir novo chat no Claude** (claude.ai)
2. **Colar INSTRUCTIONS.md** no início
3. **Começar desenvolvimento**:

```
Estou desenvolvendo o WAUAC adapter. 
Contexto: [colar parte relevante do CONTEXT.md]
Preciso implementar: [sua necessidade]
```

4. **Com Claude Coder no VS Code**:
   - Copie código gerado pelo Claude
   - Use comandos do Claude Coder para criar arquivos
   - Ou digite instruções diretas no Claude Coder

### PASSO 8: Testar Localmente

1. **Instalar dependências** (seguro):
```bash
npm run setup-secure
```

2. **Rodar em desenvolvimento**:
```bash
npm run dev
```

3. **Testar webhook**:
```bash
# Em outro terminal
curl -X POST http://localhost:3333/webhooks/zapi/message-received \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":{"text":"Teste"}}'
```

4. **Acessar Debug UI**:
   - Abrir navegador: http://localhost:3333/debug

### PASSO 9: Deploy no Servidor

Quando estiver funcionando localmente:

1. **Commit no Git**:
```bash
git add .
git commit -m "feat: initial WAUAC adapter implementation"
```

2. **Push para GitHub**:
```bash
# Criar repositório no GitHub primeiro
git remote add origin https://github.com/seu-usuario/wauac-adapter.git
git push -u origin main
```

3. **No servidor** (SSH):
```bash
ssh root@5.161.122.154
cd /opt
git clone https://github.com/seu-usuario/wauac-adapter.git
cd wauac-adapter
npm ci
docker-compose up -d
```

## 📝 Fluxo de Trabalho Diário

### Manhã
1. Abrir VS Code no projeto
2. `git pull` para sincronizar
3. Revisar `docs/CONTEXT.md`
4. Planejar tarefas do dia

### Durante Desenvolvimento
1. Criar branch: `git checkout -b feature/nome`
2. Usar Claude + Claude Coder para implementar
3. Testar localmente: `npm run dev`
4. Verificar segurança: `npm audit`

### Fim do Dia
1. Commit: `git commit -m "descrição"`
2. Push: `git push origin feature/nome`
3. Atualizar `docs/CONTEXT.md`
4. Deploy se pronto

## 🛠️ Ferramentas Úteis

### VS Code Extensions Recomendadas
- **Continue/Codeium** - AI assistance
- **ESLint** - Linting
- **Prettier** - Formatação
- **GitLens** - Git enhanced
- **Docker** - Docker support
- **Thunder Client** - API testing
- **TypeScript** - TS support

### Comandos Úteis
```bash
# Desenvolvimento
npm run dev              # Rodar local
npm run build           # Build produção
npm test                # Testes

# Segurança
npm audit               # Verificar vulnerabilidades
npm run security:check  # Check completo

# Docker
npm run docker:build    # Build image
npm run docker:up       # Subir containers
npm run docker:logs     # Ver logs

# Troubleshooting
npm run logs            # Logs locais
curl http://localhost:3333/health  # Health check
```

## 🔍 Troubleshooting Comum

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install --package-lock-only
npm ci
```

### Erro: "Port already in use"
```bash
# Windows
netstat -ano | findstr :3333
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3333
kill -9 <PID>
```

### Erro: "Docker not running"
- Abrir Docker Desktop
- Aguardar inicialização
- Tentar novamente

### Erro: "Permission denied"
```bash
# Linux/Mac
chmod +x scripts/*.sh
sudo chown -R $USER:$USER .
```

## 📚 Recursos

### Documentação
- [Node.js Docs](https://nodejs.org/docs/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Express Docs](https://expressjs.com/)
- [Docker Docs](https://docs.docker.com/)

### Nossos Docs
- `docs/PRD.md` - O que construir
- `docs/CONTEXT.md` - Estado atual
- `docs/ARCHITECTURE.md` - Como funciona
- `docs/COMMANDS.md` - Comandos prontos
- `docs/INSTRUCTIONS.md` - Para Claude

## ✅ Checklist Final

Antes de começar a desenvolver, confirme:

- [ ] VS Code aberto no projeto
- [ ] Terminal disponível
- [ ] Git configurado
- [ ] .env configurado
- [ ] Docker rodando
- [ ] npm audit sem erros críticos
- [ ] localhost:3333/health respondendo
- [ ] INSTRUCTIONS.md à mão para Claude

---

**DICA PRINCIPAL**: Use o COMMANDS.md como referência - todos os comandos estão prontos para copiar/colar!

**SUPORTE**: Se travar, abra novo chat no Claude com INSTRUCTIONS.md e descreva o problema.

*Documento criado em 20/09/2025 para facilitar início do desenvolvimento*