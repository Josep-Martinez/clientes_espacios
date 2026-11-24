import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cancelOccurrence,
  resolveCheckoutPayment,
} from "../src/domain/reservations.ts";

describe("simulated reservations", () => {
  it("confirms immediately after simulated success", () => {
    const result = resolveCheckoutPayment({
      outcome: "success",
      draft: {
        id: "booking-1",
        occurrences: [{ id: "date-1", status: "pending" }],
      },
    });

    assert.equal(result.paymentStatus, "succeeded");
    assert.equal(result.booking.occurrences[0].status, "confirmed");
  });

  it("does not create a confirmed reservation when simulated payment fails", () => {
    const result = resolveCheckoutPayment({
      outcome: "failure",
      draft: {
        id: "booking-2",
        occurrences: [{ id: "date-2", status: "pending" }],
      },
    });

    assert.equal(result.paymentStatus, "failed");
    assert.equal(result.booking, null);
  });

  it("cancels one occurrence without changing other dates in the series", () => {
    const series = {
      id: "series-1",
      occurrences: [
        { id: "date-1", status: "confirmed" },
        { id: "date-2", status: "confirmed" },
        { id: "date-3", status: "confirmed" },
      ],
    };
    const updated = cancelOccurrence(series, "date-2");

    assert.deepEqual(
      updated.occurrences.map((occurrence) => occurrence.status),
      ["confirmed", "cancelled", "confirmed"],
    );
    assert.deepEqual(
      series.occurrences.map((occurrence) => occurrence.status),
      ["confirmed", "confirmed", "confirmed"],
    );
  });
});
