Entendido. O ambiente atual está "sujo" com dados de teste confusos, o que torna impossível saber se o bug é código ou dados inconsistentes. Você quer limpar a casa e testar do zero com um cenário limpo e realista.

Aqui está o plano para o **Reset e Smoke Test Completo**:

### 1. Limpeza de Dados (Database Reset)
- Criar um script (ou usar o Prisma Studio/CLI) para **apagar todos os dados** das tabelas principais: `Order`, `Product`, `Supplier`, `InventoryLog`, `Notification`, etc.
- Manter apenas o seu usuário `System Admin` (ou recriá-lo limpo) para não perder o acesso.

### 2. Criação de Cenário Controlado (Seed Realista)
Vou criar um script de seed que gera um cenário de teste claro e verificável:
- **Conta A (Sua Conta Principal):**
    - 2 Fornecedores: "Fornecedor Tech" e "Fornecedor Moda".
    - 5 Produtos para cada fornecedor (Total 10).
    - 3 Pedidos para "Fornecedor Tech" e 2 Pedidos para "Fornecedor Moda".
- **Conta B (Outra Conta Isolada):**
    - 1 Fornecedor Exclusivo.
    - 3 Produtos.
    - 1 Pedido.

### 3. Execução do Smoke Test
Após o reset, verificaremos juntos:
1.  **Isolamento de Contas:** A Conta A não deve ver nada da Conta B.
2.  **Dashboard Global:** Como System Admin, você deve ver a soma de tudo (Total global).
3.  **Filtro por Fornecedor:**
    - Filtrar "Fornecedor Tech": Deve mostrar apenas os 5 produtos e 3 pedidos dele.
    - Filtrar "Fornecedor Moda": Deve mostrar apenas os 5 produtos e 2 pedidos dele.

### 4. Correção de Código (Se necessário)
- Se após o reset o filtro continuar falhando, saberemos com 100% de certeza que é código, e aplicarei a correção simplificada no controller.

Podemos prosseguir com esse "Hard Reset" do banco de dados?
