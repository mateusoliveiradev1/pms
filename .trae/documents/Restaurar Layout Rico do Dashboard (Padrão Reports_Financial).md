O "estado visual anterior" correto é exatamente o código que existia antes da minha intervenção nesta sessão. Minha tentativa de padronização foi o que causou a "simplificação" indesejada.

Vou realizar um **Rollback Cirúrgico** para restaurar integralmente o layout original, mantendo apenas a correção de segurança (Logout) sem alterar o design.

### Ação Imediata:

1.  **Restaurar `DashboardScreen.tsx` Original**:
    *   Vou reescrever o arquivo com o código exato recuperado na leitura inicial.
    *   Isso trará de volta:
        *   O componente `StatCard` inline original (com ícone colorido e fundo transparente/colorido).
        *   O layout de Grid original (`width: '46%'`, `margin: '2%'`).
        *   O cabeçalho manual (`<View style={styles.header}>`) que o usuário prefere.
        *   A tipografia e espaçamentos exatos de antes.

2.  **Ajuste Mínimo Obrigatório (Logout)**:
    *   Para cumprir a regra de segurança sem quebrar o design ("Ação visível na UI"), vou inserir o botão de Logout (`log-out-outline`) discretamente ao lado do botão de "Reload" existente no cabeçalho original.
    *   Nenhuma outra alteração visual será feita.

### Resultado Esperado:
O Dashboard voltará a ter exatamente a mesma aparência "rica" de antes (ícones grandes, cards compactos, grid denso), revertendo a aparência "genérica" dos componentes padronizados.
