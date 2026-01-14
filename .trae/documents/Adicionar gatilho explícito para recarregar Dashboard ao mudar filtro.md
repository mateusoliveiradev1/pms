O problema está exatamente onde eu suspeitava: **o Frontend não recarrega os dados automaticamente quando o filtro muda**.

### O Erro:
O `useEffect` da linha 199 só depende de `isFocused`, `loadData` e `isSystemAdmin`.
```typescript
  useEffect(() => {
    if (isFocused) {
        if (isSystemAdmin) loadSuppliers();
        loadData();
    }
  }, [isFocused, loadData, isSystemAdmin]);
```

Embora `loadData` dependa de `selectedSupplier`, o React às vezes não dispara o efeito se a referência da função `loadData` não mudar ou se o ciclo de renderização não for forçado. Mas o principal é que **o Modal altera o `selectedSupplier`**, mas não chama explicitamente o `loadData` logo em seguida, confiando apenas no ciclo do React.

Mas há um detalhe pior: **O Modal de Filtro não tem um botão "Aplicar" ou "Confirmar".** Ele aplica ao clicar no item (`setSelectedSupplier(item); setModalVisible(false);`).

### Correção no Frontend:
Vou forçar o recarregamento dos dados assim que o filtro mudar.
1.  Adicionar `selectedSupplier` na lista de dependências do `useEffect` principal.
2.  Garantir que o `loadData` seja chamado.

Na verdade, olhando o `useCallback` do `loadData` (linha 114), ele **já depende** de `selectedSupplier`. Então, em teoria, deveria funcionar.

**Mas espere:**
Olhe a linha 126:
```typescript
      if (isSystemAdmin && selectedSupplier) {
          params.supplierId = selectedSupplier.id;
      }
```
Isso parece correto.

**Hipótese 2: Cache do `loadData`**
O `useCallback` pode estar "preso".

**Ação:**
Vou adicionar um `useEffect` **exclusivo** para monitorar `selectedSupplier`. Quando ele mudar, eu chamo `loadData()`. Isso é mais garantido do que confiar na atualização implícita da dependência do `useCallback`.

```typescript
  // Força atualização quando o filtro muda
  useEffect(() => {
      if (isSystemAdmin) {
          loadData();
      }
  }, [selectedSupplier]);
```

Vou aplicar essa alteração agora.
