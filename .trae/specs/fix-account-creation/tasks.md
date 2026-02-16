# Tarefas

- [x] Tarefa 1: Implementar Termos e Política Reais e Estilizados (Mobile)
  - [x] SubTarefa 1.1: Atualizar `RegisterScreen.tsx` com estilos profissionais (cabeçalho fixo, corpo rolável, tipografia clara).
  - [x] SubTarefa 1.2: Inserir o texto COMPLETO e REAL dos Termos de Uso (baseado em padrão de marketplace/SaaS).
  - [x] SubTarefa 1.3: Inserir o texto COMPLETO e REAL da Política de Privacidade (baseado em padrão LGPD).

- [x] Tarefa 2: Implementar Self-Healing no `getMe` (Backend)
  - [x] SubTarefa 2.1: Modificar `backend/src/controllers/authController.ts` na função `getMe`.
  - [x] SubTarefa 2.2: Adicionar lógica para verificar se `activeSupplierId` é nulo e se o usuário tem conta.
  - [x] SubTarefa 2.3: Se necessário, criar o Supplier Default na hora e retornar os dados atualizados.

- [x] Tarefa 3: Melhorar Tratamento de Erro no Financeiro (Mobile)
  - [x] SubTarefa 3.1: Atualizar `FinancialScreen.tsx` para tratar explicitamente o caso `!supplier`.
  - [x] SubTarefa 3.2: Adicionar botão "Atualizar Cadastro" que chama `refetchUser()` (do AuthContext) e recarrega a tela.
  - [x] SubTarefa 3.3: Garantir que o modal de planos só abra se `supplier` existir.
