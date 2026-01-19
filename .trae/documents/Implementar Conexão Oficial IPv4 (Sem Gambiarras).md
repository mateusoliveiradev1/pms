Entendido. Vamos eliminar todas as customizações e hacks. A solução profissional é usar a infraestrutura nativa corretamente.

1.  **Limpeza Total (Revert to Standard):**
    *   Vou remover completamente o `adapter-pg`, o driver `pg` e o patch de DNS do projeto.
    *   O `src/prisma.ts` voltará a ser o código padrão limpo (`new PrismaClient()`), como em qualquer projeto profissional.

2.  **Validação da Conexão Oficial (Local):**
    *   Vou rodar um script local para identificar a **Connection String IPv4 Oficial** correta do Supabase (Host: `aws-0-sa-east-1...`).
    *   Testarei especificamente a **Porta 5432 (Session Mode)**, que é mais compatível com o Prisma e elimina problemas de "Prepared Statements" comuns no modo Transaction.

3.  **Configuração Limpa:**
    *   Aplicarei apenas a URL de conexão correta e validada. O Prisma (Rust Engine) gerenciará a conexão nativamente, garantindo performance e escalabilidade sem "gambiarras".

Esta abordagem remove toda a complexidade adicionada e confia na configuração correta da infraestrutura.