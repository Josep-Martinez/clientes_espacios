import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAgendaEvents, getAgendaScope, getCalendarMonthGrid } from '../src/domain/calendar.ts';
import { getNavigationItems } from '../src/domain/navigation.ts';

const booking = (overrides = {}) => ({
  id: 'booking-1',
  clientId: 'client-1',
  clientName: 'Nerea Soler',
  professionalId: 'trainer-1',
  serviceId: 'strength-session',
  spaceId: 'studio-1',
  mode: 'room',
  seats: 1,
  seriesId: null,
  paymentStatus: 'simulated-succeeded',
  occurrences: [
    { id: 'occurrence-1', date: '2026-11-21', start: 600, end: 660, status: 'confirmed', locationId: 'ruzafa' },
    { id: 'occurrence-2', date: '2026-11-28', start: 600, end: 660, status: 'cancelled', locationId: 'ruzafa' },
  ],
  ...overrides,
});

describe('calendar month grid', () => {
  it('builds a Monday-first six-week grid and marks today/current-month days', () => {
    const days = getCalendarMonthGrid(2026, 10, '2026-11-21');

    assert.equal(days.length, 42);
    assert.deepEqual(days[0], { date: '2026-10-26', day: 26, isCurrentMonth: false, isToday: false });
    assert.deepEqual(days[26], { date: '2026-11-21', day: 21, isCurrentMonth: true, isToday: true });
    assert.equal(days.at(-1).date, '2026-12-06');
  });
});

describe('agenda event selection', () => {
  it('returns each reservation occurrence once for a professional and managed space', () => {
    const events = getAgendaEvents([booking()], { professionalId: 'trainer-1', spaceIds: ['studio-1'] });

    assert.deepEqual(events.map(({ bookingId, occurrenceId }) => [bookingId, occurrenceId]), [
      ['booking-1', 'occurrence-1'],
      ['booking-1', 'occurrence-2'],
    ]);
  });

  it('shows only the signed-in client’s reservations or the owned spaces’ reservations', () => {
    const events = getAgendaEvents([
      booking(),
      booking({ id: 'booking-2', clientId: 'client-2', professionalId: 'trainer-2', spaceId: 'studio-2' }),
    ], { clientId: 'client-1' });

    assert.deepEqual(events.map(({ bookingId }) => bookingId), ['booking-1', 'booking-1']);
    assert.deepEqual(
      getAgendaEvents([booking(), booking({ id: 'booking-2', spaceId: 'studio-2' })], { spaceIds: ['studio-2'] }).map(({ bookingId }) => bookingId),
      ['booking-2', 'booking-2'],
    );
  });

  it('combines a professional’s bookings and owned-space bookings for a dual-role account', () => {
    assert.deepEqual(getAgendaScope({
      accountId: 'account-dual',
      roles: ['professional', 'space'],
      professionalId: 'trainer-1',
      spaceIds: ['studio-1'],
    }), {
      clientId: undefined,
      professionalId: 'trainer-1',
      spaceIds: ['studio-1'],
    });
  });
});

describe('role-specific top navigation', () => {
  it('gives a client professional discovery, spaces and their agenda', () => {
    const items = getNavigationItems({ role: 'client' });
    assert.deepEqual(items.map(({ page }) => page), ['explore', 'professionals', 'space-directory', 'agenda', 'how-it-works']);
  });

  it('gives professionals a profile and spaces without a directory of other trainers', () => {
    const items = getNavigationItems({ role: 'professional' });
    assert.deepEqual(items.map(({ page }) => page), ['explore', 'profile', 'space-directory', 'agenda', 'how-it-works']);
    assert.equal(items.some(({ page }) => page === 'professionals'), false);
  });

  it('shows the right spaces and profile combination to a space manager and a dual-role account', () => {
    assert.deepEqual(
      getNavigationItems({ role: 'space' }).map(({ page }) => page),
      ['explore', 'professionals', 'my-space', 'agenda', 'how-it-works'],
    );
    assert.deepEqual(
      getNavigationItems({ role: 'professional', roles: ['professional', 'space'] }).map(({ page }) => page),
      ['explore', 'profile', 'my-space', 'agenda', 'how-it-works'],
    );
  });
});
