import type { Priority } from "@prisma/client";
import {
  addBusinessHours,
  remainingBusinessMinutes,
  type BusinessCalendarConfig,
} from "./businessCalendar.js";
import { getSLAPolicy, SLA_AT_RISK_THRESHOLD } from "./slaPolicy.js";

export type SLAState = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface SLATargetInput {
  createdAt: Date;
  priority: Priority;
  /** When the tracked event (first response / resolution) actually happened, if it has. */
  completedAt: Date | null;
  /** Evaluation instant — "now" for a live ticket. */
  now: Date;
  targetHours: number;
  config: BusinessCalendarConfig;
}

export interface SLATargetResult {
  dueAt: Date;
  state: SLAState;
  remainingMinutes: number;
}

/**
 * Computes a single SLA target's (due date, state, remaining minutes).
 *
 * Freeze rule: once `completedAt` is set, the evaluation instant is pinned to
 * `completedAt` forever — the state and remaining-minutes value are frozen at
 * whatever they were the moment the event happened, and can never change
 * again (in particular, never later flips to BREACHED).
 */
export function computeSLATarget(input: SLATargetInput): SLATargetResult {
  const { createdAt, completedAt, now, targetHours, config } = input;

  const dueAt = addBusinessHours(createdAt, targetHours, config);
  const evaluationInstant = completedAt ?? now;

  const remainingMinutes = remainingBusinessMinutes(
    evaluationInstant,
    dueAt,
    config
  );

  const state = classifySLAState({
    createdAt,
    dueAt,
    evaluationInstant,
    config,
  });

  return { dueAt, state, remainingMinutes };
}

function classifySLAState(args: {
  createdAt: Date;
  dueAt: Date;
  evaluationInstant: Date;
  config: BusinessCalendarConfig;
}): SLAState {
  const { createdAt, dueAt, evaluationInstant, config } = args;

  if (evaluationInstant.getTime() >= dueAt.getTime()) {
    return "BREACHED";
  }

  const totalBudget = remainingBusinessMinutes(createdAt, dueAt, config); // total business minutes allotted
  if (totalBudget <= 0) {
    // Zero-length SLA window (edge case / misconfiguration guard).
    return "BREACHED";
  }

  const consumedMinutes = remainingBusinessMinutes(
    createdAt,
    evaluationInstant,
    config
  );
  const fractionConsumed = consumedMinutes / totalBudget;

  return fractionConsumed >= SLA_AT_RISK_THRESHOLD ? "AT_RISK" : "ON_TRACK";
}

export interface TicketSLAInfo {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstResponseState: SLAState;
  resolutionState: SLAState;
  firstResponseRemainingMinutes: number;
  resolutionRemainingMinutes: number;
}

export interface TicketForSLA {
  createdAt: Date;
  priority: Priority;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
}

export function computeTicketSLAInfo(
  ticket: TicketForSLA,
  now: Date,
  config: BusinessCalendarConfig
): TicketSLAInfo {
  const policy = getSLAPolicy(ticket.priority);

  const firstResponse = computeSLATarget({
    createdAt: ticket.createdAt,
    priority: ticket.priority,
    completedAt: ticket.firstResponseAt,
    now,
    targetHours: policy.firstResponseHours,
    config,
  });

  const resolution = computeSLATarget({
    createdAt: ticket.createdAt,
    priority: ticket.priority,
    completedAt: ticket.resolvedAt,
    now,
    targetHours: policy.resolutionHours,
    config,
  });

  return {
    firstResponseDueAt: firstResponse.dueAt,
    resolutionDueAt: resolution.dueAt,
    firstResponseState: firstResponse.state,
    resolutionState: resolution.state,
    firstResponseRemainingMinutes: firstResponse.remainingMinutes,
    resolutionRemainingMinutes: resolution.remainingMinutes,
  };
}
