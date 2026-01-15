# Plano de Preparação para Go-Live (V1 Final) - Com Opcionais

Este plano incorpora os requisitos originais e os opcionais sugeridos (Logger, Build Guard).

## 1. Segurança e Logs (Non-Negotiable + Opcional 1)
- **Criar `src/utils/logger.ts`**:
    - Implementar `Logger` com métodos `info`, `warn`, `error`.
    - Garantir que todos os logs sejam suprimidos se `__DEV__` for false (produção).
- **Sanitizar Código**: Substituir `console.log` por `Logger` em:
    - `src/services/api.ts`
    - `src/context/AuthContext.tsx`
    - `src/screens/DashboardScreen.tsx`

## 2. Infraestrutura e Configuração (Hard Gate)
- **Atualizar `app.json`**:
    - Adicionar `android.versionCode: 1`.
    - Adicionar `ios.buildNumber: "1"`.
- **Validar `env.ts`**:
    - Adicionar verificação de segurança: Logar `error` se estiver em Production com URL local.

## 3. UX de Falha e Recuperação
- **Melhorar `src/services/api.ts`**:
    - Detectar erro de rede (`!error.response`).
    - Usar `Alert.alert` para feedback claro de "Sem Conexão" ou "Servidor Indisponível".

## 4. Visual Build Guard (Opcional 2)
- **Atualizar `SettingsScreen.tsx`**:
    - Adicionar uma seção discreta no rodapé exibindo:
        - Versão do App (do `app.json`).
        - Ambiente Atual (Production/Development).
    - Isso facilita a validação visual do build instalado.

## Resumo das Tarefas
1.  Criar `src/utils/logger.ts`.
2.  Atualizar `src/services/api.ts` (Logger + Offline Alert).
3.  Atualizar `src/context/AuthContext.tsx` (Logger).
4.  Atualizar `src/screens/DashboardScreen.tsx` (Logger).
5.  Atualizar `src/screens/SettingsScreen.tsx` (Build Info).
6.  Atualizar `app.json` (Versionamento).
7.  Atualizar `src/config/env.ts` (Validação).
