Vou realizar as correções e melhorias solicitadas em 3 etapas principais:

### 1. Corrigir Erro na Aba de Saúde (`HealthMonitorScreen.tsx`)
O erro `ReferenceError: Property 'useFocusEffect' doesn't exist` ocorre porque o hook não foi importado.
- **Ação:** Adicionar os imports de `useFocusEffect` (do `@react-navigation/native`) e `useCallback` (do `react`).

### 2. Melhorar a Aba de Pedidos (`OrdersListScreen.tsx`)
Para atender ao requisito de "aparecer os pedidos globais" e ter um "modal para escolher o fornecedor" (similar ao admin):
- **Ação 1:** Remover o bloqueio que impede a visualização se não houver `activeAccountId` (caso seja Admin).
- **Ação 2:** Adicionar um botão de filtro "Fornecedor" no cabeçalho.
- **Ação 3:** Implementar um Modal de Seleção de Fornecedor.
- **Ação 4:** Ajustar a busca de pedidos (`loadOrders`) para:
    - Buscar **todos** os pedidos se nenhum fornecedor estiver selecionado (Visão Global).
    - Filtrar por fornecedor se um for selecionado no modal.

### 3. Diagnóstico de Dados Zerados (`DashboardScreen.tsx`)
Para entender por que os dados do smoke test não aparecem (estão zerados):
- **Ação:** Adicionar logs detalhados (`console.log`) no `DashboardScreen` para verificar:
    - O valor de `activeAccountId` recebido do backend.
    - Se a API está retornando arrays vazios `[]` ou se está ocorrendo algum erro silencioso.
    - Isso confirmará se o problema é no frontend (não enviando o ID) ou no banco de dados (usuário criado sem vínculo com fornecedor).

### Arquivos Afetados
- `mobile/src/screens/Monitor/HealthMonitorScreen.tsx`
- `mobile/src/screens/Orders/OrdersListScreen.tsx`
- `mobile/src/screens/DashboardScreen.tsx`
