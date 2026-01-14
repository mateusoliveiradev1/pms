O erro `Cannot read property 'toFixed' of undefined` acontece porque o Frontend espera um campo chamado `finalPrice` nos produtos, mas o Backend está enviando `price`. Como o campo não existe (é `undefined`), ao tentar formatá-lo com `.toFixed(2)`, o aplicativo quebra.

**Onde está o erro:**
Principalmente na **DashboardScreen**, que tenta exibir os preços dos "Produtos Recentes".

**A Solução:**
Vou corrigir os arquivos do Frontend para usar o nome correto do campo (`price`) e adicionar uma proteção para garantir que, mesmo se vier nulo, exiba "0.00" em vez de travar.

Arquivos afetados:
1.  `mobile/src/screens/DashboardScreen.tsx`
2.  `mobile/src/screens/Products/ProductsListScreen.tsx` (por precaução)

Vou aplicar essa correção agora.
