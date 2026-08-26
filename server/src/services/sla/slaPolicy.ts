import type { Priority } from "@prisma/client";

export interface SLAPolicy {
  firstResponseHours: number;
  resolutionHours: number;
}

/**
 * Exact SLA policy table from the specification. Values are in *business
 * hours* — never wall-clock hours.
 */
export const SLA_POLICIES: Record<Priority, SLAPolicy> = {
  URGENT: { firstResponseHours: 1, resolutionHours: 4 },
  HIGH: { firstResponseHours: 4, resolutionHours: 24 },
  MEDIUM: { firstResponseHours: 8, resolutionHours: 48 },
  LOW: { firstResponseHours: 24, resolutionHours: 72 },
};

export function getSLAPolicy(priority: Priority): SLAPolicy {
  const policy = SLA_POLICIES[priority];
  if (!policy) {
    throw new Error(`No SLA policy configured for priority "${priority}".`);
  }
  return policy;
}

/** Thresholds for SLA state classification, as a fraction of total SLA time consumed. */
export const SLA_AT_RISK_THRESHOLD = 0.75; // 75% consumed -> AT_RISK
// >= 100% consumed (deadline passed) -> BREACHED
