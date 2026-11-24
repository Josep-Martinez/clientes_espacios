import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReserveSeats,
  countConfirmedSeats,
  joinWaitlist,
} from "../src/domain/capacity.ts";

describe("group class capacity and waitlist", () => {
  it("allows a booking up to the remaining capacity and rejects overselling", () => {
    assert.equal(
      canReserveSeats({ capacity: 8, confirmedSeats: 5, requestedSeats: 3 }),
      true,
    );
    assert.equal(
      canReserveSeats({ capacity: 8, confirmedSeats: 5, requestedSeats: 4 }),
      false,
    );
  });

  it("adds a full-class request to a waitlist without charging or holding a seat", () => {
    const result = joinWaitlist(
      [],
      { id: "wait-1", clientId: "demo-client", sessionId: "pilates-1" },
      { capacity: 8, confirmedSeats: 8 },
    );

    assert.ok(result);
    assert.equal(result.entry.status, "waitlisted");
    assert.equal(result.entry.chargeCents, 0);
    assert.equal(result.entry.occupiesSeat, false);
    assert.equal(result.remainingSeats, 0);
  });

  it("does not join the waitlist while seats remain", () => {
    const result = joinWaitlist(
      [],
      { id: "wait-2", clientId: "demo-client", sessionId: "pilates-2" },
      { capacity: 8, confirmedSeats: 7 },
    );

    assert.equal(result, null);
  });

  it("counts only confirmed attendees for the selected class date", () => {
    const confirmedSeats = countConfirmedSeats("pilates-2", [
      {
        seats: 3,
        occurrences: [{ sessionId: "pilates-2", status: "confirmed" }],
      },
      {
        seats: 4,
        occurrences: [{ sessionId: "pilates-2", status: "cancelled" }],
      },
      {
        seats: 2,
        occurrences: [{ sessionId: "pilates-3", status: "confirmed" }],
      },
    ]);

    assert.equal(confirmedSeats, 3);
  });
});
