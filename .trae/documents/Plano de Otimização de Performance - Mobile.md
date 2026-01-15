# Plano de Otimização de Performance

## 1. Contexts & Providers (`AuthContext.tsx`)
- **Problema:** O objeto `value` do `AuthContext.Provider` é recriado a cada renderização, forçando re-render em todos os consumidores mesmo que os dados não tenham mudado.
- **Ação:**
    - Envolver o objeto `value` em `useMemo`.
    - Garantir que as funções `signIn`, `signUp`, `signOut`, `refetchUser` sejam estáveis (já são, mas o objeto que as agrupa não).

## 2. DashboardScreen (`DashboardScreen.tsx`)
- **Problema:** `FlatList` (no modal de filtro) utiliza `renderItem` e `ListHeaderComponent` inline, causando recriação dos componentes da lista a cada render. Objetos de configuração (chartConfig) recriados a cada render.
- **Ação:**
    - Extrair `renderSupplierItem` para um `useCallback`.
    - Extrair `ListHeaderComponent` para um `useMemo`.
    - Memoizar `chartConfig` com `useMemo`.
    - Aplicar `React.memo` no componente `StatCard` para evitar re-renders desnecessários quando o pai atualiza mas as props do card são iguais.

## 3. AdminFinancialScreen (`AdminFinancialScreen.tsx`)
- **Problema:**
    - `FlatList` de fornecedores usa `renderItem` inline.
    - `renderTabs` recria a UI das abas a cada render.
    - Polling de 5s pode estar causando re-renders excessivos se não gerenciado corretamente.
- **Ação:**
    - Extrair `renderSupplierItem` para `useCallback`.
    - Memoizar a função `renderTabs` com `useCallback` ou `useMemo` (ou extrair componente).
    - Verificar e garantir que o polling (`loadData(true)`) não dispare loading visual (já implementado via flag `silent`, mas garantiremos que não afete estados que causam re-render desnecessário).
    - Memoizar handlers passados para `WithdrawalsList` e outros subcomponentes (`handleApprove`, `handleRejectConfirm`).

## 4. FinancialScreen (`FinancialScreen.tsx`)
- **Problema:**
    - Cálculos pesados (filtro e sort de `pendingItems`) rodando diretamente no corpo do componente.
    - Múltiplas funções inline passadas para Modais e Botões.
- **Ação:**
    - Memoizar o cálculo de `pendingItems` com `useMemo`.
    - Memoizar handlers principais (`handleWithdraw`, `processPayment`, `openPlanModal`).
    - Garantir `keyExtractor` estáveis nas iterações de `.map`.

## 5. Validação
- Executar `npx tsc --noEmit` para garantir zero erros de tipagem.
- Gerar Relatório Técnico de Performance confirmando as mudanças.
