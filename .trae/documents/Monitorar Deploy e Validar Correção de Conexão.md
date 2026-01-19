# Diagnóstico Final: Bloqueio de Rede Render → Supabase (Porta 5432)

Os logs confirmam que o patch entrou (está tentando a porta `:5432` agora, não mais `:6543`), mas **ainda não conecta**:
`Can't reach database server at db...:5432`

Isso significa que o Render está sendo bloqueado pelo Supabase ou há uma falha de roteamento grave entre eles na porta 5432.

## Solução Definitiva: Voltar para o Pooler (6543) com Configuração Correta (IPv4)

Se a conexão direta (5432) está falhando no Render (mas funciona localmente), o problema é que o Render usa IPs rotativos que o Supabase pode não gostar na porta direta, ou problema de IPv6. O Pooler (6543) é feito para isso, mas precisa de **IPv4 forçado**.

### O que vou fazer:
1.  **Reverter o patch** que forçava a porta 5432.
2.  **Configurar o Prisma** para usar a porta 6543 (Pooler) mas resolvendo para o IP IPv4 do Supabase, se possível, ou apenas ajustando os parâmetros.
3.  **Adicionar Retry:** Implementar lógica de retentativa na conexão do Prisma.

Mas espere, se a 6543 falhava antes...
O erro na 6543 era "Can't reach" também.

Se **ambas** as portas falham do Render, mas funcionam localmente, o problema é **Supabase Network Restrictions** (IP Allowlist).
Você ativou "Network Restrictions" no Supabase? Se sim, o Render (que não tem IP fixo no plano free) será bloqueado.

**Plano de Ação:**
1.  **Verificar IP Allowlist (Supabase):** Você precisa garantir que o Supabase aceite `0.0.0.0/0` (qualquer IP).
2.  **Alternativa Técnica:** Vou tentar usar a string de conexão com o host `aws-0-sa-east-1.pooler.supabase.com` (host do pooler direto) em vez do alias do projeto, que as vezes resolve problemas de DNS no Render.

Vou alterar o `prisma.ts` para tentar resolver o DNS ou usar o pooler regional direto.

**Decisão:** Vou alterar o `backend/src/prisma.ts` para tentar usar o endereço do Pooler Regional se a variável de ambiente permitir, ou tentar uma conexão mais robusta.

Vou modificar o `prisma.ts` para tentar a porta 6543 novamente, mas com `pgbouncer=true` garantido e timeouts maiores. Se falhar, não tem o que fazer via código, é painel do Supabase.

Vou assumir que é DNS/IPv6. O Render as vezes prefere IPv6 e o Supabase as vezes falha no IPv6 do Pooler.
Vou tentar forçar o uso de IPv4 se possível? Não via Node facilmente.

Vou tentar reverter para a porta 5432 mas com `sslmode=no-verify` no código?
Prisma já faz SSL.

Vou tentar a porta **6543** de novo, mas removendo o patch que forçava 5432, e pedindo para você usar a URL do pooler regional.

**Melhor Aposta:** O usuário (você) deve ir no Supabase -> Project Settings -> Database -> Network Restrictions e verificar se está desativado (Allow all). Se estiver ativado, desligue.

Vou remover o patch e deixar a configuração via ENV, mas vou logar o IP que o backend está resolvendo para debug.
