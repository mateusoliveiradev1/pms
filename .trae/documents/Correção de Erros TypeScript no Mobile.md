Vou corrigir todos os erros de TypeScript encontrados no projeto mobile. O backend já está limpo (0 erros).

**Plano de Correção (Mobile):**

1.  **DashboardScreen.tsx**
    *   **Problema:** Acesso incorreto à propriedade `role` dentro do objeto `user` (`user.role`).
    *   **Solução:** Utilizar a variável `role` que já é retornada diretamente pelo hook `useAuth()`.

2.  **AdminFinancialScreen.tsx**
    *   **Problema:** Propriedades de estilo duplicadas (`content`, `emptyTitle`, `emptyText`) no `StyleSheet.create`.
    *   **Solução:** Remover as definições duplicadas mantendo a consistência do layout.

3.  **SettingsScreen.tsx**
    *   **Problema:** Variáveis `isAccountAdmin` e `isSystemAdmin` não definidas.
    *   **Solução:** Importar e utilizar o hook `useAuthRole` para obter essas permissões corretamente.

Após aplicar essas correções, executarei novamente a verificação (`tsc`) para garantir que o projeto compile sem nenhum erro, atendendo ao seu critério de qualidade.