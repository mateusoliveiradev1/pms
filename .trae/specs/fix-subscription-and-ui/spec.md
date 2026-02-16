# Especificação: Refatoração para Experiência Profissional (Dropshipping SaaS)

## Por que

O usuário sente que o app "não parece de verdade" e falta profissionalismo no fluxo, especialmente em pagamentos e gestão de assinaturas. O objetivo é elevar o nível de UX e robustez financeira para um padrão de SaaS/Marketplace real.

## O que muda

### Frontend (Mobile)

- **Refatoração Visual Completa dos Modais (`RegisterScreen`)**:
  - Substituir modais nativos básicos por modais estilizados com animações suaves e cabeçalhos fixos profissionais.
  - Garantir legibilidade e acessibilidade nos Termos e Política.
- **Fluxo de Assinatura Profissional (`FinancialScreen`)**:
  - **Paywall Real**: Ao selecionar um plano, apresentar um resumo claro (checkout) com valor, ciclo e benefícios.
  - **Gestão de Cartões Integrada**: Se não houver cartão, o formulário de cartão aparece DENTRO do fluxo de checkout, não em um modal separado desconexo.
  - **Feedback Visual**: Loaders, mensagens de sucesso/erro claras e transições de estado (ex: "Processando Pagamento...").

### Backend

- **Robusteza Financeira (`financialController`, `financialService`)**:
  - **Atomicidade**: A troca de plano SÓ acontece se o pagamento for capturado com sucesso no Stripe.
  - **Idempotência**: Prevenir cobranças duplas se o usuário clicar várias vezes.
  - **Logging Auditável**: Registrar cada tentativa de troca de plano e pagamento para suporte.
- **Correção de Isolamento**:
  - Garantir que cada requisição afete estritamente o `supplierId` autenticado, prevenindo "vazamento" de alterações entre contas (bug relatado).

## Impacto

- **Confiança**: O usuário final sentirá segurança ao inserir dados de cartão.
- **Monetização**: O fluxo de cobrança será funcional e difícil de burlar.

## Requisitos ADICIONADOS

### Requisito: Checkout de Assinatura

A troca de plano deve funcionar como um checkout de e-commerce.

- **Passo 1**: Seleção de Plano.
- **Passo 2**: Resumo do Pedido (Plano X - R$ Y/mês).
- **Passo 3**: Pagamento (Selecionar cartão salvo ou adicionar novo).
- **Passo 4**: Confirmação e Ativação.

### Requisito: UI "App de Verdade"

Elementos de UI devem ter espaçamento, tipografia e alinhamento consistentes (Design System).

## Requisitos MODIFICADOS

### Requisito: Gestão de Planos

**Modificado**: `changePlan`

- **Mudança**: Integração obrigatória com pagamento e validação estrita de sessão.
