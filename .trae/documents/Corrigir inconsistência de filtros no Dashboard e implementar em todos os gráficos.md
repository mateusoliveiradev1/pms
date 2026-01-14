Você tem razão, o comportamento está inconsistente. Descobri o motivo técnico:

1.  **Excesso de zelo no Controller de Relatórios:** O `reportsController.ts` (Dashboard) tem uma validação de filtro muito "chata" que acaba ignorando o ID se ele não vier exatamente como esperado, revertendo para a "Visão Global". Já o `orderController.ts` (Lista de Pedidos) é mais direto (`String(id)`), por isso funciona lá.
2.  **Bug Crítico Identificado:** As funções que geram o gráfico de "Top Produtos" e "Pedidos por Status" simplesmente **não implementaram o filtro**! Mesmo que você selecione um fornecedor, esses dois gráficos continuam mostrando dados globais.

### Plano de Correção Definitiva:

1.  **Simplificar o Filtro:** Vou alinhar a lógica do `reportsController.ts` com a do `orderController.ts`, aceitando o filtro de forma mais direta.
2.  **Implementar Filtro nos Gráficos Faltantes:** Vou adicionar a lógica de `where.supplierId` nas funções `getTopProducts` e `getOrdersByStatus` para que os gráficos da Dashboard obedeçam ao filtro selecionado.

Vou aplicar essas correções agora.
