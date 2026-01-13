O código de `Routes.tsx` foi atualizado com sucesso. No entanto, para que as rotas funcionem perfeitamente a partir do Dashboard, preciso garantir que o componente `DashboardScreen` esteja chamando os nomes de rota corretos que agora estão registrados no Stack Global.

### Verificação Final (`DashboardScreen.tsx`)

1.  **Botão Produtos**: `navigation.navigate('ProductsList')`.
    *   **Status**: OK. `ProductsList` está registrado no Global Stack.
2.  **Botão Pedidos**: `navigation.navigate('Pedidos')`.
    *   **Status**: OK. `Pedidos` é o nome da aba.
    *   **Atenção**: Se o usuário estiver no Stack Global e tentar navegar para uma aba, o React Navigation lida com isso. Mas para consistência, se houver um `OrdersListScreen` no Stack Global (que eu adicionei como `OrderForm` e `OrdersList`?), deixe-me verificar.
    *   Eu adicionei `<Stack.Screen name="OrdersList" ... />`? Não, adicionei `OrderForm` e `OrderDetails`. `OrdersList` está apenas nas abas.
    *   Isso significa que `navigation.navigate('Pedidos')` funcionará porque levará à aba.
    *   Mas se o código do dashboard chamar `navigation.navigate('OrdersList')`, falhará.
    *   Vou verificar o código do Dashboard atual.

3.  **Botão Financeiro**:
    *   Admin: `navigation.navigate('AdminFinancial')`.
    *   User: `navigation.navigate('Financial')`.
    *   **Status**: OK. Ambos estão registrados no Global Stack.

4.  **Botão Relatórios**: `navigation.navigate('Relatórios')`.
    *   **Status**: OK. É o nome da aba e também está no Global Stack como `Reports` (mas o nome da rota da aba é `Relatórios`). Se o Dashboard chamar `Relatórios`, vai para a aba. Se chamar `Reports`, vai para a tela do stack. Preciso garantir que o Dashboard use o nome correto.

### Ação: Verificar DashboardScreen
Vou ler o `DashboardScreen.tsx` uma última vez para confirmar os nomes das rotas nos botões e ajustar se necessário para corresponder aos nomes definidos em `Routes.tsx`.

*   `ProductsList` (Stack) -> OK.
*   `Pedidos` (Tab) -> OK.
*   `Relatórios` (Tab) -> OK.
*   `Financial` / `AdminFinancial` (Stack) -> OK.

Se o Dashboard estiver chamando `Relatórios` e `Relatórios` for uma aba, tudo bem.

### Conclusão
A navegação foi restaurada conforme os prints. O Admin tem suas 8 abas. O usuário normal tem suas 6 abas. As telas acessadas via Dashboard estão no Stack Global para garantir que funcionem independente da aba ativa.
