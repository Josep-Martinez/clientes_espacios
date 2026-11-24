import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateSpaceMetrics } from "../src/domain/spaceMetrics.ts";

const space = {
  id: "room-a",
  name: "Sala A",
  kind: "room",
  locationId: "ruzafa",
  zoneLabel: "Ruzafa",
  capacity: 8,
  equipment: [],
  pricePerOccurrenceCents: 3000,
  openingHours: { weekdays: [6, 0, 1], start: 480, end: 600 },
  accessInstructions: "Ficticio",
  description: "Sala demo",
  amenities: [],
};

describe("space owner metrics", () => {
  it("counts confirmed time and earnings only for managed spaces in the selected period", () => {
    const metrics = calculateSpaceMetrics({
      spaces: [space],
      bookings: [
        {
          spaceId: "room-a",
          occurrences: [
            {
              date: "2026-11-21",
              start: 540,
              end: 600,
              status: "confirmed",
              spaceAmountCents: 2400,
            },
          ],
        },
        {
          spaceId: "room-a",
          occurrences: [
            {
              date: "2026-11-21",
              start: 540,
              end: 600,
              status: "confirmed",
              spaceAmountCents: 2400,
            },
          ],
        },
        {
          spaceId: "room-a",
          occurrences: [
            { date: "2026-11-22", start: 510, end: 540, status: "confirmed" },
          ],
        },
        {
          spaceId: "room-a",
          occurrences: [
            {
              date: "2026-11-23",
              start: 540,
              end: 600,
              status: "cancelled",
              spaceAmountCents: 2400,
            },
          ],
        },
        {
          spaceId: "other-room",
          occurrences: [
            {
              date: "2026-11-21",
              start: 540,
              end: 600,
              status: "confirmed",
              spaceAmountCents: 2400,
            },
          ],
        },
        {
          spaceId: "room-a",
          occurrences: [
            {
              date: "2026-11-25",
              start: 540,
              end: 600,
              status: "confirmed",
              spaceAmountCents: 2400,
            },
          ],
        },
      ],
      startDate: "2026-11-21",
      endDateExclusive: "2026-11-24",
      spaceCommissionPercent: 12,
    });

    assert.equal(metrics.confirmedOccurrences, 3);
    assert.equal(metrics.bookedMinutes, 90);
    assert.equal(metrics.openMinutes, 360);
    assert.equal(metrics.utilizationPercent, 25);
    assert.equal(metrics.grossEarningsCents, 7800);
    assert.equal(metrics.platformCommissionCents, 936);
    assert.equal(metrics.estimatedOwnerEarningsCents, 6864);
  });

  it("returns zero utilization and revenue when the space has no opening time", () => {
    const metrics = calculateSpaceMetrics({
      spaces: [{ ...space, openingHours: { weekdays: [], start: 0, end: 0 } }],
      bookings: [],
      startDate: "2026-11-21",
      endDateExclusive: "2026-11-28",
      spaceCommissionPercent: 12,
    });

    assert.equal(metrics.utilizationPercent, 0);
    assert.equal(metrics.estimatedOwnerEarningsCents, 0);
  });

  it("rejects invalid date ranges and commission rates", () => {
    assert.throws(
      () =>
        calculateSpaceMetrics({
          spaces: [space],
          bookings: [],
          startDate: "2026-11-24",
          endDateExclusive: "2026-11-21",
          spaceCommissionPercent: 12,
        }),
      RangeError,
    );
    assert.throws(
      () =>
        calculateSpaceMetrics({
          spaces: [space],
          bookings: [],
          startDate: "2026-11-21",
          endDateExclusive: "2026-11-24",
          spaceCommissionPercent: 120,
        }),
      RangeError,
    );
  });
});
