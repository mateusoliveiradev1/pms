Detectei a causa exata das inconsistências que você relatou (Contadores com 12, Lista vazia, Produtos zerados).

### Diagnóstico
1.  **Por que os filtros mostram "12" mas a lista está vazia?**
    *   **Bug Crítico:** O endpoint de contagem (`getOrderStatusStats`) no backend **não tem filtro de segurança**. Ele está retornando a contagem de **todos** os pedidos do banco de dados inteiro, independente da conta.
    *   **Lista Vazia:** O endpoint da lista (`getOrders`) tem segurança, mas trata o papel `OWNER` como um usuário comum (restrito), buscando apenas fornecedores vinculados diretamente ao ID do usuário, e não à conta toda. Como o Owner não é um fornecedor direto, retorna 0.

2.  **Por que Admin vê tudo zerado?**
    *   O backend trata `SYSTEM_ADMIN` como usuário comum se o role não for estritamente `'ADMIN'`.

### Plano de Correção

1.  **Backend - `orderController.ts` (Prioridade Máxima):**
    *   **Corrigir Lista:** Tratar `OWNER` com os mesmos privilégios de `ACCOUNT_ADMIN` para ver todos os pedidos da conta.
    *   **Corrigir Contadores:** Adicionar a mesma lógica de filtro de segurança (por `accountId` ou `supplierId`) no endpoint de estatísticas para que os números batam com a lista.

2.  **Backend - `productController.ts`:**
    *   Permitir que `SYSTEM_ADMIN` e `OWNER` vejam todos os produtos (Global ou da Conta, respectivamente).

3.  **Backend - `reportsController.ts`:**
    *   Adicionar filtros de segurança nos relatórios de vendas para evitar vazamento de dados globais para usuários comuns.

4.  **Frontend - `DashboardScreen.tsx`:**
    *   Habilitar a visão global para o Admin (como planejado anteriormente).
    *   Adicionar seletor de fornecedor para Admin.

Vou aplicar essas correções agora para garantir que os dados apareçam corretamente para cada tipo de usuário.
