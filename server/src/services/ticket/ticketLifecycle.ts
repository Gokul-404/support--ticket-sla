import type { TicketStatus } from "@prisma/client";
import { Errors } from "../../utils/errors.js";

/**
 * Allowed forward transitions:
 *   OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
 *
 * No skipping stages and no moving backwards. Documented in
 * docs/EDGE_CASES.md and README.md.
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, ReadonlySet<TicketStatus>> = {
  OPEN: new Set<TicketStatus>(["IN_PROGRESS"]),
  IN_PROGRESS: new Set<TicketStatus>(["RESOLVED"]),
  RESOLVED: new Set<TicketStatus>(["CLOSED"]),
  CLOSED: new Set<TicketStatus>([]),
};

function allowedNextStates(from: TicketStatus): ReadonlySet<TicketStatus> {
  return ALLOWED_TRANSITIONS[from] ?? new Set<TicketStatus>();
}

export function assertValidTransition(from: TicketStatus, to: TicketStatus): void {
  if (from === to) {
    throw Errors.invalidStatusTransition(from, to);
  }
  if (!allowedNextStates(from).has(to)) {
    throw Errors.invalidStatusTransition(from, to);
  }
}

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from !== to && allowedNextStates(from).has(to);
}
