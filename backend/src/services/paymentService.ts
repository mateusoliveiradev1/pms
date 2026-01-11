import { PrismaClient } from '@prisma/client';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Gateways
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-ACCESS-TOKEN';
const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
const paymentClient = new Payment(mpClient);

// Prevent Stripe from crashing app if key is missing (dev mode)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia' as any, // Use latest or matching version - cast to any to avoid strict version mismatch in dev
});

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
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        publicKey: process.env.STRIPE_PUBLIC_KEY
      };
    } catch (error: any) {
        await prisma.supplierSubscription.delete({ where: { id: subscription.id } });
        console.error('Stripe Error:', error);
        throw new Error('Erro ao criar pagamento Stripe: ' + error.message);
    }
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
                  details: JSON.stringify({
                      amount: amountPaid,
                      gateway,
                      externalId,
                      eventId,
                      plan: subscription.plan.name
                  })
              }
          });
      });
      
      console.log(`Subscription ${subscriptionId} activated successfully. Event: ${eventId}`);

    } catch (error: any) {
      if (error.code === 'P2002') {
        console.warn(`Event ${eventId} already processed. Idempotency triggered.`);
        return; // Silent success
      }
      throw error; // Rethrow other errors
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
    });
  },

  /**
   * Handle Mercado Pago Webhook
   */
  handleMercadoPagoWebhook: async (id: string, topic: string) => {
    if (topic !== 'payment') return;

    try {
        const payment = await paymentClient.get({ id });
        const subscriptionId = payment.external_reference;
        
        // Use payment.id as eventId for idempotency (MP notification ID is the payment ID for topic=payment)
        // Actually, the webhook notification has an ID, but we receive payment ID in 'id' query param.
        // We will use `mp_payment_${id}` as the unique event key.
        const eventId = `mp_payment_${id}`;

        if (payment.status === 'approved' && subscriptionId) {
            await PaymentService.processSuccessfulPayment(
                subscriptionId,
                payment.id!.toString(),
                payment.transaction_amount!,
                'MERCADO_PAGO',
                eventId
            );
        } else if ((payment.status === 'rejected' || payment.status === 'cancelled') && payment.id) {
            await PaymentService.processFailedPayment(
                payment.id!.toString(),
                'MERCADO_PAGO',
                payment.status_detail || 'Payment Rejected'
            );
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
            const subscriptionId = paymentIntent.metadata.subscriptionId;
            
            if (subscriptionId) {
                await PaymentService.processSuccessfulPayment(
                    subscriptionId,
                    paymentIntent.id,
                    paymentIntent.amount / 100, // Convert cents to real
                    'STRIPE',
                    eventId
                );
            }
        } else if (event.type === 'payment_intent.payment_failed') {
             const paymentIntent = event.data.object as Stripe.PaymentIntent;
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
