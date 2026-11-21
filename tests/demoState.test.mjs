import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDemoState } from '../src/state/demoState.ts';

describe('demo state migrations', () => {
  it('loads older saved state without conversations as an empty conversation list', () => {
    const legacyState = {
      bookings: [],
      waitlist: [],
      preferencesByProfessional: {},
    };

    assert.deepEqual(parseDemoState(JSON.stringify(legacyState)).conversations, []);
  });

  it('ignores malformed conversation entries without discarding saved bookings', () => {
    const legacyBooking = {
      id: 'booking-1',
      clientId: 'client-1',
      clientName: 'Nerea',
      professionalId: 'pro-1',
      serviceId: 'service-1',
      spaceId: null,
      mode: 'online',
      seats: 1,
      seriesId: null,
      paymentStatus: 'simulated-succeeded',
      occurrences: [{ id: 'date-1', date: '2026-11-21', start: 600, end: 660, status: 'confirmed', locationId: 'online' }],
    };
    const parsed = parseDemoState(JSON.stringify({
      bookings: [legacyBooking],
      waitlist: [],
      preferencesByProfessional: {},
      conversations: [{ id: 'broken' }],
    }));

    assert.equal(parsed.bookings[0].id, 'booking-1');
    assert.deepEqual(parsed.conversations, []);
  });

  it('migrates legacy first-gym entries as complimentary for space earnings', () => {
    const legacyGymBooking = {
      id: 'gym-booking-1',
      clientId: 'client-1',
      clientName: 'Nerea',
      professionalId: 'pro-1',
      serviceId: 'service-1',
      spaceId: 'senda-gym',
      mode: 'gym',
      seats: 1,
      seriesId: null,
      paymentStatus: 'simulated-succeeded',
      occurrences: [{ id: 'date-1', date: '2026-11-21', start: 600, end: 660, status: 'confirmed', locationId: 'ruzafa' }],
    };
    const parsed = parseDemoState(JSON.stringify({
      bookings: [legacyGymBooking],
      waitlist: [],
      preferencesByProfessional: {},
    }));

    assert.equal(parsed.bookings[0].occurrences[0].spaceAmountCents, 0);
  });
});
