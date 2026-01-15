# Correção de Flickering e Erro de Carregamento na Tela Financeira do Fornecedor

## Problema
O usuário relatou dois problemas na tela financeira do perfil `SUPPLIER_ADMIN`:
1.  **Flickering**: A tela "pisca" ou recarrega agressivamente.
2.  **Erro de Carregamento**: Mensagem "Não foi possível carregar os dados financeiros" aparece, possivelmente devido a uma conta nova sem dados (retorno 404/500 da API).

## Análise Técnica
1.  **Loading Intrusivo**: A função `loadData` define `setLoading(true)` sempre que é chamada (exceto em refresh), bloqueando a tela com um `ActivityIndicator` mesmo que os dados já estejam visíveis.
2.  **Ciclo de Dependências**: Se `loadData` for disparado por mudanças de estado, ele força um re-render com loading, causando o "flicker".
3.  **Tratamento de Erro Agressivo**: O `catch` exibe um `Alert.alert`, interrompendo a navegação, em vez de mostrar um "Empty State" ou mensagem de erro embutida na UI.

## Solução Proposta
1.  **Loading Inteligente**: Usar `useRef` para rastrear se os dados já foram carregados (`dataLoadedRef`). O loading de tela cheia só será ativado na **primeira carga**. Atualizações subsequentes serão silenciosas ou via `refreshing`.
2.  **Remover Alert de Erro**: Substituir o `Alert.alert` no bloco `catch` por `setErrorState(true)`, permitindo que a UI renderize a tela de erro amigável já existente (que possui botão "Tentar Novamente").
3.  **Performance**: Aplicar `useCallback` em `onRefresh` e outros handlers (`handleWithdraw`, `processPayment`) para evitar recriação de funções e re-renders desnecessários.

Esta abordagem resolve o desconforto visual (flickering) e melhora a experiência de erro para novos usuários.
