import { describe, it, expect } from "vitest";
import { assertValidTransition, isValidTransition } from "../../src/services/ticket/ticketLifecycle.js";

describe("ticket lifecycle transitions", () => {
  it("allows OPEN -> IN_PROGRESS", () => {
    expect(isValidTransition("OPEN", "IN_PROGRESS")).toBe(true);
  });

  it("allows IN_PROGRESS -> RESOLVED", () => {
    expect(isValidTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
  });

  it("allows RESOLVED -> CLOSED", () => {
    expect(isValidTransition("RESOLVED", "CLOSED")).toBe(true);
  });

  it("rejects OPEN -> CLOSED (skipping stages)", () => {
    expect(isValidTransition("OPEN", "CLOSED")).toBe(false);
    expect(() => assertValidTransition("OPEN", "CLOSED")).toThrow();
  });

  it("rejects CLOSED -> IN_PROGRESS (moving backwards)", () => {
    expect(isValidTransition("CLOSED", "IN_PROGRESS")).toBe(false);
  });

  it("rejects RESOLVED -> OPEN (moving backwards)", () => {
    expect(isValidTransition("RESOLVED", "OPEN")).toBe(false);
  });

  it("rejects a no-op transition to the same status", () => {
    expect(isValidTransition("OPEN", "OPEN")).toBe(false);
  });

  it("rejects any transition out of CLOSED (terminal state)", () => {
    expect(isValidTransition("CLOSED", "OPEN")).toBe(false);
    expect(isValidTransition("CLOSED", "RESOLVED")).toBe(false);
  });
});
