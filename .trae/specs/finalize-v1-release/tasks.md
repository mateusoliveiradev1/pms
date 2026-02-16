# Tarefas

- [x] Tarefa 1: Configurar Deep Linking e Build (Mobile)
  - [x] SubTarefa 1.1: Adicionar `scheme: "pmsops"` em `app.json`.
  - [x] SubTarefa 1.2: Configurar `signingConfigs.release` em `android/app/build.gradle` (instruções para keystore).
  - [x] SubTarefa 1.3: Atualizar versão do app para `1.0.2` (preparação release).

- [x] Tarefa 2: Implementar Proxy de Auth ML (Backend)
  - [x] SubTarefa 2.1: Criar endpoint `GET /mercadolivre/mobile-redirect` que recebe `code` e redireciona para `pmsops://ml-auth?code=...`.
  - [x] SubTarefa 2.2: Atualizar `getAuthUrl` (ou variável de ambiente) para usar este novo endpoint como `redirect_uri`.

- [x] Tarefa 3: Corrigir Fluxo Frontend ML (Mobile)
  - [x] SubTarefa 3.1: Atualizar `SettingsScreen` para usar `WebBrowser.openAuthSessionAsync`.
  - [x] SubTarefa 3.2: Implementar extração do `code` do resultado da sessão.
  - [x] SubTarefa 3.3: Chamar `POST /mercadolivre/callback` com o código extraído.

- [x] Tarefa 4: Refatoração Visual da Automação (Mobile)
  - [x] SubTarefa 4.1: `DashboardScreen` - Adicionar Card de Status da Integração (Verde = Conectado/Sincronizando).
  - [x] SubTarefa 4.2: `ProductDetailsScreen` - Exibir logo ML se o produto estiver sincronizado, com link externo.
  - [x] SubTarefa 4.3: `OrdersListScreen` - Destacar pedidos importados do ML com ícone e badge específicos.

- [x] Tarefa 5: Validação Final (Manual)
  - [x] SubTarefa 5.1: Gerar APK de release assinado.
  - [x] SubTarefa 5.2: Testar fluxo de conexão ML no dispositivo real.
