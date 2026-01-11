# Checklist de Validação Pré-Produção (Sandbox)

Este documento define os testes obrigatórios para garantir a estabilidade financeira e operacional do sistema antes do deploy em produção.

## 1. Configuração de Ambiente
- [ ] **Variáveis de Ambiente**: `ENV=staging` ou `development` configurado.
- [ ] **Gateway de Pagamento**: Chaves de Sandbox (Mercado Pago / Stripe) configuradas. Nenhuma chave de produção presente.
- [ ] **Banco de Dados**: Banco de dados de staging isolado da produção.
- [ ] **Logs**: Logs financeiros (`financial_audit.log`) sendo gerados em `backend/logs/`.

## 2. Fluxos de Pagamento (Sandbox)
| Cenário | Input | Resultado Esperado | Resultado Obtido | Status |
|---|---|---|---|---|
| **Pagamento Aprovado** | Criar pedido, gerar PIX (MP), simular pgto (API/Painel MP) | Status do pedido -> PAID. Ledger: ORDER_PAYMENT (Entrada). | | |
| **Pagamento Recusado** | Criar pedido, simular recusa (Cartão/Stripe) | Status -> PAYMENT_FAILED. Nenhuma entrada no Ledger. | | |
| **Pagamento Pendente** | Criar pedido (PIX/Boleto) | Status -> PENDING. Ledger: vazio (ou aguardando). | | |
| **Split Financeiro** | Pedido de R$ 100,00 (Comissão 10%) | Ledger: +90 (Forn), +10 (Plat). Saldo Pendente Forn += 90. | | |

## 3. Fluxos de Saque (Withdrawal)
| Cenário | Input | Resultado Esperado | Resultado Obtido | Status |
|---|---|---|---|---|
| **Solicitação de Saque** | Fornecedor solicita R$ 50,00 | Status -> PENDING. Saldo Bloqueado += 50. Log: WITHDRAWAL_REQUESTED. | | |
| **Saldo Insuficiente** | Solicitar valor > Saldo Disponível | Erro "Saldo insuficiente". Nenhuma alteração de saldo. | | |
| **Aprovação Admin** | Admin aprova saque pendente | Status -> PAID. Saldo Bloqueado -= 50. Ledger: PAYOUT. Log: WITHDRAWAL_PAID. | | |
| **Rejeição Admin** | Admin rejeita saque | Status -> REJECTED. Saldo Bloqueado -= 50, Disponível += 50. Log: WITHDRAWAL_REJECTED. | | |

## 4. Admin & Segurança
- [ ] **Rota Protegida**: Tentar acessar `/api/financial-admin/overview` sem token -> 401 Unauthorized.
- [ ] **Role Check**: Tentar acessar rotas de admin com token de Fornecedor -> 403 Forbidden.
- [ ] **Audit Logs**: Verificar se ações de admin (Aprovar/Rejeitar) geraram registros na tabela `AdminLog`.

## 5. Rastreabilidade (Logs)
Verificar se os seguintes eventos aparecem em `backend/logs/financial_audit.log`:
- [ ] `PAYMENT_CREATED`
- [ ] `PAYMENT_CONFIRMED`
- [ ] `WITHDRAWAL_REQUESTED`
- [ ] `WITHDRAWAL_PAID`
- [ ] `WITHDRAWAL_REJECTED`

## 6. Integridade do Ledger (Imutabilidade)
- [ ] Verificar que NENHUM registro do Ledger foi alterado ou deletado (apenas inserts).
- [ ] Verificar consistência: Soma(Ledger Fornecedor) == Saldo Atual (Wallet + Pending).

---
**Data da Execução:** ____________________
**Responsável:** ____________________
**Aprovado para Produção?** ( ) SIM  ( ) NÃO
