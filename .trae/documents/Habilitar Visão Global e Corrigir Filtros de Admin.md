Para resolver os problemas relatados, precisamos atuar em três frentes principais, garantindo que a visão global do Admin funcione sem depender de uma "conta ativa" (activeAccountId) e que os filtros sejam aplicados corretamente no backend.

### 1. Lista de Produtos (ProductsListScreen.tsx)
O problema da tela "Nenhuma conta ativa" ocorre porque o código atual bloqueia o acesso se `activeAccountId` for nulo, o que é o caso para o **System Admin** na visão global.
- **Ação:** Modificar a verificação para permitir o acesso se `isSystemAdmin` for verdadeiro, mesmo sem `activeAccountId`.
- **Ação:** Atualizar a função `loadProducts` para enviar o `supplierId` (se selecionado no filtro global) para a API, permitindo filtrar a lista.

### 2. Tela de Pedidos (OrdersListScreen.tsx)
- **Ação:** Verificar e garantir que o `supplierId` selecionado no modal de filtro seja passado como parâmetro na requisição `loadOrders`. A lógica já parece existir, mas vamos reforçar a consistência com o Dashboard.

### 3. Dashboard (DashboardScreen.tsx)
O problema do "12 pedidos fixos" sugere que o backend não está aplicando o filtro corretamente quando recebe o `supplierId` do Admin.
- **Ação:** Revisar `dashboardController.ts` para garantir que, quando um Admin envia `?supplierId=...`, as queries de contagem (`prisma.order.count`) usem esse filtro explicitamente.
- **Ação:** Garantir que o frontend passe o parâmetro corretamente ao recarregar os dados.

### 4. Backend (Controllers)
- **Ação:** Garantir que `productController.ts` e `orderController.ts` aceitem e priorizem o filtro `supplierId` vindo de um System Admin, ignorando a restrição de conta nessas situações.

Com essas alterações, o Admin terá liberdade para ver tudo (Global) ou filtrar por fornecedor específico em todas as telas, sem ser bloqueado pela falta de um `activeAccountId`.
