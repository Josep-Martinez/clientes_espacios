import type { DemoAccount } from '../data/demoAccounts.ts';
import { hasDemoRole } from '../data/demoAccounts.ts';

export type DemoHome = 'guest' | 'client' | 'professional' | 'space';

/** Chooses which local demo surface to render; this is not an authentication boundary. */
export function getDemoHomeForAccount(account: DemoAccount | null): DemoHome {
  return account?.role ?? 'guest';
}

export function canSimulateClientPayment(account: DemoAccount | null): boolean {
  return hasDemoRole(account, 'client');
}
