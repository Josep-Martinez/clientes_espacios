export interface DemoFeeRates {
  serviceCommissionPercent: number;
  spaceCommissionPercent: number;
}

export interface CheckoutPricingInput {
  servicePriceCents: number;
  occurrenceCount: number;
  seats: number;
  spacePricePerOccurrenceCents: number;
  freeSpaceOccurrences: number;
  fees: DemoFeeRates;
}

export interface CheckoutQuote {
  X: number;
  Z: number;
  Y: number;
  W: number;
  total: number;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

function commission(
  subtotalCents: number,
  percent: number,
  label: string,
): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`${label} must be between 0 and 100`);
  }
  return Math.round((subtotalCents * percent) / 100);
}

export function calculateCheckout(input: CheckoutPricingInput): CheckoutQuote {
  assertNonNegativeInteger(input.servicePriceCents, "servicePriceCents");
  assertNonNegativeInteger(input.occurrenceCount, "occurrenceCount");
  assertNonNegativeInteger(input.seats, "seats");
  assertNonNegativeInteger(
    input.spacePricePerOccurrenceCents,
    "spacePricePerOccurrenceCents",
  );
  assertNonNegativeInteger(input.freeSpaceOccurrences, "freeSpaceOccurrences");

  const X = input.servicePriceCents * input.occurrenceCount * input.seats;
  const chargedSpaceOccurrences = Math.max(
    0,
    input.occurrenceCount - input.freeSpaceOccurrences,
  );
  const Y = input.spacePricePerOccurrenceCents * chargedSpaceOccurrences;
  const Z = commission(
    X,
    input.fees.serviceCommissionPercent,
    "serviceCommissionPercent",
  );
  const W = commission(
    Y,
    input.fees.spaceCommissionPercent,
    "spaceCommissionPercent",
  );

  return { X, Z, Y, W, total: X + Z + Y + W };
}
