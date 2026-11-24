import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCheckout } from "../src/domain/pricing.ts";
import { hasConfirmedGymVisit } from "../src/domain/reservations.ts";

const demoFees = { serviceCommissionPercent: 10, spaceCommissionPercent: 12 };

describe("demo checkout pricing", () => {
  it("shows service, both commissions and room fee as separate lines", () => {
    const quote = calculateCheckout({
      servicePriceCents: 8000,
      occurrenceCount: 2,
      seats: 1,
      spacePricePerOccurrenceCents: 2000,
      freeSpaceOccurrences: 0,
      fees: demoFees,
    });

    assert.deepEqual(quote, {
      X: 16000,
      Z: 1600,
      Y: 4000,
      W: 480,
      total: 22080,
    });
  });

  it("omits room charges from the total when no space is used", () => {
    const quote = calculateCheckout({
      servicePriceCents: 3000,
      occurrenceCount: 1,
      seats: 1,
      spacePricePerOccurrenceCents: 0,
      freeSpaceOccurrences: 0,
      fees: demoFees,
    });

    assert.deepEqual(quote, { X: 3000, Z: 300, Y: 0, W: 0, total: 3300 });
  });

  it("makes only the first gym access free while keeping the professional service charge", () => {
    const quote = calculateCheckout({
      servicePriceCents: 8000,
      occurrenceCount: 1,
      seats: 1,
      spacePricePerOccurrenceCents: 1500,
      freeSpaceOccurrences: 1,
      fees: demoFees,
    });

    assert.deepEqual(quote, { X: 8000, Z: 800, Y: 0, W: 0, total: 8800 });
  });

  it("applies new-customer status only to a confirmed visit at the same gym", () => {
    const previousBookings = [
      {
        id: "cancelled",
        clientId: "client-a",
        clientName: "Demo",
        professionalId: "trainer",
        serviceId: "gym-session",
        spaceId: "gym-a",
        mode: "gym",
        seats: 1,
        seriesId: null,
        paymentStatus: "simulated-succeeded",
        occurrences: [
          {
            id: "old",
            date: "2026-01-01",
            start: 0,
            end: 60,
            status: "cancelled",
            locationId: "gym-a",
          },
        ],
      },
      {
        id: "another-gym",
        clientId: "client-a",
        clientName: "Demo",
        professionalId: "trainer",
        serviceId: "gym-session",
        spaceId: "gym-b",
        mode: "gym",
        seats: 1,
        seriesId: null,
        paymentStatus: "simulated-succeeded",
        occurrences: [
          {
            id: "other",
            date: "2026-01-01",
            start: 0,
            end: 60,
            status: "confirmed",
            locationId: "gym-b",
          },
        ],
      },
    ];

    assert.equal(
      hasConfirmedGymVisit(previousBookings, "client-a", "gym-a"),
      false,
    );
    assert.equal(
      hasConfirmedGymVisit(previousBookings, "client-a", "gym-b"),
      true,
    );
    assert.equal(
      hasConfirmedGymVisit(previousBookings, "client-b", "gym-b"),
      false,
    );
  });
});
