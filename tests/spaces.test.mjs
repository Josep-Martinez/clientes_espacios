import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findCompatibleSpaces } from '../src/domain/spaces.ts';

const spaces = [
  {
    id: 'sala-compatible',
    name: 'Sala compatible',
    locationId: 'ruzafa',
    capacity: 4,
    equipment: ['camilla', 'bandas'],
    openIntervals: [{ date: '2026-12-02', start: 600, end: 720 }],
  },
  {
    id: 'sala-sin-equipo',
    name: 'Sala sin equipo',
    locationId: 'ruzafa',
    capacity: 4,
    equipment: ['bandas'],
    openIntervals: [{ date: '2026-12-02', start: 600, end: 720 }],
  },
  {
    id: 'sala-lejana',
    name: 'Sala lejana',
    locationId: 'cabanyal',
    capacity: 4,
    equipment: ['camilla', 'bandas'],
    openIntervals: [{ date: '2026-12-02', start: 600, end: 720 }],
  },
  {
    id: 'sala-pequena',
    name: 'Sala pequeña',
    locationId: 'ruzafa',
    capacity: 2,
    equipment: ['camilla', 'bandas'],
    openIntervals: [{ date: '2026-12-02', start: 600, end: 720 }],
  },
];

const request = {
  date: '2026-12-02',
  start: 630,
  end: 690,
  requiredEquipment: ['camilla'],
  requestedCapacity: 3,
  professionalBaseLocationId: 'ruzafa',
  professionalMaxRadiusKm: 5,
  preferredAreaLocationId: 'ruzafa',
  maxClientDistanceKm: 5,
};

const travel = {
  distanceKm: (from, to) => {
    if (from === to) return 0;
    return from === 'ruzafa' && to === 'cabanyal' ? 7 : 3;
  },
};

describe('space compatibility', () => {
  it('keeps only open rooms with required equipment, capacity and acceptable distance', () => {
    const result = findCompatibleSpaces({ spaces, request, reservations: [], travel });

    assert.deepEqual(result.map((space) => space.id), ['sala-compatible']);
  });

  it('rejects a room reserved for an overlapping time', () => {
    const result = findCompatibleSpaces({
      spaces,
      request,
      reservations: [{ spaceId: 'sala-compatible', date: request.date, start: 650, end: 700, status: 'confirmed' }],
      travel,
    });

    assert.deepEqual(result, []);
  });

  it('never returns private access instructions with public space options', () => {
    const result = findCompatibleSpaces({
      spaces: [{ ...spaces[0], accessInstructions: 'private demo door code' }],
      request,
      reservations: [],
      travel,
    });

    assert.equal(Object.hasOwn(result[0], 'accessInstructions'), false);
  });
});
