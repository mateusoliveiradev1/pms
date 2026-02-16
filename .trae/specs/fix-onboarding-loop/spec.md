# Especificação: Correção de Loop de Onboarding e Seleção de Planos

## Por que

Os usuários estão relatando dois problemas críticos:

1.  **Preso na tela "Novo Fornecedor"**: Após o registro, o aplicativo fica preso na tela de cadastro de fornecedor (`SupplierFormScreen`). Mesmo após preencher o formulário, ele não redireciona. Reabrir o aplicativo persiste este estado.
2.  **Botão "Escolher Plano" não responde**: O botão "Escolher Plano" na tela Financeiro supostamente não faz nada quando clicado. Além disso, a **Confirmação de Plano** dentro do modal não fornece feedback visual (loading) e pode parecer travada.

## O que muda

### Backend

- **Atualizar `createSupplier`**:
  - Garantir que retorne o objeto `account` atualizado na resposta (atualmente retorna apenas o fornecedor).
  - Garantir que `account.onboardingStatus` seja explicitamente definido como `'COMPLETO'` quando o primeiro fornecedor for criado, independentemente do tipo de conta (Individual ou Empresarial).
- **Garantir Existência de Planos**: Verificar se os planos padrão estão disponíveis ou tratar graciosamente se faltarem (embora o sucesso no registro implique que o plano 'basic' exista).

### Frontend (Mobile)

- **Corrigir `SupplierFormScreen`**:
  - Atualizar `handleSave` para ler corretamente a resposta.
  - Acionar `refetchUser()` após a criação bem-sucedida do fornecedor para atualizar o estado local de autenticação.
  - Forçar a navegação para `AppTabs` apenas após verificar que o estado do usuário foi atualizado.
- **Corrigir `AuthContext`**:
  - Persistir `onboardingStatus` no `SecureStore` para evitar que o aplicativo retorne ao padrão "PENDING" em cada inicialização (o que bloqueia momentaneamente o usuário na tela de onboarding até que a requisição de rede termine).
- **Corrigir `FinancialScreen`**:
  - Adicionar tratamento de erros e indicadores de carregamento ao `openPlanModal`.
  - Adicionar um alerta se nenhum plano for retornado do backend.
  - Garantir que o botão "Escolher Plano" forneça feedback visual quando pressionado.
  - **Novo**: Adicionar estado de carregamento (`loadingChangePlan`) ao botão "Confirmar Plano" dentro do modal.
  - **Novo**: Garantir que `confirmChangePlan` trate erros e forneça feedback se o `supplier` não estiver definido.

## Impacto

- **Especificações Afetadas**: `launch-readiness` (correção de bug).
- **Código Afetado**:
  - `mobile/src/screens/Suppliers/SupplierFormScreen.tsx`
  - `mobile/src/context/AuthContext.tsx`
  - `mobile/src/screens/Financial/FinancialScreen.tsx`
  - `backend/src/controllers/supplierController.ts`

## Requisitos ADICIONADOS

### Requisito: Conclusão do Onboarding

O sistema DEVE transicionar o usuário de `SupplierOnboarding` para `AppTabs` imediatamente após a criação bem-sucedida do fornecedor.

- **QUANDO** o usuário envia dados válidos de fornecedor
- **ENTÃO** o backend atualiza o status da conta para 'COMPLETO'
- **ENTÃO** o frontend atualiza o estado local de autenticação
- **ENTÃO** a navegação é redefinida para as abas principais

### Requisito: Feedback na Seleção de Plano

O sistema DEVE fornecer feedback claro ao buscar e confirmar planos.

- **QUANDO** o usuário clica em "Escolher Plano"
- **ENTÃO** um indicador de carregamento aparece
- **SE** a lista de planos estiver vazia, **ENTÃO** mostrar um alerta "Nenhum plano disponível".
- **QUANDO** o usuário clica em "Confirmar Plano"
- **ENTÃO** o botão deve mostrar um spinner e ficar desabilitado
- **SE** ocorrer sucesso, fechar modal e avisar.
- **SE** ocorrer um erro, **ENTÃO** mostrar alerta de erro detalhado.

## Requisitos MODIFICADOS

### Requisito: Persistência do Estado de Autenticação

**Modificado**: `AuthContext`

- **Mudança**: `onboardingStatus` deve ser salvo e carregado do `SecureStore`.
