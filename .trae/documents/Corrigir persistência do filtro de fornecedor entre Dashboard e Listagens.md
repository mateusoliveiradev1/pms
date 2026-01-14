Entendido, como você está na conta **System Admin**, o comportamento é ainda mais estranho, pois o código deveria aceitar o filtro diretamente.

A suspeita agora recai sobre como o parâmetro `supplierId` está sendo recebido ou interpretado pelo servidor nessa rota específica. Pode ser que ele esteja sendo ignorado por alguma verificação de segurança excessivamente restritiva ou um problema na leitura da query string.

Meu plano para corrigir isso definitivamente:

### 1. Reforçar o `reportsController.ts` (Backend)
- Adicionar **logs de depuração** para mostrar exatamente o que o servidor está recebendo (Role do usuário e ID do fornecedor).
- Reescrever a lógica de extração do `supplierId` para ser mais robusta, garantindo que ele não seja ignorado se vier como string, objeto ou se houver alguma falha sutil de tipagem.
- **Forçar a aplicação do filtro** para System Admin sempre que um ID válido for detectado na requisição, removendo qualquer ambiguidade.

### 2. Unificar a Lógica de Permissão
- Vou aproveitar para aplicar a correção que permite que Donos de Conta também filtrem (como planejado anteriormente), pois isso tornará o código de verificação mais consistente e seguro, eliminando possíveis "pontos cegos" onde o filtro é ignorado.

Essa abordagem "blindada" deve garantir que, se o ID do fornecedor sair do celular (o que já confirmamos que acontece, pois a lista de produtos funciona), ele será obrigatoriamente usado pelo filtro de vendas.
