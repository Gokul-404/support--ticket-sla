import type { Prisma, PrismaClient, Priority, TicketStatus } from "@prisma/client";

export interface TicketFilters {
  status?: TicketStatus;
  priority?: Priority;
  assigneeId?: string;
  reporterId?: string; // used to scope REPORTER visibility
}

export class TicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: { reporter: true, assignee: true },
    });
  }

  async findMany(args: {
    filters: TicketFilters;
    take: number;
    cursor?: string | null;
  }) {
    const { filters, take, cursor } = args;

    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.reporterId ? { reporterId: filters.reporterId } : {}),
    };

    // Fetch one extra row to know if there's a next page.
    const rows = await this.prisma.ticket.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { reporter: true, assignee: true },
    });

    const hasNextPage = rows.length > take;
    const nodes = hasNextPage ? rows.slice(0, take) : rows;

    return { nodes, hasNextPage };
  }

  create(data: {
    title: string;
    description: string;
    priority: Priority;
    reporterId: string;
  }) {
    return this.prisma.ticket.create({
      data,
      include: { reporter: true, assignee: true },
    });
  }

  update(id: string, data: Prisma.TicketUpdateInput | Prisma.TicketUncheckedUpdateInput) {
    return this.prisma.ticket.update({
      where: { id },
      data,
      include: { reporter: true, assignee: true },
    });
  }

  findAllActive() {
    // Tickets whose SLA clock is still meaningfully "live" for dashboard purposes:
    // not yet resolved/closed.
    return this.prisma.ticket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    });
  }
}
