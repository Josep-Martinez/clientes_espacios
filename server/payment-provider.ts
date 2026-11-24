export type FakePaymentOutcome = 'success' | 'failure' | 'expired';

export interface PaymentProvider {
  readonly name: 'fake' | 'stripe';
  startAttempt(input: {
    checkoutId: string;
    amountCents: number;
    currency: 'EUR';
    idempotencyKey: string;
  }): Promise<{ providerReference: string; amountCents: number; currency: 'EUR' }>;
  processResult(input: {
    checkoutId: string;
    providerReference: string;
    providerEventId: string;
    outcome: FakePaymentOutcome;
  }): Promise<{ outcome: FakePaymentOutcome }>;
}

/** Contract boundary for a later Stripe Checkout adapter. No card data enters BookFit. */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake' as const;

  async startAttempt(input: {
    checkoutId: string;
    amountCents: number;
    currency: 'EUR';
    idempotencyKey: string;
  }): Promise<{ providerReference: string; amountCents: number; currency: 'EUR' }> {
    if (!Number.isInteger(input.amountCents) || input.amountCents < 0 || input.currency !== 'EUR') {
      throw new TypeError('Invalid fake payment amount.');
    }
    return {
      providerReference: `fake:${input.checkoutId}:${input.idempotencyKey}`,
      amountCents: input.amountCents,
      currency: input.currency,
    };
  }

  async processResult(input: {
    checkoutId: string;
    providerReference: string;
    providerEventId: string;
    outcome: FakePaymentOutcome;
  }): Promise<{ outcome: FakePaymentOutcome }> {
    if (!input.checkoutId || !input.providerReference || !input.providerEventId) {
      throw new TypeError('Invalid fake payment event.');
    }
    return { outcome: input.outcome };
  }
}
