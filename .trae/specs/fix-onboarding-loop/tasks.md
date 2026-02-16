# Tarefas

- [x] Tarefa 1: Corrigir Loop de Onboarding (Backend & Frontend)
  - [x] SubTarefa 1.1: Atualizar `backend/src/controllers/supplierController.ts` para definir `account.onboardingStatus` como 'COMPLETO' (também para contas INDIVIDUAL) e retornar os dados atualizados da conta.
  - [x] SubTarefa 1.2: Atualizar `mobile/src/context/AuthContext.tsx` para persistir `onboardingStatus` no `SecureStore`.
  - [x] SubTarefa 1.3: Atualizar `mobile/src/screens/Suppliers/SupplierFormScreen.tsx` para tratar o sucesso: chamar `refetchUser()`, verificar `account.onboardingStatus` e navegar para `AppTabs`.

- [x] Tarefa 2: Corrigir Feedback de Seleção de Planos (Frontend)
  - [x] SubTarefa 2.1: Atualizar `mobile/src/screens/Financial/FinancialScreen.tsx` para mostrar indicador de carregamento e tratar lista de planos vazia (alerta se vazio).
  - [x] SubTarefa 2.2: Adicionar logs e alertas de erro detalhados no bloco catch de `openPlanModal`.

- [x] Tarefa 3: Corrigir Feedback de Confirmação de Plano
  - [x] SubTarefa 3.1: Adicionar estado `loadingChangePlan` ao `FinancialScreen.tsx`.
  - [x] SubTarefa 3.2: Atualizar `confirmChangePlan` para usar o loading state e tratar erros.
  - [x] SubTarefa 3.3: Adicionar indicador de atividade ao botão "Confirmar Plano".

- [x] Tarefa 4: Verificar Correções
  - [x] SubTarefa 4.1: Testar manualmente (se possível) ou via testes unitários a lógica de criação de fornecedor.
  - [x] SubTarefa 4.2: Verificar se o modal de planos abre e confirma corretamente.
