# Tarefas

- [x] Tarefa 1: Refatorar Produtos (Backend) - Eliminar Lógica Frágil
  - [x] SubTarefa 1.1: Atualizar `createProduct` para remover o fallback aleatório de fornecedor. Exigir `supplierId` ou inferir APENAS se usuário tiver UM único fornecedor.
  - [x] SubTarefa 1.2: Atualizar `updateProduct` para receber `supplierId` e atualizar `ProductSupplier` específico (preço, estoque).
  - [x] SubTarefa 1.3: Garantir que o `price` do Produto seja calculado corretamente com base no `supplierPrice` e `margin`.

- [x] Tarefa 2: Refatorar Pedidos (Backend) - Cálculo Real e Seguro
  - [x] SubTarefa 2.1: Atualizar `createOrder` para buscar a Taxa de Comissão (`commissionRate`) do Plano Ativo do Fornecedor no DB (não confiar no body).
  - [x] SubTarefa 2.2: Adicionar campos `costPrice` (custo fornecedor) e `commissionValue` (taxa paga) em `OrderItem` ou `Order` para histórico financeiro imutável.
  - [x] SubTarefa 2.3: Validar estoque no `ProductSupplier` específico do item, não no global.
  - [x] SubTarefa 2.4: Implementar bloqueio de carrinho misto (itens de fornecedores diferentes) com erro claro.

- [x] Tarefa 3: Dashboard Real (Backend)
  - [x] SubTarefa 3.1: Reescrever `getDashboardStats` para usar os novos campos financeiros (`costPrice`, `commissionValue`) dos pedidos.
  - [x] SubTarefa 3.2: Garantir que o lucro seja calculado: (Venda - Custo - Taxa) e não (Venda - Preço Atual do Fornecedor).

- [x] Tarefa 4: Refatorar Integrações e Fornecedores (Backend)
  - [x] SubTarefa 4.1: Atualizar `MercadoLivreController` para salvar tokens com vínculo ao `userId` ou `supplierId`.
  - [x] SubTarefa 4.2: Implementar `createItem` no `mercadoLivreService.ts` (API POST /items).
  - [x] SubTarefa 4.3: Conectar `createProduct` do PMS ao `createItem` do ML (checkbox "Publicar Automaticamente").
  - [x] SubTarefa 4.4: Atualizar `deleteSupplier` para verificar dependências antes de deletar.

- [x] Tarefa 5: Notificações (Backend)
  - [x] SubTarefa 5.1: Verificar e garantir que `createNotification` salva no banco e é acessível via API.

- [x] Tarefa 6: Validação Frontend (Mobile)
  - [x] SubTarefa 6.1: Verificar se `ProductFormScreen` envia `supplierId`.
  - [x] SubTarefa 6.2: Testar fluxo completo de Venda -> Estoque Baixa -> Financeiro Atualiza -> Dashboard Reflete Lucro Real.
