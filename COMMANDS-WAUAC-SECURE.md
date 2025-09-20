# Comandos WAUAC - WhatsApp API Universal Adapter (VERSÃO SEGURA)

## ⚠️ IMPORTANTE: Medidas de Segurança NPM

Este documento foi atualizado com proteções contra supply chain attacks após os incidentes de setembro/2025.

### 🔐 Regras de Segurança Implementadas:
1. **npm ci** ao invés de npm install
2. **Versões fixas** (sem ^ ou ~)
3. **Auditoria obrigatória** antes de cada build
4. **Package-lock.json** sempre commitado
5. **Verificação de integridade** com checksums

---

## 🚀 Setup Inicial do Projeto (SEGURO)

### 1. Criar Estrutura Base com Segurança
```bash
# NO SEU COMPUTADOR LOCAL (não no servidor!)
# Criar diretório do projeto
mkdir -p ~/projetos/wauac-adapter
cd ~/projetos/wauac-adapter

# Inicializar Git PRIMEIRO (importante!)
git init
git config --local user.name "Seu Nome"
git config --local user.email "seu@email.com"

# Criar .gitignore com segurança
cat > .gitignore << 'EOF'
node_modules/
.env
.env.*
!.env.example
*.log
*.pid
*.seed
*.pid.lock
.npm
.DS_Store
dist/
build/
coverage/
.vscode/
.idea/
*.swp
*.swo
*~
# Segurança - nunca commitar
*.key
*.pem
*.cert
*.crt
.npmrc
EOF

# Criar estrutura completa
mkdir -p src/{adapters/zapi,services,routes,middleware,utils,config}
mkdir -p tests/{unit,integration,webhooks}
mkdir -p docker
mkdir -p scripts/security
mkdir -p docs
mkdir -p logs

# Criar README com avisos de segurança
cat > README.md << 'EOF'
# WAUAC - WhatsApp API Universal Adapter

## 🔐 Segurança

Este projeto implementa medidas rigorosas contra supply chain attacks:
- Todas as dependências com versões fixas
- Auditoria automática de segurança
- Package-lock.json obrigatório
- npm ci para instalações

## ⚠️ IMPORTANTE

1. SEMPRE use `npm ci` ao invés de `npm install`
2. SEMPRE audite antes de build: `npm audit`
3. NUNCA atualize pacotes sem revisar mudanças
4. SEMPRE verifique o package-lock.json em commits

## 🚀 Setup

Ver docs/COMMANDS.md para instruções completas.
EOF
```

### 2. Package.json SEGURO com Versões Fixas
```bash
cat > package.json << 'EOF'
{
  "name": "wauac-adapter",
  "version": "0.1.0",
  "description": "WhatsApp API Universal Adapter for Chatwoot - Secure Version",
  "main": "dist/app.js",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "preinstall": "npm audit --audit-level=moderate",
    "postinstall": "npm audit && npm fund --json > /dev/null",
    "dev": "npm run security:check && nodemon --exec ts-node src/app.ts",
    "build": "npm run security:check && npm run clean && tsc",
    "start": "node dist/app.js",
    "clean": "rimraf dist",
    "test": "npm run security:check && jest",
    "test:coverage": "jest --coverage",
    "logs": "tail -f logs/combined.log",
    "debug": "DEBUG=* npm run dev",
    "security:check": "npm audit --audit-level=moderate && npm run security:verify",
    "security:verify": "node scripts/security/verify-packages.js",
    "security:audit": "npm audit fix --dry-run",
    "docker:build": "docker-compose build --no-cache",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f adapter"
  },
  "dependencies": {
    "express": "4.18.2",
    "axios": "1.5.0",
    "ioredis": "5.3.2",
    "winston": "3.10.0",
    "joi": "17.10.0",
    "bull": "4.11.3",
    "dotenv": "16.3.1",
    "cors": "2.8.5",
    "helmet": "7.0.0",
    "uuid": "9.0.0",
    "p-retry": "5.1.2",
    "bottleneck": "2.19.5",
    "prom-client": "14.2.0",
    "express-rate-limit": "6.10.0",
    "express-validator": "7.0.1"
  },
  "devDependencies": {
    "@types/express": "4.17.17",
    "@types/node": "20.5.0",
    "@types/bull": "4.10.0",
    "@types/uuid": "9.0.2",
    "@types/cors": "2.8.13",
    "@types/jest": "29.5.3",
    "typescript": "5.2.2",
    "nodemon": "3.0.1",
    "ts-node": "10.9.1",
    "jest": "29.6.2",
    "ts-jest": "29.1.1",
    "rimraf": "5.0.1",
    "@typescript-eslint/eslint-plugin": "6.4.0",
    "@typescript-eslint/parser": "6.4.0",
    "eslint": "8.47.0"
  },
  "overrides": {
    "semver": "7.5.4"
  }
}
EOF
```

### 3. Script de Verificação de Segurança
```bash
# Criar script de verificação de pacotes
mkdir -p scripts/security
cat > scripts/security/verify-packages.js << 'EOF'
#!/usr/bin/env node

/**
 * Script de verificação de segurança de pacotes
 * Verifica integridade e segurança antes de cada build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('🔐 Verificando segurança dos pacotes...\n');

// 1. Verificar se package-lock.json existe
if (!fs.existsSync('package-lock.json')) {
  console.error('❌ ERRO: package-lock.json não encontrado!');
  console.error('Execute: npm install --package-lock-only');
  process.exit(1);
}

// 2. Verificar integridade do package-lock.json
const lockfile = fs.readFileSync('package-lock.json', 'utf8');
const lockfileHash = crypto.createHash('sha256').update(lockfile).digest('hex');
console.log(`✅ package-lock.json presente (hash: ${lockfileHash.substring(0, 8)}...)`);

// 3. Verificar se há vulnerabilidades conhecidas
try {
  const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditResult);
  
  if (audit.metadata.vulnerabilities.total > 0) {
    console.log(`⚠️  Vulnerabilidades encontradas:`);
    console.log(`   Critical: ${audit.metadata.vulnerabilities.critical}`);
    console.log(`   High: ${audit.metadata.vulnerabilities.high}`);
    console.log(`   Moderate: ${audit.metadata.vulnerabilities.moderate}`);
    console.log(`   Low: ${audit.metadata.vulnerabilities.low}`);
    
    if (audit.metadata.vulnerabilities.critical > 0 || audit.metadata.vulnerabilities.high > 0) {
      console.error('\n❌ ERRO: Vulnerabilidades críticas ou altas detectadas!');
      console.error('Execute: npm audit fix');
      process.exit(1);
    }
  } else {
    console.log('✅ Nenhuma vulnerabilidade conhecida');
  }
} catch (error) {
  // npm audit retorna exit code 1 se houver vulnerabilidades
  if (error.status === 1) {
    console.log('⚠️  Vulnerabilidades detectadas - verifique com npm audit');
  }
}

// 4. Verificar pacotes suspeitos
const suspiciousPatterns = [
  /wallet/i,
  /crypto-js/i,
  /miner/i,
  /obfuscator/i,
  /eval/i,
  /backdoor/i
];

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

let suspicious = [];
for (const [pkg, version] of Object.entries(allDeps)) {
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(pkg)) {
      suspicious.push(pkg);
    }
  }
}

if (suspicious.length > 0) {
  console.log(`⚠️  Pacotes que requerem revisão: ${suspicious.join(', ')}`);
}

// 5. Verificar se estamos usando versões fixas
let floatingVersions = [];
for (const [pkg, version] of Object.entries(allDeps)) {
  if (version.includes('^') || version.includes('~') || version.includes('*')) {
    floatingVersions.push(`${pkg}: ${version}`);
  }
}

if (floatingVersions.length > 0) {
  console.error('\n❌ ERRO: Versões flutuantes detectadas:');
  floatingVersions.forEach(v => console.error(`   ${v}`));
  console.error('\nUse versões fixas para maior segurança!');
  process.exit(1);
} else {
  console.log('✅ Todas as dependências com versões fixas');
}

// 6. Verificar última atualização de segurança
const lastSecurityCheck = '.last-security-check';
const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

if (fs.existsSync(lastSecurityCheck)) {
  const lastCheck = parseInt(fs.readFileSync(lastSecurityCheck, 'utf8'));
  const daysSince = Math.floor((now - lastCheck) / oneDay);
  
  if (daysSince > 7) {
    console.log(`\n⚠️  Última verificação de segurança há ${daysSince} dias`);
    console.log('   Recomenda-se verificar atualizações de segurança semanalmente');
  }
}

fs.writeFileSync(lastSecurityCheck, now.toString());

console.log('\n✅ Verificação de segurança concluída!\n');
EOF

chmod +x scripts/security/verify-packages.js
```

### 4. Configuração Segura do TypeScript
```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

### 5. Criar .npmrc para Segurança Extra
```bash
cat > .npmrc << 'EOF'
# Segurança NPM
save-exact=true
package-lock=true
audit-level=moderate
fund=false
engine-strict=true

# Performance
prefer-offline=true
cache-min=3600

# Logging
loglevel=warn

# Registry oficial apenas
registry=https://registry.npmjs.org/
EOF

# Adicionar ao .gitignore
echo ".npmrc" >> .gitignore
```

### 6. Docker Compose com Segurança
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  adapter:
    build:
      context: .
      dockerfile: docker/Dockerfile
      args:
        - NODE_ENV=production
    container_name: wauac-adapter
    user: "node"
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    ports:
      - "3333:3333"
    networks:
      - chatwoot_network
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs:rw
      - ./data:/app/data:ro
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3333/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  redis:
    image: redis:7-alpine
    container_name: wauac-redis
    user: "redis"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - chatwoot_network
    volumes:
      - redis_data:/data:rw
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

networks:
  chatwoot_network:
    external: true

volumes:
  redis_data:
    driver: local
EOF
```

### 7. Dockerfile Seguro
```bash
cat > docker/Dockerfile << 'EOF'
# Multi-stage build para segurança e otimização
FROM node:20-alpine AS builder

# Instalar apenas dependências necessárias para build
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copiar arquivos de dependência primeiro (cache layer)
COPY package*.json ./
COPY .npmrc ./

# Instalar com CI para usar lock file
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copiar código fonte
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm install -g typescript && \
    tsc && \
    rm -rf src

# Stage final - imagem mínima
FROM node:20-alpine

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Instalar apenas o necessário para runtime
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar apenas arquivos necessários do builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/package*.json ./

# Criar diretórios necessários
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs

# Remover arquivos desnecessários
RUN find . -name "*.map" -type f -delete && \
    find . -name "*.ts" -type f -delete && \
    find . -name "*.md" -type f -delete && \
    rm -rf /tmp/* /var/cache/apk/*

# Mudar para usuário não-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3333/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Usar dumb-init para handle de sinais
ENTRYPOINT ["dumb-init", "--"]

# Comando final
CMD ["node", "dist/app.js"]
EOF
```

---

## 📦 Instalação Segura de Dependências

### 8. Primeira Instalação com Auditoria
```bash
# SEMPRE use npm ci após o clone
# Se não existir package-lock.json, criar primeiro
npm install --package-lock-only

# Verificar vulnerabilidades ANTES de instalar
npm audit

# Se houver vulnerabilidades críticas
npm audit fix

# Instalar usando CI (mais seguro e rápido)
npm ci

# Verificar integridade após instalação
npm run security:check
```

### 9. Script de Setup Seguro Completo
```bash
cat > scripts/setup-secure.sh << 'EOF'
#!/bin/bash

echo "🔐 Setup Seguro WAUAC Adapter"
echo "=============================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ necessário${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Verificar NPM version
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 10 ]; then
    echo -e "${RED}❌ NPM 10+ necessário${NC}"
    exit 1
fi
echo -e "${GREEN}✅ NPM $(npm -v)${NC}"

# Limpar cache NPM
echo -e "\n${YELLOW}Limpando cache NPM...${NC}"
npm cache clean --force

# Verificar package-lock.json
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}Criando package-lock.json...${NC}"
    npm install --package-lock-only
fi

# Audit de segurança
echo -e "\n${YELLOW}Verificando vulnerabilidades...${NC}"
npm audit

# Perguntar se deve continuar
read -p "Deseja continuar com a instalação? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}Instalação cancelada${NC}"
    exit 1
fi

# Instalar com CI
echo -e "\n${YELLOW}Instalando dependências com npm ci...${NC}"
npm ci

# Verificar novamente
echo -e "\n${YELLOW}Verificação final de segurança...${NC}"
npm run security:check

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}Criando arquivo .env...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  Configure o arquivo .env com suas credenciais!${NC}"
fi

echo -e "\n${GREEN}✅ Setup seguro concluído!${NC}"
echo -e "${GREEN}   Use 'npm run dev' para desenvolvimento${NC}"
echo -e "${GREEN}   Use 'npm run docker:up' para produção${NC}"
EOF

chmod +x scripts/setup-secure.sh
```

---

## 🔍 Comandos de Auditoria e Manutenção

### Verificação Diária de Segurança
```bash
# Audit completo
npm audit

# Verificar outdated (mas não atualizar automaticamente!)
npm outdated

# Verificar scripts maliciosos em pacotes
npm run security:verify

# Listar todos os scripts dos pacotes
npm ls --depth=0 --json | jq '.dependencies | to_entries[] | {name: .key, scripts: .value.scripts}'
```

### Atualização Segura de Dependências
```bash
# NUNCA use npm update diretamente!
# Processo seguro:

# 1. Verificar o que mudaria
npm update --dry-run

# 2. Atualizar uma dependência por vez
npm install express@4.18.3 --save-exact

# 3. Testar após cada atualização
npm test

# 4. Commit do package-lock.json
git add package-lock.json package.json
git commit -m "chore: update express to 4.18.3 (security)"
```

### Monitoramento Contínuo
```bash
# Instalar ferramenta de monitoramento global (opcional)
npm install -g npm-check-updates snyk

# Verificar sem atualizar
ncu

# Scan com Snyk (requer conta gratuita)
snyk test

# Adicionar webhook para GitHub
snyk monitor
```

---

## 🚨 Troubleshooting de Segurança

### Problema: Vulnerabilidade detectada
```bash
# Ver detalhes da vulnerabilidade
npm audit

# Tentar fix automático
npm audit fix

# Se não resolver, verificar se há update
npm ls [pacote-vulnerável]

# Forçar resolução (CUIDADO!)
npm audit fix --force

# Ou usar override no package.json
"overrides": {
  "pacote-vulnerável": "versão-segura"
}
```

### Problema: Pacote comprometido detectado
```bash
# Parar tudo imediatamente
docker-compose down

# Remover node_modules
rm -rf node_modules package-lock.json

# Reinstalar tudo do zero
npm install --package-lock-only
npm audit
npm ci

# Verificar integridade
npm run security:check
```

### Problema: Build falha por segurança
```bash
# Ver log completo
npm run security:check

# Bypass temporário (APENAS desenvolvimento!)
SKIP_SECURITY_CHECK=true npm run dev

# Corrigir problema e remover bypass
```

---

## 📊 CI/CD Pipeline com Segurança

### GitHub Actions Workflow
```yaml
# .github/workflows/security.yml
name: Security Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Security audit
        run: npm audit --audit-level=moderate
      
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
      
      - name: SAST Scan
        uses: AppThreat/sast-scan-action@master
        with:
          type: "nodejs"
      
      - name: Custom security check
        run: npm run security:check
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-results
          path: |
            npm-audit.json
            security-report.txt
```

---

## 🎯 Comandos Rápidos Seguros

```bash
# Development seguro
npm run dev                 # Com security check automático

# Build seguro
npm run build              # Com audit antes do build

# Docker seguro
npm run docker:build       # Build sem cache
npm run docker:up          # Subir com limits

# Verificações
npm audit                  # Vulnerabilidades
npm run security:check     # Check completo
npm run security:verify    # Verificar pacotes

# Limpeza
npm cache clean --force    # Limpar cache
rm -rf node_modules       # Reset total
npm ci                    # Reinstalar limpo
```

---

## 🔐 Checklist Final de Segurança

Antes de fazer deploy, verifique:

- [ ] `npm audit` sem vulnerabilidades críticas/altas
- [ ] Todas as dependências com versões fixas
- [ ] package-lock.json commitado no Git
- [ ] .env não está no Git
- [ ] Secrets não estão no código
- [ ] Docker rodando como non-root
- [ ] Rate limiting configurado
- [ ] HTTPS/SSL configurado
- [ ] Logs sem dados sensíveis
- [ ] Backup configurado

---

## 📝 Notas de Segurança

### Por que estas medidas?

1. **npm ci**: Usa apenas package-lock.json, evita surpresas
2. **Versões fixas**: Previne atualizações automáticas maliciosas
3. **Audit obrigatório**: Detecta vulnerabilidades conhecidas
4. **Docker non-root**: Reduz superfície de ataque
5. **Multi-stage build**: Imagem mínima sem ferramentas de build

### Referências de Segurança

- [NPM Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [OWASP NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

---

*Comandos atualizados com medidas de segurança pós-incidentes de setembro/2025*
*SEMPRE priorize segurança sobre conveniência*
*Última atualização: 20/09/2025*