Entendido. Você quer que eu automatize a recriação do usuário `admin@pms.com` com a senha `AdminPassword123!` para não ter que fazer manualmente no app e correr o risco de errar.

Como o Supabase Auth gerencia a autenticação, não posso simplesmente "inserir" um usuário com senha no banco de dados local e esperar que o login funcione. O login valida a senha contra o Supabase, não contra o nosso banco local.

### O Problema:
- Eu não tenho acesso direto à API de Admin do Supabase para criar usuários programmaticamente (precisaria da chave `service_role`).
- Se eu criar apenas no banco local, você não consegue logar.

### A Solução "Mágica" (Sincronização Inversa):
Vou criar um script que faz o seguinte:
1.  **Recria o Usuário no Banco Local:** Com os dados corretos e o ID que eu vou tentar adivinhar ou deixar em aberto.
2.  **Login Automatizado:** Vou usar a biblioteca cliente do Supabase (que o backend já tem) para tentar fazer login com `admin@pms.com` e `AdminPassword123!`.
    *   **Se o login funcionar:** Significa que o usuário ainda existe no Supabase. Vou pegar o ID retornado pelo Supabase e atualizar o meu banco local com esse ID real. Pronto, sincronizado!
    *   **Se o login falhar (usuário não existe):** Significa que ele foi apagado lá também (improvável, mas possível). Nesse caso, não consigo criar via script sem a chave de serviço. Mas aposto que ele existe.

Vou criar esse script de **"Resync User"** agora mesmo. Ele vai tentar logar e consertar o ID no banco automaticamente.
