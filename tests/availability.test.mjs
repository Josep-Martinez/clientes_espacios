import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkCandidateAvailability,
  filterViableSlots,
} from "../src/domain/availability.ts";

const profile = {
  baseLocationId: "base",
  maxRadiusKm: 6,
  maxTravelMinutes: 35,
  bufferMinutes: 15,
};

const travel = {
  distanceKm: (from, to) => (from === to ? 0 : 4),
  travelMinutes: (from, to) => (from === to ? 0 : 20),
};

const candidate = {
  id: "candidate",
  start: 600,
  end: 660,
  locationId: "studio",
};

describe("professional availability", () => {
  it("rejects overlaps with appointments and blocked intervals", () => {
    const appointment = checkCandidateAvailability({
      candidate,
      profile,
      commitments: [
        { kind: "appointment", start: 630, end: 690, locationId: "other" },
      ],
      travel,
    });
    const block = checkCandidateAvailability({
      candidate,
      profile,
      commitments: [{ kind: "block", start: 590, end: 605 }],
      travel,
    });

    assert.deepEqual(appointment, { available: false, reason: "conflict" });
    assert.deepEqual(block, { available: false, reason: "conflict" });
  });

  it("accepts a location at the configured radius and rejects one beyond it", () => {
    const atLimit = checkCandidateAvailability({
      candidate,
      profile,
      commitments: [],
      travel: { ...travel, distanceKm: () => 6 },
    });
    const outside = checkCandidateAvailability({
      candidate,
      profile,
      commitments: [],
      travel: { ...travel, distanceKm: () => 6.01 },
    });

    assert.equal(atLimit.available, true);
    assert.deepEqual(outside, { available: false, reason: "outside-radius" });
  });

  it("requires enough time after the previous appointment for travel and buffer", () => {
    const onTime = checkCandidateAvailability({
      candidate: { ...candidate, start: 575, end: 635 },
      profile,
      commitments: [
        { kind: "appointment", start: 500, end: 540, locationId: "other" },
      ],
      travel,
    });
    const tooSoon = checkCandidateAvailability({
      candidate: { ...candidate, start: 574, end: 634 },
      profile,
      commitments: [
        { kind: "appointment", start: 500, end: 540, locationId: "other" },
      ],
      travel,
    });

    assert.equal(onTime.available, true);
    assert.deepEqual(tooSoon, { available: false, reason: "travel-before" });
  });

  it("requires enough time before the next appointment for travel and buffer", () => {
    const onTime = checkCandidateAvailability({
      candidate: { ...candidate, start: 600, end: 660 },
      profile,
      commitments: [
        { kind: "appointment", start: 710, end: 750, locationId: "other" },
      ],
      travel,
    });
    const tooLate = checkCandidateAvailability({
      candidate: { ...candidate, start: 601, end: 661 },
      profile,
      commitments: [
        { kind: "appointment", start: 695, end: 735, locationId: "other" },
      ],
      travel,
    });

    assert.equal(onTime.available, true);
    assert.deepEqual(tooLate, { available: false, reason: "travel-after" });
  });

  it("returns only viable candidate slots without private calendar details", () => {
    const slots = filterViableSlots({
      candidates: [
        candidate,
        { ...candidate, id: "busy", start: 625, end: 685 },
      ],
      profile,
      commitments: [
        {
          kind: "appointment",
          start: 620,
          end: 700,
          locationId: "private-place",
        },
      ],
      travel,
    });

    assert.deepEqual(slots, []);
    assert.equal(JSON.stringify(slots).includes("private-place"), false);
  });
});
