# Plano de Segurança e Otimização (Risco Zero)

**GARANTIA DE SEGURANÇA:**
*   **Nenhuma regra de negócio será alterada.**
*   **Nenhum fluxo de navegação será alterado.**
*   **Nenhuma mudança visual.**
*   **Apenas otimizações invisíveis de código.**

## 1. AuthContext.tsx (Segurança de Estado)
*   **Otimização:** Memoizar o objeto de contexto (`value`).
*   **Segurança:** Mantém exatamente as mesmas funções e dados. Apenas evita que telas que usam `useAuth` pisquem/recarreguem sem necessidade.

## 2. DashboardScreen.tsx (Renderização)
*   **Otimização:** Parar de recriar as funções de lista e gráfico a cada frame.
*   **Segurança:** Os dados exibidos e o comportamento dos cliques permanecem idênticos.

## 3. AdminFinancialScreen.tsx (Estabilidade)
*   **Otimização:** Estabilizar o polling (atualização automática) para não travar a UI.
*   **Segurança:** O intervalo de atualização continua 5s, mas sem "trancos" na tela.

## 4. FinancialScreen.tsx (Memória)
*   **Otimização:** Trocar `ScrollView` por `FlatList` no Extrato (melhor performance para muitas transações).
*   **Segurança:** O visual da lista será pixel-perfect idêntico ao atual.

## 5. Validação Final
*   Rodar `npx tsc --noEmit` para garantir que o código continua 100% íntegro.
*   Conferência visual manual de cada tela alterada.
