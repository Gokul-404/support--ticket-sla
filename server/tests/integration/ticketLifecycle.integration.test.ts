import { execSync } from "node:child_process";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { execGraphQL } from "./execGraphQL.js";
import { resetDatabase, testPrisma } from "./testUtils.js";
import type { User } from "@prisma/client";

const REGISTER = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user { id name email role }
    }
  }
`;

const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id name email role }
    }
  }
`;

const CREATE_TICKET = `
  mutation CreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      id
      status
      priority
      firstResponseAt
      resolvedAt
    }
  }
`;

const ADD_COMMENT = `
  mutation AddComment($ticketId: ID!, $content: String!) {
    addComment(ticketId: $ticketId, content: $content) {
      id
      content
    }
  }
`;

const ASSIGN_TICKET = `
  mutation AssignTicket($ticketId: ID!, $assigneeId: ID!) {
    assignTicket(ticketId: $ticketId, assigneeId: $assigneeId) {
      id
      assignee { id }
    }
  }
`;

const CHANGE_STATUS = `
  mutation ChangeStatus($ticketId: ID!, $status: TicketStatus!) {
    changeTicketStatus(ticketId: $ticketId, status: $status) {
      id
      status
    }
  }
`;

const RESOLVE_TICKET = `
  mutation Resolve($ticketId: ID!) {
    resolveTicket(ticketId: $ticketId) {
      id
      status
      resolvedAt
    }
  }
`;

const GET_TICKET = `
  query GetTicket($id: ID!) {
    ticket(id: $id) {
      id
      status
      firstResponseAt
      resolvedAt
      sla {
        firstResponseState
        resolutionState
        firstResponseDueAt
        resolutionDueAt
      }
    }
  }
`;

describe("Full ticket lifecycle (real Postgres)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    // Re-seed demo users & data so dev database remains ready for login
    try {
      execSync("bun prisma/seed.ts", { stdio: "ignore" });
    } catch {}
    await testPrisma.$disconnect();
  });

  it("register -> login -> create -> comment -> assign -> resolve, with SLA persisted", async () => {
    // 1. Register reporter
    const registerReporter = await execGraphQL<{ register: { token: string; user: User } }>({
      query: REGISTER,
      variables: {
        input: {
          name: "Riya Reporter",
          email: "riya@example.com",
          password: "Password123",
          role: "REPORTER",
        },
      },
    });
    expect(registerReporter.errors).toBeUndefined();
    expect(registerReporter.data?.register.token).toBeTruthy();
    const reporter = registerReporter.data!.register.user;

    // 2. Register agent
    const registerAgent = await execGraphQL<{ register: { token: string; user: User } }>({
      query: REGISTER,
      variables: {
        input: {
          name: "Arjun Agent",
          email: "arjun@example.com",
          password: "Password123",
          role: "AGENT",
        },
      },
    });
    expect(registerAgent.errors).toBeUndefined();
    const agent = registerAgent.data!.register.user;

    // 3. Login as reporter (verifies bcrypt hash + JWT roundtrip)
    const loginReporter = await execGraphQL<{ login: { token: string } }>({
      query: LOGIN,
      variables: { input: { email: "riya@example.com", password: "Password123" } },
    });
    expect(loginReporter.errors).toBeUndefined();
    expect(loginReporter.data?.login.token).toBeTruthy();

    // 4. Create ticket as reporter
    const createResult = await execGraphQL<{
      createTicket: { id: string; firstResponseAt: string | null; resolvedAt: string | null };
    }>({
      query: CREATE_TICKET,
      variables: {
        input: {
          title: "App crashes on startup",
          description: "The app crashes immediately after login on Android.",
          priority: "HIGH",
        },
      },
      currentUser: reporter,
    });
    expect(createResult.errors).toBeUndefined();
    const ticketId = createResult.data!.createTicket.id;
    expect(createResult.data!.createTicket.firstResponseAt).toBeNull();
    expect(createResult.data!.createTicket.resolvedAt).toBeNull();

    // 5. Reporter comments first — must NOT set firstResponseAt
    const reporterComment = await execGraphQL({
      query: ADD_COMMENT,
      variables: { ticketId, content: "Any update on this?" },
      currentUser: reporter,
    });
    expect(reporterComment.errors).toBeUndefined();

    const afterReporterComment = await testPrisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(afterReporterComment.firstResponseAt).toBeNull();

    // 6. Agent comments — THIS sets firstResponseAt
    const agentComment = await execGraphQL({
      query: ADD_COMMENT,
      variables: { ticketId, content: "Looking into this now." },
      currentUser: agent,
    });
    expect(agentComment.errors).toBeUndefined();

    const afterAgentComment = await testPrisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(afterAgentComment.firstResponseAt).not.toBeNull();
    const firstResponseAtSnapshot = afterAgentComment.firstResponseAt;

    // 7. A second agent comment must NOT overwrite firstResponseAt
    await execGraphQL({
      query: ADD_COMMENT,
      variables: { ticketId, content: "Still investigating." },
      currentUser: agent,
    });
    const afterSecondAgentComment = await testPrisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(afterSecondAgentComment.firstResponseAt?.getTime()).toBe(
      firstResponseAtSnapshot?.getTime()
    );

    // 8. Assign ticket to agent
    const assignResult = await execGraphQL<{ assignTicket: { assignee: { id: string } } }>({
      query: ASSIGN_TICKET,
      variables: { ticketId, assigneeId: agent.id },
      currentUser: agent,
    });
    expect(assignResult.errors).toBeUndefined();
    expect(assignResult.data?.assignTicket.assignee.id).toBe(agent.id);

    // 9. Move to IN_PROGRESS
    const inProgressResult = await execGraphQL({
      query: CHANGE_STATUS,
      variables: { ticketId, status: "IN_PROGRESS" },
      currentUser: agent,
    });
    expect(inProgressResult.errors).toBeUndefined();

    // 10. Resolve the ticket
    const resolveResult = await execGraphQL<{
      resolveTicket: { status: string; resolvedAt: string };
    }>({
      query: RESOLVE_TICKET,
      variables: { ticketId },
      currentUser: agent,
    });
    expect(resolveResult.errors).toBeUndefined();
    expect(resolveResult.data?.resolveTicket.status).toBe("RESOLVED");
    expect(resolveResult.data?.resolveTicket.resolvedAt).toBeTruthy();

    // 11. Verify resolvedAt persisted in the database (not just the response)
    const persisted = await testPrisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(persisted.resolvedAt).not.toBeNull();
    expect(persisted.status).toBe("RESOLVED");

    // 12. Verify SLA is computed and frozen (both events already happened)
    const slaResult = await execGraphQL<{
      ticket: {
        sla: {
          firstResponseState: string;
          resolutionState: string;
          firstResponseDueAt: string;
          resolutionDueAt: string;
        };
      };
    }>({
      query: GET_TICKET,
      variables: { id: ticketId },
      currentUser: agent,
    });
    expect(slaResult.errors).toBeUndefined();
    expect(["ON_TRACK", "AT_RISK", "BREACHED"]).toContain(
      slaResult.data?.ticket.sla.firstResponseState
    );
    expect(["ON_TRACK", "AT_RISK", "BREACHED"]).toContain(
      slaResult.data?.ticket.sla.resolutionState
    );
  });

  it("prevents a reporter from viewing another reporter's ticket", async () => {
    const r1 = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Reporter One", email: "r1@example.com", password: "Password123", role: "REPORTER" },
      },
    });
    const r2 = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Reporter Two", email: "r2@example.com", password: "Password123", role: "REPORTER" },
      },
    });

    const created = await execGraphQL<{ createTicket: { id: string } }>({
      query: CREATE_TICKET,
      variables: {
        input: { title: "Private issue", description: "Only I should see this.", priority: "LOW" },
      },
      currentUser: r1.data!.register.user,
    });
    const ticketId = created.data!.createTicket.id;

    const attempt = await execGraphQL({
      query: GET_TICKET,
      variables: { id: ticketId },
      currentUser: r2.data!.register.user,
    });

    expect(attempt.errors).toBeDefined();
    expect(attempt.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
  });

  it("rejects an invalid status transition (OPEN -> CLOSED)", async () => {
    const agentReg = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Agent A", email: "agenta@example.com", password: "Password123", role: "AGENT" },
      },
    });
    const reporterReg = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Reporter A", email: "reportera@example.com", password: "Password123", role: "REPORTER" },
      },
    });

    const created = await execGraphQL<{ createTicket: { id: string } }>({
      query: CREATE_TICKET,
      variables: {
        input: { title: "Bug", description: "Something broke.", priority: "MEDIUM" },
      },
      currentUser: reporterReg.data!.register.user,
    });
    const ticketId = created.data!.createTicket.id;

    const result = await execGraphQL({
      query: CHANGE_STATUS,
      variables: { ticketId, status: "CLOSED" },
      currentUser: agentReg.data!.register.user,
    });

    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.extensions?.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("rejects ticket creation with empty or whitespace-only title/description", async () => {
    const reporterReg = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Reporter V", email: "reporterv@example.com", password: "Password123", role: "REPORTER" },
      },
    });
    const reporter = reporterReg.data!.register.user;

    // Empty title
    const emptyTitleRes = await execGraphQL({
      query: CREATE_TICKET,
      variables: {
        input: { title: "   ", description: "Valid description", priority: "MEDIUM" },
      },
      currentUser: reporter,
    });
    expect(emptyTitleRes.errors).toBeDefined();
    expect(emptyTitleRes.errors?.[0]?.extensions?.code).toBe("VALIDATION_ERROR");

    // Empty description
    const emptyDescRes = await execGraphQL({
      query: CREATE_TICKET,
      variables: {
        input: { title: "Valid title", description: "", priority: "MEDIUM" },
      },
      currentUser: reporter,
    });
    expect(emptyDescRes.errors).toBeDefined();
    expect(emptyDescRes.errors?.[0]?.extensions?.code).toBe("VALIDATION_ERROR");
  });

  it("returns TICKET_NOT_FOUND when querying or mutating a nonexistent ticket ID", async () => {
    const agentReg = await execGraphQL<{ register: { user: User } }>({
      query: REGISTER,
      variables: {
        input: { name: "Agent V", email: "agentv@example.com", password: "Password123", role: "AGENT" },
      },
    });
    const agent = agentReg.data!.register.user;

    const queryRes = await execGraphQL({
      query: GET_TICKET,
      variables: { id: "nonexistent-cuid-or-uuid-9999" },
      currentUser: agent,
    });
    expect(queryRes.errors).toBeDefined();
    expect(queryRes.errors?.[0]?.extensions?.code).toBe("TICKET_NOT_FOUND");

    const commentRes = await execGraphQL({
      query: ADD_COMMENT,
      variables: { ticketId: "nonexistent-ticket-id", content: "Hello" },
      currentUser: agent,
    });
    expect(commentRes.errors).toBeDefined();
    expect(commentRes.errors?.[0]?.extensions?.code).toBe("TICKET_NOT_FOUND");
  });
});

