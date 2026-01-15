Para atender às suas solicitações, vamos realizar as seguintes ações:

### 1. Corrigir Filtros do Dashboard para Admin (Backend)
O problema de "não atualizar com os dados do fornecedor" ocorre porque o endpoint `/dashboard/stats` no backend não está lendo o parâmetro `supplierId` que o Admin envia. Ele assume "Admin vê tudo" ou "Usuário vê sua conta".
- **Ação:** Modificar `getDashboardStats` em `dashboardController.ts` para verificar se `req.query.supplierId` existe. Se existir e o usuário for Admin (ou tiver permissão), filtrar as estatísticas por esse ID específico.

### 2. Adicionar Filtro "Pendentes" na Tela de Pedidos (Frontend)
Você pediu um filtro para pedidos pendentes.
- **Ação:** Adicionar a opção `{ label: 'Pendente', value: 'PENDING', ... }` na lista `STATUS_OPTIONS` em `OrdersListScreen.tsx`.

### 3. Verificar Dados de Smoke Test
Você perguntou se "todos os fornecedores não têm produtos criados".
- **Análise:** O script `smoke_step11.ts` cria **sim** um produto chamado "Smoke Product" vinculado ao fornecedor externo (`External Seller`).
- **Por que pode parecer vazio:** Se você estiver logado com uma conta diferente da criada pelo script (`Smoke Account`), ou se estiver olhando para o fornecedor interno (`Internal Supplier`) que o script cria mas *não* vincula produtos explicitamente nesse passo (o produto é criado com `suppliers: { create: [{ supplierId: supplierExternal.id ... }] }`), pode parecer vazio para aquele fornecedor específico.
- **Conclusão:** Os dados existem, mas estão isolados na conta/fornecedor específicos do teste.

### Plano de Execução
1.  **Backend:** Atualizar `dashboardController.ts` para aceitar `supplierId` via query params.
2.  **Frontend:** Adicionar opção "Pendente" no filtro de status em `OrdersListScreen.tsx`.
