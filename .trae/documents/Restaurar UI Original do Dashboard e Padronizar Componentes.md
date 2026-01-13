Eu preparei um plano para restaurar a UI original do Dashboard e garantir a conformidade com as regras estritas.

### Análise da Situação
A "simplificação" recente removeu o uso dos componentes padronizados (`Header`, `Card`) do Dashboard, substituindo-os por estilos "inline" e implementações manuais. Isso gerou inconsistência visual e removeu a estrutura robusta da interface.

### Plano de Execução

1.  **Restaurar o Dashboard (`DashboardScreen.tsx`)**:
    *   **Header Completo**: Remover o cabeçalho manual e implementar o componente `<Header />` padronizado.
        *   **Título**: "Visão Geral".
        *   **Ação**: Adicionar botão de **Logout** (`log-out-outline`) no canto direito do Header para cumprir o requisito de "Logout obrigatório e visível". (A função de "Reload" já existe via "arrastar para baixo" / RefreshControl).
    *   **Estrutura Visual**: Substituir as implementações manuais de cartões pelo componente `<Card />` do sistema (`src/ui/components/Card`).
        *   Refatorar os cartões de estatísticas (`StatCard`) para usar a base visual do `<Card />`.
        *   Envolver o gráfico de vendas e a lista de produtos no componente `<Card />` para manter a consistência de sombras e bordas.
    *   **Greeting**: Mover a saudação ("Olá, Usuário") para o topo do conteúdo rolável, mantendo a identidade visual mas separada da barra de navegação.
    *   **Layout**: Ajustar o container principal para remover conflitos de `SafeAreaView` (já que o `Header` gerencia a área segura superior).

2.  **Verificação de Segurança e Lógica**:
    *   Garantir que todas as verificações de permissão (`isSystemAdmin`, etc.) e chamadas de API permaneçam intactas.
    *   Garantir que a tipagem TypeScript esteja correta após a substituição dos componentes.

3.  **Resultado Esperado**:
    *   O Dashboard terá a aparência "rica" e original, consistente com as outras telas (como Settings).
    *   O Logout estará imediatamente acessível.
    *   Nenhum componente visual será removido, apenas padronizado.

Este plano respeita integralmente as regras de não alterar backend, auth ou lógica, focando puramente na restauração da fidelidade visual e estrutural da UI.
