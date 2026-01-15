Vou otimizar drasticamente a performance criando um novo endpoint "Turbo" para a Dashboard.

**O Problema Atual:**
Para mostrar "50 Produtos", o aplicativo baixa a lista completa dos 50 produtos (nome, preço, foto, descrição...) só para contar quantos são. Isso é lento e gasta internet à toa. O mesmo vale para os pedidos.

**A Solução (Endpoint Unificado):**
Vou criar um endpoint `/reports/dashboard-summary` que faz o trabalho pesado no banco de dados e retorna apenas os números finais:
```json
{
  "totalProducts": 50,
  "totalOrders": 120,
  "totalSales": 15000.00,
  "lowStock": 3
}
```
Isso transforma uma resposta de 500KB em 0.5KB. O carregamento será quase instantâneo.

**Plano de Execução:**
1.  **Backend:** Criar a função `getDashboardSummary` no `reportsController.ts` usando queries otimizadas (`count`, `aggregate`).
2.  **Rotas:** Adicionar a rota `/dashboard-summary` no `reportsRoutes.ts`.
3.  **Frontend:** Atualizar a `DashboardScreen.tsx` para usar essa rota única para os cards, mantendo as listas (produtos recentes) carregando em segundo plano.

Vou começar implementando o endpoint otimizado no Backend.
