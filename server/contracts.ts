export type ActorRole = 'client' | 'professional' | 'space_manager';
export type BookingMode = 'room' | 'gym' | 'home' | 'online';

export interface ActorContext {
  actorId: string;
  name: string;
  roles: ActorRole[];
  professionalId: string | null;
  spaceIds: string[];
}

export interface CheckoutLine {
  occurrenceId: string;
  kind: 'service' | 'service_commission' | 'space' | 'space_commission';
  description: string;
  amountCents: number;
}

export interface CheckoutResult {
  checkoutId: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  holdExpiresAt: string | null;
  totalCents: number;
  lines: CheckoutLine[];
  occurrences: Array<{ id: string; date: string; start: string; end: string }>;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
