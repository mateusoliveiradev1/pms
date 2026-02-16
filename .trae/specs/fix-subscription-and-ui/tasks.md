# Tarefas

- [x] Tarefa 1: Refatorar Modais de Termos (Mobile)
  - [x] SubTarefa 1.1: Implementar `Modal` customizado com `SafeAreaView`, cabeçalho fixo e botão de fechar ergonômico em `RegisterScreen.tsx`.
  - [x] SubTarefa 1.2: Aplicar tipografia e espaçamento profissional no texto.

- [x] Tarefa 2: Backend - Fluxo de Assinatura Seguro
  - [x] SubTarefa 2.1: Modificar `changePlan` para aceitar `paymentMethodId` (Stripe).
  - [x] SubTarefa 2.2: Implementar lógica: Se plano pago -> Cobrar -> Se sucesso -> Atualizar Plano.
  - [x] SubTarefa 2.3: Adicionar logs detalhados para debug de isolamento de contas (verificar `req.user.userId` vs `supplierId`).

- [x] Tarefa 3: Frontend - Checkout de Assinatura (Mobile)
  - [x] SubTarefa 3.1: Criar componente de "Checkout" dentro do Modal de Planos em `FinancialScreen.tsx`.
  - [x] SubTarefa 3.2: Integrar `CardField` (Stripe) diretamente no fluxo se não houver cartão.
  - [x] SubTarefa 3.3: Exibir resumo (Plano + Preço) antes de confirmar.
  - [x] SubTarefa 3.4: Conectar ao novo endpoint `changePlan` com pagamento.

- [x] Tarefa 4: Validação Final
  - [x] SubTarefa 4.1: Testar fluxo completo: Registro -> Termos -> Financeiro -> Troca de Plano -> Pagamento -> Sucesso.
  - [x] SubTarefa 4.2: Verificar se a alteração impactou apenas a conta correta.
