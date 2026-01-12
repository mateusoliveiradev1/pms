# Checklist de Pré-Produção (PASSO 8B)

Este documento deve ser validado antes de qualquer deploy em produção.

## 1. Configuração de Ambiente
- [ ] **Variáveis de Ambiente (`.env`)**:
  - [ ] `APP_ENV=production`
  - [ ] `DATABASE_URL` aponta para o banco de produção (AWS/Supabase)
  - [ ] `JWT_SECRET` e `ADMIN_JWT_SECRET` são fortes e únicos
  - [ ] `ENCRYPTION_KEY` definida
  - [ ] `WEBHOOK_SECRET` sincronizado com Stripe/MercadoPago
- [ ] **Feature Flags (`src/config/flags.ts`)**:
  - [ ] `ENABLE_WEBHOOKS=true`
  - [ ] `ENABLE_EXPORTS=true`
  - [ ] `ENABLE_NOTIFICATIONS=true` (se desejado)

## 2. Banco de Dados
- [ ] **Migrações**:
  - [ ] `npx prisma migrate deploy` executado com sucesso
  - [ ] Schema sincronizado
- [ ] **Seeds**:
  - [ ] Usuário Admin inicial criado (se banco novo)

## 3. Segurança
- [ ] **HTTPS/TLS**: Certificados ativos e válidos
- [ ] **CORS**: `CORS_ORIGIN` configurado corretamente com domínio do frontend/dashboard
- [ ] **Rate Limiting**:
  - [ ] Testar limites de Auth (login não deve permitir brute-force)
  - [ ] Testar limites de Webhook
- [ ] **Headers**:
  - [ ] Verificar headers de segurança (Helmet) via `curl -I`

## 4. Observabilidade & Logs
- [ ] **Logs**:
  - [ ] Verificar se logs `INFO` NÃO estão aparecendo no console
  - [ ] Verificar se logs `CRITICAL` estão sendo persistidos no banco (`SystemEventLog`)
  - [ ] Verificar arquivo `logs/app.log` (deve conter erros/warns)
- [ ] **Monitoramento**:
  - [ ] Endpoint de saúde `/` retornando status e ambiente

## 5. Mobile App
- [ ] **Build**:
  - [ ] Gerar build com perfil de produção (`eas build --profile production`)
  - [ ] Verificar se `API_URL` aponta para produção
- [ ] **Teste**:
  - [ ] Login funciona
  - [ ] Dados carregam corretamente

## 6. Integrações
- [ ] **Stripe/MercadoPago**:
  - [ ] Webhooks apontando para URL de produção
  - [ ] Chaves de produção configuradas

## 7. Plano de Rollback
- [ ] Backup do banco de dados realizado antes do deploy
- [ ] Script de reversão de migração (se aplicável) testado

---
**Data da Validação:** _____/_____/_____
**Responsável:** _______________________
