import type { GraphQLContext } from "./context.js";
import { Errors } from "../../utils/errors.js";
import { AccountService } from "../../services/auth/accountService.js";
import { TicketService } from "../../services/ticket/ticketService.js";
import { buildBusinessCalendarConfig, listHolidays } from "../../services/holiday/holidayService.js";
import { computeTicketSLAInfo } from "../../services/sla/slaService.js";
import {
  AddCommentInputSchema,
  AssignTicketInputSchema,
  ChangeTicketStatusInputSchema,
  CreateTicketInputSchema,
  LoginInputSchema,
  RegisterInputSchema,
  ResolveTicketInputSchema,
  TicketsQueryArgsSchema,
  parseOrThrowValidation,
} from "../../validation/schemas.js";
import type { Ticket } from "@prisma/client";

export const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => ctx.currentUser,

    ticket: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const service = new TicketService(ctx.prisma);
      return service.getTicketById(args.id, ctx.currentUser);
    },

    tickets: async (
      _: unknown,
      args: {
        status?: string;
        priority?: string;
        assigneeId?: string;
        slaState?: string;
        take?: number;
        cursor?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      const parsed = parseOrThrowValidation(
        TicketsQueryArgsSchema,
        args,
        Errors.validation
      );
      const service = new TicketService(ctx.prisma);
      const { nodes, hasNextPage } = await service.listTickets({
        user: ctx.currentUser,
        status: parsed.status,
        priority: parsed.priority,
        assigneeId: parsed.assigneeId,
        slaState: parsed.slaState,
        take: parsed.take ?? 20,
        cursor: parsed.cursor ?? undefined,
      });

      return {
        nodes,
        pageInfo: {
          hasNextPage,
          endCursor: nodes.length > 0 ? nodes[nodes.length - 1]!.id : null,
        },
      };
    },

    dashboard: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const service = new TicketService(ctx.prisma);
      return service.getDashboard(ctx.currentUser);
    },

    users: async (_: unknown, args: { role?: "REPORTER" | "AGENT" }, ctx: GraphQLContext) => {
      if (!ctx.currentUser) throw Errors.unauthorized();
      return ctx.prisma.user.findMany({
        where: args.role ? { role: args.role } : {},
        orderBy: { name: "asc" },
      });
    },

    holidays: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.currentUser) throw Errors.unauthorized();
      return listHolidays(ctx.prisma);
    },
  },

  Mutation: {
    register: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const input = parseOrThrowValidation(RegisterInputSchema, args.input, Errors.validation);
      const service = new AccountService(ctx.prisma);
      return service.register(input);
    },

    login: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const input = parseOrThrowValidation(LoginInputSchema, args.input, Errors.validation);
      const service = new AccountService(ctx.prisma);
      return service.login(input);
    },

    createTicket: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const input = parseOrThrowValidation(CreateTicketInputSchema, args.input, Errors.validation);
      const service = new TicketService(ctx.prisma);
      return service.createTicket({ user: ctx.currentUser, ...input });
    },

    assignTicket: async (
      _: unknown,
      args: { ticketId: string; assigneeId: string },
      ctx: GraphQLContext
    ) => {
      const input = parseOrThrowValidation(AssignTicketInputSchema, args, Errors.validation);
      const service = new TicketService(ctx.prisma);
      return service.assignTicket({ user: ctx.currentUser, ...input });
    },

    changeTicketStatus: async (
      _: unknown,
      args: { ticketId: string; status: string },
      ctx: GraphQLContext
    ) => {
      const input = parseOrThrowValidation(ChangeTicketStatusInputSchema, args, Errors.validation);
      const service = new TicketService(ctx.prisma);
      return service.changeTicketStatus({ user: ctx.currentUser, ...input });
    },

    resolveTicket: async (_: unknown, args: { ticketId: string }, ctx: GraphQLContext) => {
      const input = parseOrThrowValidation(ResolveTicketInputSchema, args, Errors.validation);
      const service = new TicketService(ctx.prisma);
      return service.resolveTicket({ user: ctx.currentUser, ticketId: input.ticketId });
    },

    addComment: async (
      _: unknown,
      args: { ticketId: string; content: string },
      ctx: GraphQLContext
    ) => {
      const input = parseOrThrowValidation(AddCommentInputSchema, args, Errors.validation);
      const service = new TicketService(ctx.prisma);
      return service.addComment({ user: ctx.currentUser, ...input });
    },
  },

  User: {
    createdAt: (parent: { createdAt: Date | string }) => new Date(parent.createdAt).toISOString(),
  },

  Comment: {
    createdAt: (parent: { createdAt: Date | string }) => new Date(parent.createdAt).toISOString(),
  },

  Ticket: {
    createdAt: (parent: Ticket) => new Date(parent.createdAt).toISOString(),
    updatedAt: (parent: Ticket) => new Date(parent.updatedAt).toISOString(),
    firstResponseAt: (parent: Ticket) => (parent.firstResponseAt ? new Date(parent.firstResponseAt).toISOString() : null),
    resolvedAt: (parent: Ticket) => (parent.resolvedAt ? new Date(parent.resolvedAt).toISOString() : null),

    comments: (parent: Ticket, _: unknown, ctx: GraphQLContext) =>
      ctx.prisma.comment.findMany({
        where: { ticketId: parent.id },
        include: { author: true },
        orderBy: { createdAt: "asc" },
      }),

    sla: async (parent: Ticket, _: unknown, ctx: GraphQLContext) => {
      const config = await buildBusinessCalendarConfig(ctx.prisma);
      const sla = computeTicketSLAInfo(parent, new Date(), config);
      return {
        ...sla,
        firstResponseDueAt: new Date(sla.firstResponseDueAt).toISOString(),
        resolutionDueAt: new Date(sla.resolutionDueAt).toISOString(),
      };
    },
  },
};

