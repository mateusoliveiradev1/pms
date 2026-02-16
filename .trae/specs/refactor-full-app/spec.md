# Especificação: Refatoração Completa para Robustez do App (100% Funcional)

## Por que

O usuário solicitou uma revisão de "100% de tudo" para garantir que o fluxo seja perfeito e funcional, eliminando atalhos, mocks e lógicas frágeis. A análise revelou pontos críticos na criação de produtos, cálculo de custos, criação de pedidos, integração com Mercado Livre (que é global e não per-user) e deleção de fornecedores (que quebra integridade referencial).

## O que muda

### Backend (Refatoração Crítica)

#### 1. Produtos (`productController.ts`)

- **Remover Fallbacks Perigosos**: `createProduct` NÃO deve mais selecionar um fornecedor aleatório se `supplierId` não for enviado. Deve retornar erro 400.
- **Multi-Fornecedor Real**: `updateProduct` deve receber `supplierId` para saber qual estoque/preço atualizar, em vez de pegar sempre o primeiro da lista.
- **Preço Correto**: O preço de venda (`price`) deve ser calculado com base no `supplierPrice` específico do fornecedor vinculado, não um valor solto.

#### 2. Pedidos (`orderController.ts`)

- **Validação de Estoque por Fornecedor**: Ao criar pedido, verificar o estoque no `ProductSupplier` específico, não no `Product` global.
- **Preço e Custo Reais**: Usar `unitPrice` do `ProductSupplier` (custo) e calcular o preço final com base na margem configurada, garantindo lucro real.
- **Taxas Dinâmicas**: Buscar a taxa de comissão (`commissionRate`) do Plano do Fornecedor no momento da venda, em vez de aceitar valor do frontend ou default 0.

#### 3. Dashboard (`dashboardController.ts`)

- **Cálculo de Lucro Preciso**:
  - Lucro = (Preço Venda - Custo Fornecedor - Taxa Platforma).
  - Remover a lógica de "pegar preço do primeiro fornecedor" e usar o custo real registrado no item do pedido (snapshot).

#### 4. Integrações (`mercadoLivreController.ts`)

- **Escopo por Usuário**: Alterar `upsert` para usar `userId` como chave composta (ou garantir que `integration` tenha `userId`), impedindo que um usuário sobrescreva o token de outro. Isso permite que cada usuário tenha sua própria loja automatizada.
  - _Nota_: O usuário PRECISA conectar sua conta do Mercado Livre uma única vez para autorizar a automação.
- **Publicação Automática (Novo)**: Implementar função `publishToMercadoLivre` que cria o anúncio na conta conectada do usuário assim que o produto é criado no PMS.
- **Sincronização de Estoque (Novo)**: Atualizar o estoque no ML sempre que houver venda ou ajuste no PMS.

#### 5. Fornecedores (`supplierController.ts`)

- **Deleção Segura**: `deleteSupplier` deve verificar se existem pedidos vinculados antes de deletar. Se houver, bloquear a deleção (ou fazer soft delete).

#### 6. Notificações (`notificationController.ts`)

- Garantir que notificações sejam persistidas no banco para histórico.

### Frontend (Mobile)

- **Produtos**: Garantir que o formulário de produto envie o `supplierId` correto (do usuário logado).
- **Pedidos**: Exibir status real e garantir que o carrinho não misture fornecedores (ou alertar o usuário).
- **Dashboard**: Exibir números reais calculados pelo novo backend.

## Impacto

- **Confiabilidade**: Dados financeiros e de estoque serão precisos.
- **Segurança**: Impede manipulação de taxas ou preços pelo frontend e conflito de integrações.
- **Experiência**: Erros claros em vez de comportamentos mágicos/imprevisíveis.

## Requisitos ADICIONADOS

### Requisito: Integridade de Dados do Produto

Um produto SÓ pode ser criado se vinculado explicitamente a um fornecedor válido da conta do usuário.

### Requisito: Snapshot Financeiro do Pedido

Cada item do pedido DEVE gravar o `costPrice` (custo do fornecedor) e `sellingPrice` (venda) no momento da compra para relatórios de lucro imutáveis.

### Requisito: Integridade Referencial de Fornecedor

Não é permitido deletar um fornecedor que possua histórico de pedidos.

## Requisitos MODIFICADOS

### Requisito: Criação de Pedido

**Modificado**: `createOrder`

- **Mudança**: Validar estoque no `ProductSupplier`, capturar taxa do plano atual, e rejeitar itens de fornecedores mistos (por enquanto).
