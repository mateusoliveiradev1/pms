# Especificação de Prontidão para Lançamento e Performance (Seguro)

## Por que

O objetivo é melhorar a experiência do usuário (velocidade e memória do app) **sem alterar a lógica de negócios ou funcionalidades existentes**. Focaremos em otimizações visuais e de infraestrutura.
Também é necessário gerar uma nova versão (APK) com todas essas melhorias para distribuição.

## O Que Muda

### App Mobile (React Native) - Otimizações Seguras

- **Auth "Cache-Primeiro" (Não-Destrutivo)**:
  - O app tentará carregar os dados do usuário salvos no celular.
  - **Segurança**: Se os dados locais estiverem corrompidos ou inválidos, o app fará o login normal via API. Nada quebra se o cache falhar.
- **Cache do Dashboard (Visual)**:
  - Mostrará os últimos números vistos enquanto carrega os novos.
  - **Segurança**: Se não houver dados antigos, mostrará o "loading" padrão.
- **Persistência de Filtros**:
  - Lembrará o filtro selecionado.
  - **Segurança**: Se o filtro salvo for inválido, voltará para "Todos".

### Backend (Node.js) - Inicialização Rápida

- **Inicialização Otimizada**:
  - O servidor aceitará conexões imediatamente.
  - A verificação de administrador (`ensureAdminUser`) rodará em paralelo.
  - **Segurança**: Se a verificação falhar, ela apenas logará um erro, sem derrubar o site.

### Build e Distribuição

- Geração de novo APK atualizado.

## Impacto

- **Specs Afetadas**: `AuthContext`, `DashboardScreen`, `backend/src/index.ts`.
- **Risco**: Baixo. Todas as mudanças têm "fallbacks" (planos B) para o comportamento original se algo der errado.

## Requisitos ADICIONADOS

### Requisito: Lançamento Instantâneo com Fallback

O sistema DEVE tentar exibir o Dashboard imediatamente.

- **Cenário: Sucesso**
  - Abre com dados salvos -> Atualiza em segundo plano.
- **Cenário: Falha no Cache**
  - Abre com Loading (comportamento atual) -> Busca da API.

### Requisito: Build de Produção

O sistema DEVE ter uma nova versão compilada (APK) contendo todas as correções.

## Requisitos MODIFICADOS

### Requisito: Inicialização do Backend

**Antigo**: Espera tudo estar pronto para ligar.
**Novo**: Liga o servidor web primeiro, depois termina tarefas internas.
