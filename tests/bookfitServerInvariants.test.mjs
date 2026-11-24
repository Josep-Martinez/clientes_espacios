import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertBookableDate,
  createLocalInterval,
  isDateKey,
  madridLocalInstant,
} from "../server/availability.ts";

describe("BookFit local date and time invariants", () => {
  it("rejects calendar dates that PostgreSQL would otherwise reject later", () => {
    assert.equal(isDateKey("2026-02-28"), true);
    assert.equal(isDateKey("2026-02-30"), false);
    assert.equal(isDateKey("not-a-date"), false);
  });

  it("accepts tomorrow through the 90-day limit and rejects dates outside the booking window", () => {
    const now = new Date("2026-11-24T12:00:00.000Z");
    assert.doesNotThrow(() => assertBookableDate("2026-11-25", now));
    assert.doesNotThrow(() => assertBookableDate("2027-02-22", now));
    assert.throws(
      () => assertBookableDate("2026-11-24", now),
      (error) => error.code === "date_out_of_range",
    );
    assert.throws(
      () => assertBookableDate("2027-02-23", now),
      (error) => error.code === "date_out_of_range",
    );
    assert.throws(
      () => assertBookableDate("2026-02-30", now),
      (error) => error.code === "invalid_date",
    );
  });

  it("rejects nonexistent and ambiguous Europe/Madrid wall times", () => {
    assert.throws(
      () => madridLocalInstant("2026-03-29", 150),
      (error) => error.code === "nonexistent_local_time",
    );
    assert.throws(
      () => madridLocalInstant("2026-10-25", 150),
      (error) => error.code === "ambiguous_local_time",
    );
  });

  it("converts a real Madrid time and carries an interval ending at midnight to the next date", () => {
    const interval = createLocalInterval("2026-11-24", 1380, 60);
    assert.equal(interval.startsAt.toISOString(), "2026-11-24T22:00:00.000Z");
    assert.equal(interval.endsAt.toISOString(), "2026-11-24T23:00:00.000Z");
    assert.equal(interval.endMinute, 1440);
    assert.throws(
      () => createLocalInterval("2026-02-30", 600, 60),
      (error) => error.code === "invalid_interval",
    );
  });
});
