import Stripe from 'stripe';
import { env } from '../env';

// Initialize Stripe with the secret key from environment variables
// Using 'as any' for apiVersion to avoid strict typing issues with the library version if it updates
const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export const StripeService = {
  /**
   * Create a new Customer in Stripe
   * @param email Customer's email
   * @param name Customer's name
   * @param metadata Optional metadata to store with the customer
   */
  createCustomer: async (email: string, name: string, metadata?: Record<string, string>) => {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });
      return customer;
    } catch (error: any) {
      throw new Error(`Error creating Stripe customer: ${error.message}`);
    }
  },

  /**
   * Create a PaymentIntent to charge a card
   * @param amount Amount in cents (e.g., 1000 for $10.00 or R$10,00)
   * @param currency Currency code (e.g., 'brl', 'usd')
   * @param customerId Optional Stripe Customer ID to attach to the payment
   * @param paymentMethodId Optional Payment Method ID (if charging a saved card)
   * @param metadata Optional metadata
   */
  createPaymentIntent: async (
    amount: number,
    currency: string = 'brl',
    customerId?: string,
    paymentMethodId?: string,
    metadata?: Record<string, string>,
    confirm: boolean = false,
    return_url?: string
  ) => {
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
        confirm,
      };

      if (return_url) {
        paymentIntentParams.return_url = return_url;
      }

      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      if (paymentMethodId) {
        paymentIntentParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Error creating Stripe PaymentIntent: ${error.message}`);
    }
  },

  /**
   * Retrieve a PaymentIntent
   * @param paymentIntentId The ID of the PaymentIntent
   */
  retrievePaymentIntent: async (paymentIntentId: string) => {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      throw new Error(`Error retrieving Stripe PaymentIntent: ${error.message}`);
    }
  },

  /**
   * Create a SetupIntent (for saving cards without charging immediately)
   * @param customerId Stripe Customer ID
   */
  createSetupIntent: async (customerId: string) => {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
      return setupIntent;
    } catch (error: any) {
      throw new Error(`Error creating Stripe SetupIntent: ${error.message}`);
    }
  }
};
