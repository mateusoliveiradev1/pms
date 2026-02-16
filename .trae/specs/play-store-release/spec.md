# Especificação de Lançamento Final (Zero Mocks / 100% Real)

## Por que

O sistema atual contém simulações (mocks) críticas em fluxos financeiros e administrativos que impedem o uso em produção. O objetivo é remover TODAS as simulações, implementar integrações reais de pagamento e garantir que todos os dados venham do banco de dados, conforme exigência de "funcionamento 100%".

## O que muda

- **Backend Financeiro**: Implementação real de cobrança via Stripe (substituindo validação de string `tok_`).
- **Backend Administrativo**: Implementação real da suspensão de contas (substituindo mensagem mockada).
- **Mobile Financeiro**: Integração com SDK nativo do Stripe para tokenização real de cartões.
- **Mobile Integrações**: Geração real de arquivos Excel (`.xlsx`).
- **Limpeza Geral**: Remoção de qualquer lógica de fallback que simule sucesso em caso de erro.

## Impacto

- **Specs afetadas**: Financeiro, Administração, Integrações.
- **Código afetado**:
  - **Backend**: `src/services/financialService.ts`, `src/controllers/systemAdminController.ts`, novo `src/services/stripeService.ts`.
  - **Mobile**: `src/screens/Financial/FinancialScreen.tsx`, `src/screens/Integrations/AdminIntegrationsScreen.tsx`.

## Requisitos ADICIONADOS

### Requisito: Gateway de Pagamento Real (Backend)

O backend DEVE processar cobranças de cartão de crédito utilizando a API do Stripe.

- Criar `StripeService` para gerenciar Clientes e Cobranças (PaymentIntents).
- Atualizar `processSubscriptionPayment` para realizar a cobrança síncrona antes de criar o registro no Ledger.
- Em caso de falha no pagamento, o fluxo deve ser interrompido e o erro retornado ao client.

### Requisito: Tokenização Segura (Mobile)

O aplicativo DEVE utilizar o SDK `@stripe/stripe-react-native` para coletar dados do cartão.

- Substituir o input de texto simples e a geração de token aleatório.
- Enviar o token/paymentMethodId real para o backend.

### Requisito: Suspensão de Conta Real (Backend)

O endpoint de suspensão de conta DEVE atualizar o status do usuário/fornecedor no banco de dados.

- Atualizar `User.status` e `Supplier.financialStatus` para `SUSPENDED`.
- Invalidar sessões ativas (se aplicável).

### Requisito: Exportação Excel Real (Mobile)

(Mantido) Implementar geração de arquivo `.xlsx` com dados reais da tela de integrações.

## Requisitos MODIFICADOS

### Requisito: Validação de Pagamento

- **Anterior**: Verificava se token começava com `tok_`.
- **Novo**: Verifica se a cobrança foi capturada com sucesso na API do Gateway.

## Requisitos REMOVIDOS

- Lógica de "Simulação de Sucesso" em `FinancialScreen` (Mobile) e `processSubscriptionPayment` (Backend).
