O problema está em como o **Prisma** lida com o filtro `where` quando a lógica de `undefined` ou `null` não é tratada com extrema rigidez. No `reportsController.ts`, embora eu tenha adicionado uma verificação, ela pode estar sendo ignorada se o parâmetro vier vazio ou com um tipo inesperado (como um array vazio), fazendo o sistema cair no "retornar tudo".

Vou aplicar uma correção "à prova de falhas" no backend (`reportsController.ts`), garantindo que o filtro seja respeitado da seguinte forma:

### 1. Robustez na extração do ID (`reportsController.ts`)
- Alterar a extração de `req.query.supplierId` para garantir que seja uma **string válida**.
- Adicionar logs explícitos no console do servidor (invisíveis para você, mas úteis para garantir que o código rode) para confirmar o que está chegando.

### 2. Forçar Filtro para System Admin
- Se o usuário for System Admin e enviar **qualquer coisa** que pareça um ID, vou forçar `where.supplierId = id`.
- **Importante:** Se o ID não for encontrado ou for inválido, vou forçar um ID inexistente (`0000...`) para garantir que retorne **ZERO** resultados em vez de **TODOS**. Isso corrige o bug de "mostrar tudo quando o filtro falha".

### 3. Sincronizar lógica com `productController.ts`
- Vou replicar a lógica exata que já funciona na listagem de produtos (que mostra "0 Produtos" corretamente) para os endpoints de vendas e pedidos.

Essa abordagem elimina a possibilidade de "fallback silencioso" para a visão global, que é o que está causando a confusão na Dashboard.
