# PMS Ops - Manifesto do Produto
**Produto:** PMS Ops  
**Versão:** v1.0 (Pré-Go-Live)

---

## 1️⃣ O QUE É O PMS Ops (E O QUE NÃO É)

### ✅ O PMS Ops É:
- Um backoffice financeiro e operacional
- Um orquestrador de vendas
- Um sistema de auditoria, liquidação e compliance
- Um middleware entre quem vende e os gateways de pagamento

### ❌ O PMS Ops NÃO É:
- Um marketplace
- Um intermediador legal da venda
- Um vendedor final
- Um banco

### 📌 Regra de ouro:
> **O PMS Ops nunca é o dono da venda, apenas processa, registra e liquida.**

---

## 2️⃣ ENTIDADES PRINCIPAIS (MODELO MENTAL)

### 🏢 Account (Empresa / Cliente PMS Ops)
- É quem contrata o PMS Ops
- É quem paga o plano
- É quem responde legalmente
- Pode ter 1 ou vários fornecedores
- Possui usuários (admins, financeiros, operadores)
- **📌 Account é o CLIENTE do PMS Ops**

### 🧾 Supplier (Fornecedor / Operador de Vendas)
- Entidade operacional
- Realiza vendas
- Recebe saldo
- Solicita saques
- Nunca paga plano diretamente
- Sempre pertence a uma Account
- **📌 Supplier NÃO é cliente do PMS Ops**

### 👤 User
- Pessoa física
- Sempre pertence a uma Account
- Pode ter roles:
  - `ADMIN`
  - `FINANCE`
  - `OPERATOR`
- Pode estar associado a:
  - Nenhum supplier
  - Um supplier
  - Vários suppliers (Enterprise)

---

## 3️⃣ TIPOS DE CLIENTE SUPORTADOS

### 🟢 Tipo A — Pessoa Física / Vendedor Solo
- Cria uma Account
- Sistema cria 1 Supplier automaticamente
- Plano básico
- 1 usuário admin
- Fluxo simples

### 🟡 Tipo B — Empresa Pequena / Média
- Cria uma Account
- Cria vários Suppliers
- Controle de usuários
- Comissão padrão por plano
- Gestão financeira centralizada

### 🔵 Tipo C — Enterprise
- Account com contrato customizado
- Limites configuráveis:
  - Nº de suppliers
  - Nº de usuários
  - Comissão customizada
- BI avançado
- Suporte dedicado

---

## 4️⃣ ONBOARDING (VERDADE ABSOLUTA)

### 🧠 REGRA FUNDAMENTAL
> **Nenhuma Account pode existir “vazia”.**

#### Fluxo Correto:
1. **Cadastro como EMPRESA (Account)**
   - Cria Account
   - Cria User ADMIN
   - Sistema cria:
     - Supplier padrão (obrigatório)
     - Wallet
     - Configuração financeira base
     - Tudo salvo automaticamente

2. **Cadastro como FORNECEDOR SOLO**
   - 👉 **É o mesmo fluxo**, mas:
     - UI simplificada
     - Supplier único
     - Recursos limitados pelo plano

**📌 Não existe “criar fornecedor depois” sem contexto.**

---

## 5️⃣ MODELO FINANCEIRO (IMUTÁVEL)

### Ledger
- É imutável
- Nunca sofre UPDATE ou DELETE
- Toda correção = novo lançamento

#### Regras:
- Pagamento confirmado → crédito no ledger
- Comissão → lançamento separado
- Estorno → contra-lançamento
- Saque → débito imutável

**📌 Saldo é sempre derivado do ledger, nunca armazenado como verdade.**

---

## 6️⃣ COMISSÕES (HIERARQUIA)

A comissão segue **ordem de prioridade**:
1. Contrato Enterprise (se existir)
2. Configuração da Account
3. Plano ativo
4. Default do sistema

**📌 Comissão nunca é hardcoded no fluxo de venda.**

---

## 7️⃣ ADMIN (LIMITES ABSOLUTOS)

### ❌ Admin NÃO pode:
- Alterar ledger
- Corrigir saldo
- Editar venda
- Apagar eventos
- “Ajustar” financeiro

### ✅ Admin pode:
- Visualizar
- Exportar
- Auditar
- Suspender Account/Supplier
- Bloquear saques
- Investigar anomalias

**📌 Admin governa, não interfere.**

---

## 8️⃣ SEGURANÇA E COMPLIANCE
- Todo pagamento é idempotente
- Todo evento é logado
- Toda falha é auditável
- Toda inconsistência vira anomalia
- Nenhum dinheiro “fantasma”

**O sistema é projetado para prova, não para conveniência.**

---

## 9️⃣ O QUE ESTÁ FORA DO ESCOPO (POR ENQUANTO)
- Multi-moeda
- Multi-país
- Marketplace público
- Wallet externa
- Cashback
- Crédito / antecipação

**📌 A arquitetura permite, mas o produto não oferece agora.**

---

## 🔟 REGRA FINAL (DOGMA)
> **Se uma funcionalidade violar qualquer item acima, ela está errada — mesmo que funcione tecnicamente.**
