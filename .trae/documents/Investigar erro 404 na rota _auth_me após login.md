O erro `API Error: GET /auth/me 404` indica que, embora o login tenha funcionado (você obteve um token), a rota que busca os dados do usuário (`/me`) não está encontrando o registro no banco de dados ou está falhando de alguma forma.

Isso é estranho porque o script de sincronização disse que criou o usuário.

**Possíveis causas:**
1.  **Divergência de ID:** O ID que o script usou para criar o usuário no banco pode não ser *exatamente* o mesmo que está no token JWT.
2.  **Rota `/me` com bug:** O controller pode estar buscando por um campo errado ou o token não está sendo decodificado corretamente.

### Plano de Correção:
1.  **Verificar `authController.ts`:** Analisar como a rota `/me` busca o usuário.
2.  **Debugar o Token:** Vou adicionar logs no middleware de autenticação para ver qual ID está chegando no token e comparar com o que temos no banco.
3.  **Forçar Re-Sync se necessário:** Se o ID estiver errado, ajustaremos manualmente.

Vou começar verificando o código do `authController` para entender por que ele retorna 404.
