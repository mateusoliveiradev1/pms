# Especificação: Correção de UI de Termos, Planos e Self-Healing de Contas Legadas

## Por que
O usuário relatou três problemas críticos:
1.  **UI de Termos Quebrada/Simples Demais**: As telas de Termos e Privacidade (modais) estão muito simples, sem formatação e possivelmente com texto cortado ou mal apresentado.
2.  **Seleção de Plano Falha**: Ainda não consegue escolher o plano.
3.  **Contas Legadas Quebradas**: Contas antigas (`warface...`, `mateus_sp4...`, etc.) estão vendo a tela de erro "Dados do fornecedor não carregados" na tela Financeira. O usuário quer saber de que "tipo" elas são e por que estão assim.

## Diagnóstico das Contas
As contas mencionadas provavelmente foram criadas antes da implementação do `Supplier` obrigatório ou da lógica de 4 personas.
-   **Persona**: Elas não têm uma persona definida no novo modelo (são apenas `Users` com `Accounts` antigas).
-   **Problema**: Elas não possuem um `Supplier` padrão vinculado (`isDefault: true`).
-   **Sintoma**: A `FinancialScreen` tenta carregar `activeSupplierId`. Se for nulo, mostra o erro. A lógica de "Self-Healing" implementada no `login` deve corrigir isso, mas talvez não esteja sendo acionada se o token persistir e o login não for refeito, ou se a lógica falhar.

## O que muda

### Frontend (Mobile)
-   **Melhoria nos Modais de Termos (`RegisterScreen`)**:
    -   Usar `ScrollView` com estilo melhorado.
    -   Adicionar formatação HTML ou Markdown renderizada (se possível) ou apenas estilos de texto melhores (Título, Parágrafo, Espaçamento).
    -   Garantir que o botão de fechar seja visível e acessível.
-   **Correção na Seleção de Plano (`FinancialScreen`)**:
    -   Verificar se o `supplier` existe antes de abrir o modal. Se não existir (caso das contas quebradas), forçar a criação ou redirecionar.
    -   O erro "Dados do fornecedor não carregados" deve oferecer um botão "Reparar Conta" ou "Tentar Novamente" que force uma atualização dos dados do usuário (`refetchUser`), o que por sua vez deve acionar a lógica de self-healing no backend (ou precisamos de um endpoint específico para isso se o login não bastar).

### Backend
-   **Reforçar Self-Healing (`authController`)**:
    -   Garantir que o self-healing funcione não apenas no login, mas também no `/me` (getMe), pois o app pode abrir direto com token salvo sem passar pelo login.
    -   No `getMe`, se o usuário tem conta mas não tem supplier default, criar um na hora.

## Impacto
-   **Especificações Afetadas**: `fix-account-creation`.
-   **Código Afetado**: `mobile/src/screens/RegisterScreen.tsx`, `backend/src/controllers/authController.ts`, `mobile/src/screens/Financial/FinancialScreen.tsx`.

## Requisitos ADICIONADOS
### Requisito: Auto-Correção no Carregamento Inicial
O sistema DEVE verificar e corrigir a ausência de Fornecedor Padrão ao carregar os dados do usuário (`/me`), não apenas no login.
-   **QUANDO** o app inicia e chama `/auth/me`
-   **SE** o usuário tem conta mas sem supplier
-   **ENTÃO** criar supplier automaticamente e retorná-lo.

### Requisito: UI de Termos Profissional
Os modais de termos devem parecer documentos oficiais.
-   **Estilo**: Cabeçalho fixo, corpo rolável com margens adequadas, tipografia legível.

## Requisitos MODIFICADOS
### Requisito: Tratamento de Erro no Financeiro
**Modificado**: `FinancialScreen`
-   **Mudança**: Se `supplier` for nulo, exibir botão "Atualizar Cadastro" que chama `/auth/me` (que agora fará o fix) e recarrega a tela.
