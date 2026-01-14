Ainda estamos enfrentando um mistério. O código parece correto, o banco tem os dados (confirmei no script de seed), e a tela de Pedidos funciona.

Para resolver de vez, preciso "ver" o que o servidor está recebendo quando você muda o filtro na Dashboard.

### Plano de Diagnóstico (Logs Cirúrgicos):
Vou adicionar logs detalhados no **Backend** (`reportsController.ts` e `productController.ts`) para imprimir no terminal:
1.  **Quem está chamando:** (Role do usuário).
2.  **O que foi pedido:** (Query params brutos).
3.  **Como foi interpretado:** (Se o `supplierId` foi aceito ou descartado).
4.  **O filtro final:** (O objeto `where` do Prisma).

Assim que eu adicionar esses logs, vou pedir para você tentar filtrar novamente na Dashboard, e eu verei exatamente onde a lógica está falhando (se é o Frontend enviando errado ou o Backend ignorando).
