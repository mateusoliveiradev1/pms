Vou reestruturar a navegação do zero para atender aos requisitos de fluxo distintos entre System Admin e usuários comuns.

### Plano de Reestruturação (`Routes.tsx`)

1.  **Refatorar `AppTabs` (Apenas para Usuários/Suppliers)**:
    *   **Remover Lógica de System Admin**: O Admin não usará mais abas.
    *   **Adicionar Dashboard**: Incluir `DashboardScreen` como a primeira aba para `isSupplierUser`, `isSupplierAdmin` e `isAccountAdmin`.
    *   **Padronizar Abas**: Garantir a ordem solicitada: Dashboard, Pedidos, Produtos, Financeiro (se aplicável), Relatórios, Perfil.

2.  **Criar Navegação Exclusiva para System Admin**:
    *   No componente principal `Routes`, implementarei uma verificação de fluxo.
    *   **Se `isSystemAdmin`**: Renderizar uma `Stack.Navigator` dedicada (ou ajustar a Stack principal) onde a tela inicial é o `DashboardScreen` (sem abas).
    *   **Rotas do Admin**: Garantir que `AdminFinancialScreen`, `SuppliersStack`, `ReportsScreen`, `AdminBIFinancialScreen` e `OrdersListScreen` estejam registrados nesta Stack para que os botões do Dashboard funcionem.

3.  **Ícones e Rotas**:
    *   Atualizar o mapeamento de ícones em `AppTabs` para incluir o novo item "Dashboard".
    *   Garantir que todas as telas "órfãs" (como `AdminBIFinancialScreen`) estejam registradas na Stack principal ou na Stack do Admin.

Esta abordagem cumpre a regra de "Admin sem abas" e "Usuários com abas completas incluindo Dashboard", mantendo a integridade da navegação e contexto.
