Descobri o problema. Você tem razão em estar frustrado, pois a lógica parece correta, mas há um detalhe sutil e traiçoeiro na Dashboard.

### O Diagnóstico
No `DashboardScreen.tsx`, temos o seguinte fluxo:
1.  **Estado:** `stats` contém `totalProducts`.
2.  **Cálculo:** `totalProducts: allProducts.length`.
3.  **Busca de Produtos:** `const fetchProducts = api.get<Product[]>('/products', { params })`.
4.  **Backend (`productController`):** Aceita `supplierId` e filtra corretamente.

**MAS**, o Backend `productController` (que eu reli agora) tem uma verificação de segurança no início:
```typescript
    if (authUser?.role !== 'ADMIN' && authUser?.role !== 'SYSTEM_ADMIN') {
        // ... Lógica complexa de allowedSupplierIds ...
    }
```
Se for `SYSTEM_ADMIN`, ele pula essa lógica inicial e vai direto para:
```typescript
    // 2. Apply Filters
    if (requestedSupplierId) {
        if (isSystemAdmin) {
            where.suppliers = { some: { supplierId: requestedSupplierId } };
        }
```

Isso parece correto.

**PORÉM**, o `api.get('/products')` na Dashboard não está passando o `supplierId` como deveria se houver algum erro na construção do objeto `params` ou se `selectedSupplier` tiver uma estrutura diferente da esperada.

E tem um ponto crucial: O `StatCard` de **Baixo Estoque** usa:
```typescript
lowStockProducts: allProducts.filter((p) => p.stockAvailable < 5).length
```
Se `allProducts` estiver filtrado, isso funciona.

O `StatCard` de **Pedidos** usa `realTotalOrders`, que vem de `/reports/sales`.

Se você vê os números globais, significa que o backend está recebendo `supplierId` vazio ou nulo.

**A Solução "Nuclear":**
Vou modificar o `DashboardScreen.tsx` para passar o `supplierId` **diretamente na URL** em vez de confiar no objeto `params` do axios, que pode ser traiçoeiro com objetos complexos ou referências.

Exemplo:
```typescript
const url = isSystemAdmin && selectedSupplier 
    ? `/products?supplierId=${selectedSupplier.id}` 
    : '/products';
const fetchProducts = api.get<Product[]>(url);
```

Isso elimina qualquer ambiguidade. Se o ID estiver no estado, ele VAI na URL.

Além disso, vou garantir que o `ReportsScreen` (que vou implementar agora) também use essa abordagem direta.

### Plano de Execução:
1.  **DashboardScreen (Ajuste Fino):** Alterar a chamada da API para usar URL string query (`?supplierId=...`) explicitamente.
2.  **ReportsScreen (Implementação):** Implementar o filtro completo (Botão + Modal + Lógica) usando essa mesma abordagem de URL direta.

Vou começar pelo `DashboardScreen` para corrigir o problema atual, e depois faço o `ReportsScreen`.
