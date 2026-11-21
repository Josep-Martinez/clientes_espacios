import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEMO_ACCOUNTS, resolveDemoAccount } from '../src/data/demoAccounts.ts';
import { canSimulateClientPayment, getDemoHomeForAccount } from '../src/domain/demoAuth.ts';

describe('simulated demo accounts', () => {
  it('provides a client, a professional, and a space manager account', () => {
    assert.deepEqual(new Set(DEMO_ACCOUNTS.map((account) => account.role)), new Set(['client', 'professional', 'space']));
  });

  it('resolves only a known demo account', () => {
    assert.equal(resolveDemoAccount('cliente-trama-demo')?.role, 'client');
    assert.equal(resolveDemoAccount('demo-profesional-marina')?.professionalId, 'marina-ortega');
    assert.equal(resolveDemoAccount('gestor-loft-rueda')?.spaceIds.includes('loft-rueda'), true);
    assert.equal(resolveDemoAccount('admin-real'), null);
    assert.equal(resolveDemoAccount(''), null);
  });

  it('routes each account to its own dashboard and defaults to public browsing', () => {
    const client = resolveDemoAccount('cliente-trama-demo');
    const professional = resolveDemoAccount('demo-profesional-marina');
    const manager = resolveDemoAccount('gestor-loft-rueda');

    assert.equal(getDemoHomeForAccount(client), 'client');
    assert.equal(getDemoHomeForAccount(professional), 'professional');
    assert.equal(getDemoHomeForAccount(manager), 'space');
    assert.equal(getDemoHomeForAccount(null), 'guest');
  });

  it('requires a client account before allowing a simulated payment', () => {
    assert.equal(canSimulateClientPayment(null), false);
    assert.equal(canSimulateClientPayment(resolveDemoAccount('demo-profesional-marina')), false);
    assert.equal(canSimulateClientPayment(resolveDemoAccount('gestor-loft-rueda')), false);
    assert.equal(canSimulateClientPayment(resolveDemoAccount('cliente-trama-demo')), true);
  });
});
