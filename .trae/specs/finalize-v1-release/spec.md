# Especificação: Finalização do App para Lançamento (V1) - 100% Automático

## Por que
O usuário solicitou uma garantia de "100% de funcionamento" e status para lançamento na Play Store. Atualmente, o app está em cerca de **85%** de conclusão para uma V1 funcional. Os 15% restantes são críticos: a integração do Mercado Livre no mobile está quebrada (não retorna ao app), faltam feedbacks visuais de automação nas telas e a configuração de build para produção está incompleta.

## O que muda

### Mobile (Frontend)
-   **Deep Linking**: Adicionar `scheme: "pmsops"` ao `app.json` para permitir que o app seja aberto via URL.
-   **Fluxo de Auth ML**: Substituir `WebBrowser.openBrowserAsync` por `WebBrowser.openAuthSessionAsync`.
    -   Isso permite capturar o retorno da autenticação automaticamente.
-   **Refatoração Visual (Automação)**:
    -   **ProductDetailsScreen**: Adicionar badge "Sincronizado ML" e link para ver o anúncio.
    -   **OrdersListScreen**: Destacar visualmente pedidos importados automaticamente ("Via ML").
    -   **DashboardScreen**: Adicionar card "Integrações Ativas" mostrando status da automação em tempo real.

### Backend
-   **Proxy de Callback Mobile (`GET /mercadolivre/mobile-redirect`)**:
    -   Novo endpoint que recebe o callback do Mercado Livre (GET com `code`).
    -   Ação: Redireciona 302 para `pmsops://ml-auth?code=...`.
    -   Isso serve como uma "ponte" para tirar o usuário do navegador e voltar para o App.
-   **Ajuste de Auth URL**: `getAuthUrl` deve apontar o `redirect_uri` para este novo endpoint de proxy.

### Configuração de Build (Android)
-   **Keystore de Produção**: Gerar uma keystore real (`release.keystore`) e configurar `build.gradle` para assinar o APK de release corretamente.

## Impacto
-   **Integração ML**: Passará a funcionar de verdade no dispositivo móvel, sem travar o usuário no navegador.
-   **Play Store**: O APK gerado será aceito pelo Google Console (assinado corretamente).
-   **UX**: O usuário verá claramente que o sistema está trabalhando por ele (badges de automação).

## Requisitos ADICIONADOS
### Requisito: Feedback de Automação
Todas as telas relevantes (Produtos, Pedidos, Dashboard) DEVEM exibir indicadores visuais claros de que a integração com ML está ativa e funcionando.

## ADDED Requirements
### Requirement: Build via EAS
The system SHALL use Expo Application Services (EAS) for Android builds to ensure a consistent environment and avoid local configuration issues (e.g., JDK versions).
- **WHEN** developer runs build command
- **THEN** it triggers a remote build using `eas build --platform android --profile preview`

## MODIFIED Requirements
### Requirement: Authentication Flow
The Mercado Livre authentication flow is modified to use a custom scheme (`pmsops://`) instead of deep linking to a web page, ensuring the user is redirected back to the app after login.
