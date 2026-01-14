Entendi sua dúvida. A tela de cadastro é unificada, mas a experiência para "Vendedor Individual" pode ser um pouco confusa por causa dos rótulos dos campos.

### Qual escolher?
Para o seu teste (e para a maioria dos usuários iniciais), o tipo **Vendedor Individual** é o ideal e mais rápido. Ele cria a conta e o fornecedor automaticamente, permitindo que você comece a operar imediatamente.

### Sobre o campo "Nome Completo (Admin)"
Você tem razão, o rótulo pode parecer estranho. No contexto de um Vendedor Individual, o "Admin" é você mesmo (o dono). O sistema pede esse nome para criar o registro do **Usuário** que fará login, enquanto o "Nome do Negócio" será usado para a **Conta/Loja**.

### Plano de Melhoria Rápida (UX):
Para tornar isso mais claro, vou ajustar os rótulos dinamicamente no `RegisterScreen.tsx`:

1.  **Quando "Vendedor Individual" estiver selecionado:**
    *   Mudar "Nome Completo (Admin)" para **"Seu Nome Completo"**.
    *   Manter "Nome do Negócio / Marca" (está bom).

2.  **Quando "Empresa" estiver selecionado:**
    *   Manter "Nome Completo (Admin)" (faz sentido, pois pode ser um funcionário criando a conta).

Vou aplicar essa pequena alteração de texto agora mesmo para facilitar o entendimento. Pode prosseguir com a criação da conta como **Vendedor Individual** (use `admin@pms.com` / `123456` conforme combinamos para o teste).
