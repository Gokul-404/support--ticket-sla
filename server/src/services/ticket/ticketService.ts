import type { PrismaClient, Priority, Ticket, TicketStatus, User } from "@prisma/client";
import { TicketRepository } from "../../repositories/ticketRepository.js";
import { Errors } from "../../utils/errors.js";
import { assertValidTransition } from "./ticketLifecycle.js";
import { buildBusinessCalendarConfig } from "../holiday/holidayService.js";
import { computeTicketSLAInfo, type SLAState } from "../sla/slaService.js";

type CurrentUser = Pick<User, "id" | "role" | "email" | "name">;

export class TicketService {
  private readonly repo: TicketRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new TicketRepository(prisma);
  }

  private requireAuth(user: CurrentUser | null): CurrentUser {
    if (!user) throw Errors.unauthorized();
    return user;
  }

  /** Enforces REPORTER-can-only-view-own-tickets rule. Throws if forbidden. */
  private assertCanView(ticket: Ticket, user: CurrentUser) {
    if (user.role === "AGENT") return;
    if (ticket.reporterId !== user.id) throw Errors.forbidden("You can only view your own tickets.");
  }

  private assertCanComment(ticket: Ticket, user: CurrentUser) {
    if (user.role === "AGENT") return;
    if (ticket.reporterId !== user.id) {
      throw Errors.forbidden("You can only comment on your own tickets.");
    }
  }

  async getTicketById(id: string, user: CurrentUser | null): Promise<Ticket> {
    this.requireAuth(user);
    const ticket = await this.repo.findById(id);
    if (!ticket) throw Errors.ticketNotFound(id);
    this.assertCanView(ticket, user!);
    return ticket;
  }

  async listTickets(args: {
    user: CurrentUser | null;
    status?: TicketStatus;
    priority?: Priority;
    assigneeId?: string;
    slaState?: SLAState;
    take: number;
    cursor?: string | null;
  }) {
    const user = this.requireAuth(args.user);

    const filters = {
      status: args.status,
      priority: args.priority,
      assigneeId: args.assigneeId,
      // REPORTERs are hard-scoped to their own tickets server-side.
      reporterId: user.role === "REPORTER" ? user.id : undefined,
    };

    if (!args.slaState) {
      const { nodes, hasNextPage } = await this.repo.findMany({
        filters,
        take: args.take,
        cursor: args.cursor,
      });
      return { nodes, hasNextPage };
    }

    // SLA state is derived, not stored — filter in application code.
    // Note: for very large datasets this should be pushed into a materialized
    // column/index; documented as a known limitation.
    const config = await buildBusinessCalendarConfig(this.prisma);
    const now = new Date();
    const { nodes: candidateNodes, hasNextPage } = await this.repo.findMany({
      filters,
      take: args.take,
      cursor: args.cursor,
    });

    const filtered = candidateNodes.filter((t: Ticket) => {
      const info = computeTicketSLAInfo(t, now, config);
      const relevantState =
        t.resolvedAt || t.status === "CLOSED" ? info.resolutionState : info.resolutionState;
      return relevantState === args.slaState;
    });

    return { nodes: filtered, hasNextPage };
  }

  async createTicket(args: {
    user: CurrentUser | null;
    title: string;
    description: string;
    priority: Priority;
  }) {
    const user = this.requireAuth(args.user);
    if (user.role !== "REPORTER") {
      throw Errors.forbidden("Only reporters can create tickets.");
    }
    return this.repo.create({
      title: args.title,
      description: args.description,
      priority: args.priority,
      reporterId: user.id,
    });
  }

  async assignTicket(args: {
    user: CurrentUser | null;
    ticketId: string;
    assigneeId: string;
  }) {
    const user = this.requireAuth(args.user);
    if (user.role !== "AGENT") throw Errors.forbidden("Only agents can assign tickets.");

    const ticket = await this.repo.findById(args.ticketId);
    if (!ticket) throw Errors.ticketNotFound(args.ticketId);

    const assignee = await this.prisma.user.findUnique({ where: { id: args.assigneeId } });
    if (!assignee) throw Errors.userNotFound(args.assigneeId);
    if (assignee.role !== "AGENT") {
      throw Errors.validation("Tickets can only be assigned to agents.");
    }

    return this.repo.update(ticket.id, { assigneeId: assignee.id });
  }

  async changeTicketStatus(args: {
    user: CurrentUser | null;
    ticketId: string;
    status: TicketStatus;
  }) {
    const user = this.requireAuth(args.user);
    if (user.role !== "AGENT") throw Errors.forbidden("Only agents can change ticket status.");

    const ticket = await this.repo.findById(args.ticketId);
    if (!ticket) throw Errors.ticketNotFound(args.ticketId);

    assertValidTransition(ticket.status, args.status);

    const data: Record<string, unknown> = { status: args.status };
    if (args.status === "RESOLVED" && !ticket.resolvedAt) {
      data.resolvedAt = new Date();
    }

    return this.repo.update(ticket.id, data);
  }

  async resolveTicket(args: { user: CurrentUser | null; ticketId: string }) {
    const user = this.requireAuth(args.user);
    if (user.role !== "AGENT") throw Errors.forbidden("Only agents can resolve tickets.");

    const ticket = await this.repo.findById(args.ticketId);
    if (!ticket) throw Errors.ticketNotFound(args.ticketId);

    assertValidTransition(ticket.status, "RESOLVED");

    return this.repo.update(ticket.id, {
      status: "RESOLVED",
      resolvedAt: ticket.resolvedAt ?? new Date(),
    });
  }

  /**
   * Adds a comment. Implements the first-response rule:
   *   - Reporter comments never count toward first response.
   *   - The first comment by anyone OTHER than the reporter sets
   *     `firstResponseAt`, and it is never overwritten thereafter.
   */
  async addComment(args: { user: CurrentUser | null; ticketId: string; content: string }) {
    const user = this.requireAuth(args.user);
    const ticket = await this.repo.findById(args.ticketId);
    if (!ticket) throw Errors.ticketNotFound(args.ticketId);

    this.assertCanComment(ticket, user);

    const comment = await this.prisma.comment.create({
      data: { ticketId: ticket.id, authorId: user.id, content: args.content },
      include: { author: true },
    });

    const isReporterComment = user.id === ticket.reporterId;
    if (!isReporterComment && !ticket.firstResponseAt) {
      await this.repo.update(ticket.id, { firstResponseAt: comment.createdAt });
    }

    return comment;
  }

  async getDashboard(user: CurrentUser | null) {
    this.requireAuth(user);
    const config = await buildBusinessCalendarConfig(this.prisma);
    const now = new Date();

    const [openTickets, inProgressTickets, activeTickets] = await Promise.all([
      this.prisma.ticket.count({ where: { status: "OPEN" } }),
      this.prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
      this.repo.findAllActive(),
    ]);

    let atRiskTickets = 0;
    let breachedTickets = 0;

    for (const ticket of activeTickets) {
      const info = computeTicketSLAInfo(ticket, now, config);
      const worst = worstState(info.firstResponseState, info.resolutionState);
      if (worst === "BREACHED") breachedTickets++;
      else if (worst === "AT_RISK") atRiskTickets++;
    }

    return { openTickets, inProgressTickets, atRiskTickets, breachedTickets };
  }
}

function worstState(a: SLAState, b: SLAState): SLAState {
  const rank: Record<SLAState, number> = { ON_TRACK: 0, AT_RISK: 1, BREACHED: 2 };
  return rank[a] >= rank[b] ? a : b;
}
