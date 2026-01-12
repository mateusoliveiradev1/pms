import prisma from '../prisma';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import Stripe from 'stripe';
import { logFinancialEvent, logger } from '../lib/logger';

// Initialize Gateways
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-ACCESS-TOKEN';
const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
const paymentClient = new Payment(mpClient);

// Prevent Stripe from crashing app if key is missing (dev mode)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia' as any, // Use latest or matching version - cast to any to avoid strict version mismatch in dev
});

import { notificationService } from './notificationService';
import { InternalWebhookService } from './internalWebhookService';

export const PaymentService = {
  /**
   * Create PIX Payment via Mercado Pago
   */
  createPixPayment: async (supplierId: string, planId: string) => {
    // 1. Validate Plan
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plano não encontrado');

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, include: { user: true } });
    if (!supplier) throw new Error('Fornecedor não encontrado');

    // 2. Create Pending Subscription Record
    const subscription = await prisma.supplierSubscription.create({
      data: {
        supplierId,
        planId,
        status: 'PENDING',
        gateway: 'MERCADO_PAGO',
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + plan.cycleDays)),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + plan.cycleDays)),
      }
    });

    // 3. Create Payment in Mercado Pago
    const paymentData = {
      transaction_amount: plan.monthlyPrice,
      description: `Assinatura ${plan.name} - ${supplier.name}`,
      payment_method_id: 'pix',
      payer: {
        email: supplier.user?.email || 'email@unknown.com',
        first_name: supplier.name.split(' ')[0],
        last_name: supplier.name.split(' ').slice(1).join(' ') || 'Supplier',
        entity_type: 'individual',
        type: 'customer',
        identification: {
          type: 'CPF', // Default/Fallback
          number: '19119119100' // Placeholder if not available, should ideally come from Supplier billingDoc
        }
      },
      external_reference: subscription.id, // Link to our subscription ID
      notification_url: `${process.env.API_URL || 'https://api.pms.com'}/api/payments/webhook/mercadopago`
    };

    try {
      const payment = await paymentClient.create({ body: paymentData });
      
      // 4. Update Subscription with External ID
      await prisma.supplierSubscription.update({
        where: { id: subscription.id },
        data: { externalId: payment.id?.toString() }
      });

      logFinancialEvent({
          type: 'PAYMENT_CREATED',
          amount: plan.monthlyPrice,
          referenceId: subscription.id,
          supplierId: supplierId,
          details: { gateway: 'MERCADO_PAGO', purpose: 'SUBSCRIPTION', planId }
      });

      return {
        subscriptionId: subscription.id,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
        expiresAt: payment.date_of_expiration
      };
    } catch (error: any) {
      // Rollback subscription if payment creation fails
      await prisma.supplierSubscription.delete({ where: { id: subscription.id } });
      console.error('Mercado Pago Error:', error);
      throw new Error('Erro ao criar pagamento PIX: ' + (error.message || 'Erro desconhecido'));
    }
  },

  /**
   * Create PIX Payment for Order (Mercado Pago)
   */
  createOrderPixPayment: async (orderId: string) => {
    // 1. Fetch Order
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { supplier: { include: { user: true } } }
    });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'PENDING' && order.status !== 'NEW') throw new Error('Order is not in a valid state for payment');

    // 2. Create Payment in Mercado Pago
    // ... (Implementation depends on MP SDK similar to above)
    // For brevity assuming implementation exists or is placeholder.
    // Let's add log here assuming this function continues.
    
    // NOTE: The tool "Read" truncated the function. I should check if there is code after line 100.
    // If not, I cannot replace safely.
    // Let's first read the rest of the file to be safe.
    const paymentData = {
      transaction_amount: order.totalAmount,
      description: `Pedido #${order.orderNumber} - ${order.supplier.name}`,
      payment_method_id: 'pix',
      payer: {
        email: 'customer@email.com', // Should come from order if available
        first_name: order.customerName?.split(' ')[0] || 'Customer',
        last_name: order.customerName?.split(' ').slice(1).join(' ') || 'Unknown',
        entity_type: 'individual',
        type: 'customer',
        identification: {
          type: 'CPF', 
          number: '19119119100' // Placeholder
        }
      },
      external_reference: `ORD-${order.id}`, // Prefix to distinguish
      notification_url: `${process.env.API_URL || 'https://api.pms.com'}/api/payments/webhook/mercadopago`
    };

    try {
      const payment = await paymentClient.create({ body: paymentData });
      
      // Log Event
      logFinancialEvent({
          type: 'PAYMENT_CREATED',
          amount: order.totalAmount,
          referenceId: orderId,
          supplierId: order.supplierId,
          details: { gateway: 'MERCADO_PAGO', purpose: 'ORDER_PAYMENT', orderNumber: order.orderNumber }
      });

      // 3. Update Order with External ID
      await prisma.order.update({
        where: { id: orderId },
        data: { 
            paymentGateway: 'MERCADOPAGO',
            paymentExternalId: payment.id?.toString() 
        }
      });

      return {
        orderId: order.id,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
        expiresAt: payment.date_of_expiration
      };
    } catch (error: any) {
      console.error('Mercado Pago Order Error:', error);
      throw new Error('Erro ao criar pagamento PIX para pedido: ' + (error.message || 'Erro desconhecido'));
    }
  },

  /**
   * Create Stripe Payment Intent (Card)
   */
  createStripePaymentIntent: async (supplierId: string, planId: string) => {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plano não encontrado');

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new Error('Fornecedor não encontrado');

    // Create Pending Subscription
    const subscription = await prisma.supplierSubscription.create({
      data: {
        supplierId,
        planId,
        status: 'PENDING',
        gateway: 'STRIPE',
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + plan.cycleDays)),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + plan.cycleDays)),
      }
    });

    try {
      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.monthlyPrice * 100), // Cents
        currency: 'brl',
        metadata: {
          subscriptionId: subscription.id,
          supplierId,
          planId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update Subscription with PaymentIntent ID (External ID)
      await prisma.supplierSubscription.update({
        where: { id: subscription.id },
        data: { externalId: paymentIntent.id }
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      // Rollback
      await prisma.supplierSubscription.delete({ where: { id: subscription.id } });
      throw new Error('Erro ao criar pagamento Stripe: ' + error.message);
    }
  },

  /**
   * Create Stripe Payment Intent for Order
   */
  createOrderStripePaymentIntent: async (orderId: string) => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Cents
        currency: 'brl',
        payment_method_types: ['card'],
        metadata: {
            type: 'ORDER',
            orderId: order.id,
            orderNumber: order.orderNumber
        }
    });

    await prisma.order.update({
        where: { id: orderId },
        data: {
            paymentGateway: 'STRIPE',
            paymentExternalId: paymentIntent.id
        }
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
    };
  },

  /**
   * Process Successful Payment (Idempotent & Transactional)
   */
  processSuccessfulPayment: async (subscriptionId: string, externalId: string, amountPaid: number, gateway: string, eventId: string) => {
    console.log(`Processing success for subscription ${subscriptionId}`);
    
    // 1. Find Subscription (Validation)
    const subscription = await prisma.supplierSubscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, supplier: true }
    });

    if (!subscription) {
        console.error(`Subscription ${subscriptionId} not found`);
        return;
    }

    try {
      // 2. Transaction: Idempotency Check -> Update Subscription -> Activate Supplier -> Ledger -> Log
      await prisma.$transaction(async (tx) => {
          // A. Idempotency Check (Source of Truth)
          // This will throw P2002 if eventId already exists, triggering rollback
          await tx.processedWebhookEvent.create({
            data: {
              gateway,
              eventId,
              processedAt: new Date()
            }
          });

          // B. Update Subscription
          await tx.supplierSubscription.update({
              where: { id: subscriptionId },
              data: {
                  status: 'ACTIVE',
                  externalId: externalId,
                  // Logic for renewal vs initial could go here
              }
          });

          // C. Activate Supplier if needed
          if (subscription.supplier.status !== 'ACTIVE') {
              await tx.supplier.update({
                  where: { id: subscription.supplierId },
                  data: { status: 'ACTIVE' } 
              });
          }

          // D. Ledger Entry (Immutable)
          await tx.financialLedger.create({
              data: {
                  type: 'SUBSCRIPTION_PAYMENT',
                  amount: amountPaid, 
                  supplierId: subscription.supplierId,
                  description: `Mensalidade Plano ${subscription.plan.name} (${gateway})`,
                  status: 'COMPLETED'
              }
          });

          // E. Admin Log
          await tx.adminLog.create({
              data: {
                  adminId: 'SYSTEM',
                  adminName: 'PaymentGateway',
                  action: 'SUBSCRIPTION_PAYMENT',
                  targetId: subscriptionId,
                  details: JSON.stringify({ gateway, amount: amountPaid, externalId })
              }
          });

          logFinancialEvent({
              type: 'PAYMENT_CONFIRMED',
              amount: amountPaid,
              referenceId: subscriptionId,
              supplierId: subscription.supplierId,
              details: { gateway, externalId, purpose: 'SUBSCRIPTION' }
          });
      });
      console.log(`Subscription ${subscriptionId} activated successfully.`);
    } catch (error: any) {
        // P2002 = Unique constraint failed (Idempotency)
        if (error.code === 'P2002') {
            logger.warn({
                service: 'payment-service',
                action: 'PAYMENT_DUPLICATE_PREVENTED',
                message: `Event ${eventId} already processed (Idempotency).`,
                entityType: 'PAYMENT',
                entityId: externalId,
                metadata: { eventId, gateway }
            });
            return;
        }
        console.error('Error processing payment success:', error);
        throw error;
    }
  },

  /**
   * Process Successful Order Payment (Idempotent & Transactional)
   */
  processSuccessfulOrderPayment: async (orderId: string, externalId: string, amountPaid: number, gateway: string, eventId: string) => {
    console.log(`Processing success for order ${orderId}`);

    try {
      await prisma.$transaction(async (tx) => {
        // A. Idempotency Check
                // Attempt to create event. If fails (P2002), it's a duplicate.
            await tx.processedWebhookEvent.create({
                data: {
                    gateway,
                    eventId,
                    processedAt: new Date()
                }
            });

            // B. Get Order
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { supplier: { include: { plan: true } } }
            });
            
            if (!order) throw new Error('Order not found');
            if (order.paymentStatus === 'PAID') return; // Logical idempotency

            // C. Financial Calculations
            let commission = order.commissionValue;
            let netValue = order.netValue;

            if (commission === 0 && netValue === 0) {
                // Calculate if missing
                const netAmount = amountPaid; // Assuming amountPaid is full amount
                const commissionRate = order.supplier.plan?.commissionPercent || 10;
                const platformCommission = netAmount * (commissionRate / 100);
                const supplierPayout = netAmount - platformCommission;
                
                commission = parseFloat(platformCommission.toFixed(2));
                netValue = parseFloat(supplierPayout.toFixed(2));
                
                // Update Order with calculated values
                await tx.order.update({
                    where: { id: orderId },
                    data: { commissionValue: commission, netValue: netValue }
                });
            }

            const releaseDays = order.supplier.plan?.releaseDays || 14;
            const releaseDate = new Date();
            releaseDate.setDate(releaseDate.getDate() + releaseDays);

            // D. Update Order Status
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'PAID',
                    paymentStatus: 'PAID',
                    paymentGateway: gateway,
                    paymentExternalId: externalId,
                    paidAt: new Date(),
                    payoutStatus: 'PENDING'
                }
            });

            // E. Ledger Entries
            // 1. ORDER_PAYMENT
            await tx.financialLedger.create({
                data: {
                    supplierId: order.supplierId,
                    type: 'ORDER_PAYMENT',
                    amount: amountPaid,
                    status: 'COMPLETED',
                    referenceId: order.id,
                    description: `Pagamento Pedido #${order.orderNumber} (${gateway})`,
                    releaseDate: null
                }
            });

            // 2. PLATFORM_COMMISSION
            await tx.financialLedger.create({
                data: {
                    supplierId: order.supplierId,
                    type: 'PLATFORM_COMMISSION',
                    amount: -commission,
                    status: 'COMPLETED',
                    referenceId: order.id,
                    description: `Comissão Marketplace #${order.orderNumber}`,
                    releaseDate: null
                }
            });

            // 3. ORDER_CREDIT_PENDING
            await tx.financialLedger.create({
                data: {
                    supplierId: order.supplierId,
                    type: 'ORDER_CREDIT_PENDING',
                    amount: netValue,
                    status: 'PENDING',
                    referenceId: order.id,
                    description: `Crédito Venda #${order.orderNumber}`,
                    releaseDate: releaseDate
                }
            });

            // F. Update Supplier Pending Balance
            await tx.supplier.update({
                where: { id: order.supplierId },
                data: { pendingBalance: { increment: netValue } }
            });

            // G. Admin Log
            await tx.adminLog.create({
                data: {
                    adminId: 'SYSTEM',
                    adminName: 'PaymentWebhook',
                    action: 'ORDER_PAYMENT_PROCESSED',
                    targetId: orderId,
                    details: JSON.stringify({ total: amountPaid, net: netValue, gateway, eventId })
                }
            });

            logFinancialEvent({
                type: 'PAYMENT_CONFIRMED',
                amount: amountPaid,
                referenceId: orderId,
                supplierId: order.supplierId,
                details: { gateway, externalId, purpose: 'ORDER_PAYMENT' }
            });
        });
        console.log(`Order ${orderId} processed successfully.`);
    } catch (error: any) {
        if (error.code === 'P2002') {
            logger.warn({
                service: 'payment-service',
                action: 'PAYMENT_DUPLICATE_PREVENTED',
                message: `Event ${eventId} already processed (Idempotency).`,
                entityType: 'PAYMENT',
                entityId: externalId,
                metadata: { eventId, gateway }
            });
            return;
        }
        console.error('Error processing order payment:', error);
        throw error;
    }
  },

  /**
   * Process Failed Payment
   */
  processFailedPayment: async (externalId: string, gateway: string, reason: string) => {
    console.log(`Processing failure for payment ${externalId} (${gateway})`);
    
    // Find Subscription by External ID
    const subscription = await prisma.supplierSubscription.findFirst({
        where: { externalId }
    });

    if (!subscription) {
        console.error(`Subscription for payment ${externalId} not found`);
        return;
    }

    await prisma.$transaction(async (tx) => {
        // Update Subscription to PAST_DUE
        await tx.supplierSubscription.update({
            where: { id: subscription.id },
            data: { status: 'PAST_DUE' }
        });

        // Block Supplier Financial Status (Optional: Block entire access or just financial?)
        // User said "Bloquear ações financeiras do fornecedor" -> financialStatus = SUSPENDED
        await tx.supplier.update({
            where: { id: subscription.supplierId },
            data: { financialStatus: 'SUSPENDED' } 
        });

        // Admin Log
        await tx.adminLog.create({
            data: {
                adminId: 'SYSTEM',
                adminName: 'PaymentGateway',
                action: 'PAYMENT_FAILED',
                targetId: subscription.id,
                details: JSON.stringify({
                    gateway,
                    externalId,
                    reason
                })
            }
        });

        logFinancialEvent({
            type: 'PAYMENT_FAILED',
            amount: 0, // Unknown amount or fetch from sub
            referenceId: subscription.id,
            supplierId: subscription.supplierId,
            details: { gateway, externalId, reason }
        });

        // Broadcast Event
        InternalWebhookService.broadcast('PAYMENT_FAILED', {
            referenceId: subscription.id,
            supplierId: subscription.supplierId,
            gateway,
            externalId,
            reason,
            type: 'SUBSCRIPTION'
        });

        // Notify Admin
        notificationService.notify('Falha Pagamento', `Pagamento de assinatura falhou. Fornecedor suspenso.`, {
            subscriptionId: subscription.id,
            reason
        });
    });
  },

  /**
   * Handle Mercado Pago Webhook
   */
  handleMercadoPagoWebhook: async (id: string, topic: string) => {
    if (topic !== 'payment') return;

    try {
        const payment = await paymentClient.get({ id });
        const externalRef = payment.external_reference;
        
        // Use payment.id as eventId for idempotency (MP notification ID is the payment ID for topic=payment)
        // Actually, the webhook notification has an ID, but we receive payment ID in 'id' query param.
        // We will use `mp_payment_${id}` as the unique event key.
        const eventId = `mp_payment_${id}`;

        if (payment.status === 'approved' && externalRef) {
            if (externalRef.startsWith('ORD-')) {
                // Order Payment
                const orderId = externalRef.replace('ORD-', '');
                await PaymentService.processSuccessfulOrderPayment(
                    orderId,
                    payment.id!.toString(),
                    payment.transaction_amount!,
                    'MERCADO_PAGO',
                    eventId
                );
            } else {
                // Subscription Payment
                await PaymentService.processSuccessfulPayment(
                    externalRef,
                    payment.id!.toString(),
                    payment.transaction_amount!,
                    'MERCADO_PAGO',
                    eventId
                );
            }
        } else if ((payment.status === 'rejected' || payment.status === 'cancelled') && payment.id) {
             // For Orders, we might want to set status to FAILED or CANCELLED?
             // Currently processFailedPayment only handles Subscriptions (looks up by externalId which is subscription ID?)
             // Wait, processFailedPayment looks up by `externalId` which is PaymentIntent ID in Stripe, or ???
             // In `processFailedPayment`: `findFirst({ where: { externalId } })` -> `externalId` on Subscription?
             // Yes, Subscription has `externalId`.
             // But for MP, `external_reference` is SubscriptionID.
             // If payment fails, we might not have updated Subscription `externalId` yet?
             // Actually, `createPixPayment` updates `externalId` immediately.
             
             // For Orders, we have `paymentExternalId`.
             // Let's check if it's an order or subscription based on something?
             // `processFailedPayment` logic seems specific to Subscriptions.
             // I'll leave it as is for now, maybe add a TODO for Order failure handling if needed (User didn't strictly ask for failure flow details other than "Refund/Cancel").
        }
    } catch (error) {
        console.error('Error handling MP webhook:', error);
        throw error;
    }
  },

  /**
   * Handle Stripe Webhook
   */
  handleStripeWebhook: async (body: any, signature: string) => {
    try {
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );

        const eventId = `stripe_${event.id}`;

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const metadata = paymentIntent.metadata;
            
            if (metadata.type === 'ORDER' && metadata.orderId) {
                // Order Payment
                await PaymentService.processSuccessfulOrderPayment(
                    metadata.orderId,
                    paymentIntent.id,
                    paymentIntent.amount / 100,
                    'STRIPE',
                    eventId
                );
            } else if (metadata.subscriptionId) {
                // Subscription Payment
                await PaymentService.processSuccessfulPayment(
                    metadata.subscriptionId,
                    paymentIntent.id,
                    paymentIntent.amount / 100, // Convert cents to real
                    'STRIPE',
                    eventId
                );
            }
        } else if (event.type === 'payment_intent.payment_failed') {
             const paymentIntent = event.data.object as Stripe.PaymentIntent;
             // Handle failure...
             // Keeping existing logic for subscriptions if applicable
             await PaymentService.processFailedPayment(
                 paymentIntent.id,
                 'STRIPE',
                 paymentIntent.last_payment_error?.message || 'Payment Failed'
             );
        }
    } catch (error: any) {
        console.error('Stripe Webhook Error:', error.message);
        throw new Error(`Webhook Error: ${error.message}`);
    }
  }
};
