Você está certo. Tentei otimizar e acabei quebrando o fluxo. Peço desculpas.

Vou **reverter imediatamente** o Frontend (`DashboardScreen.tsx`) para a versão anterior que **já estava funcionando** (aquela que você disse "AMEM funcionou").

Vou desfazer a chamada ao endpoint `/dashboard-summary` e voltar para as chamadas individuais (`/products` e `/reports/sales`), mantendo apenas a correção do filtro (`?supplierId=...`) que já tínhamos validado.

Não vou mexer no backend agora para não correr riscos. Vou apenas consertar o app para ele voltar a funcionar como estava há 10 minutos.
