# Dropshipping Management System (PMS)

Sistema completo de gestão para operação de Dropshipping sem estoque físico, atuando como HUB entre Fornecedores e Marketplaces (Mercado Livre).

## 🚀 Tecnologias

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite (Dev), JWT.
- **Mobile**: React Native, Expo, Context API, Axios.

## ✨ Funcionalidades (MVP)

### 1. Gestão de Produtos e Estoque
- **Multi-Fornecedores**: Suporte a múltiplos fornecedores para um mesmo produto.
- **Estoque Virtual**: Controle de estoque virtual (do fornecedor) e estoque de segurança.
- **Cálculo de Preço**: Definição automática de preço final baseada em margem fixa ou dinâmica.
- **Estoque Consolidado**: O sistema calcula automaticamente o estoque disponível para venda (Virtual - Segurança).

### 2. Gestão de Pedidos
- **Fluxo de Status**: Novo -> Enviado ao Fornecedor -> Em Envio (Rastreio) -> Entregue.
- **Criação Manual**: Permite criar pedidos manualmente (vendas diretas).
- **Rastreamento**: Inserção de código de rastreio e atualização de status.

### 3. Dashboard e Notificações
- **Métricas**: Vendas totais, pedidos pendentes, produtos com estoque baixo.
- **Alertas**: Sistema de notificações interno para avisar sobre estoque crítico (< 5 unidades) e novos pedidos.

### 4. Autenticação e Segurança
- Login seguro com JWT.
- Armazenamento seguro de tokens no dispositivo móvel.

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js (v18+)
- NPM ou Yarn
- Expo Go (Mobile)

### Backend

1. Entre na pasta `backend`:
   ```bash
   cd backend
   npm install
   ```

2. Configure o Banco de Dados:
   ```bash
   npx prisma migrate dev
   ```

3. Crie o usuário Admin inicial:
   ```bash
   npx ts-node prisma/seed.ts
   ```
   *Login:* `admin@pms.com` | *Senha:* `123456`

4. Configure as variáveis de ambiente no arquivo `.env` (crie se não existir):
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="seu_segredo_jwt"
   ML_CLIENT_ID="seu_app_id_ml"
   ML_CLIENT_SECRET="seu_secret_ml"
   ML_REDIRECT_URI="http://localhost:3000/api/mercadolivre/callback"
   ```

5. Inicie o servidor:
   ```bash
   npm run dev
   ```

### Mobile

1. Entre na pasta `mobile`:
   ```bash
   cd mobile
   npm install
   ```

2. Configure o IP da API:
   - Abra `src/services/api.ts`.
   - Altere `baseURL` para o IP da sua máquina local (ex: `http://192.168.1.15:3000`).

3. Rode o projeto:
   ```bash
   npx expo start --clear
   ```

## 📦 Estrutura do Banco de Dados (Prisma)

- **Product**: Mantém dados globais e estoque consolidado.
- **Supplier**: Dados dos fornecedores.
- **ProductSupplier**: Tabela pivô (N:N) que gerencia preço e estoque específico de cada fornecedor para cada produto.
- **Order**: Pedidos de venda.
- **Notification**: Alertas do sistema.

## 🔜 Próximos Passos (Roadmap)

1. **Integração Mercado Livre**: OAuth e Sincronização de Anúncios.
2. **Push Notifications**: Integração com Expo Notifications para alertas no celular.
3. **Relatórios Avançados**: Gráficos de vendas por período.