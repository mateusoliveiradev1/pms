# Deploy no Render - Guia Rápido

Este guia descreve como colocar o backend do PMS Ops em produção no Render.

## 1. Conectar Repositório
1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New +** -> **Web Service**
3. Conecte seu repositório GitHub/GitLab
4. Selecione a pasta raiz (root) do projeto (se for monorepo, pode ser necessário especificar `backend` como Root Directory nas configurações avançadas, mas nosso `render.yaml` tenta lidar com isso).
   * **Recomendação:** Configure "Root Directory" como `backend` nas configurações do Render se a detecção automática falhar.

## 2. Configurações de Build (Se não usar Blueprint)
* **Runtime:** Node
* **Build Command:** `npm install && npm run build`
* **Start Command:** `npm start`

## 3. Variáveis de Ambiente (Environment Variables)
Adicione as seguintes chaves no painel do Render:

| Chave | Valor (Exemplo) | Descrição |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Modo de produção |
| `NODE_VERSION` | `20.11.0` | Versão do Node |
| `DATABASE_URL` | `postgresql://...` | URL de conexão do Supabase (Transaction Pooler - porta 6543) |
| `JWT_SECRET` | `(Gerar Hash Seguro)` | Segredo para tokens JWT |
| `ADMIN_JWT_SECRET` | `(Gerar Hash Seguro)` | Segredo para tokens Admin |
| `ENCRYPTION_KEY` | `(Gerar 32 chars)` | Chave para criptografia de dados sensíveis |
| `WEBHOOK_SECRET` | `(Gerar Hash Seguro)` | Segredo para assinar webhooks internos |
| `SUPABASE_URL` | `https://xyz.supabase.co` | URL do Projeto Supabase |
| `SUPABASE_ANON_KEY` | `eyJ...` | Chave Anon do Supabase |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Chave Service Role (apenas backend) |

## 4. Finalização
Após o deploy, o Render fornecerá uma URL pública (ex: `https://pms-backend.onrender.com`).
**Copie essa URL** e atualize o `API_URL` no aplicativo mobile.
