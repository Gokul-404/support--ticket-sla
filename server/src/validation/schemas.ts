import { z } from "zod";

const nonEmptyTrimmed = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} cannot be empty.`)
    .max(max, `${label} is too long (max ${max} characters).`)
    .refine((v) => v.trim().length > 0, `${label} cannot be whitespace only.`);

export const RegisterInputSchema = z.object({
  name: nonEmptyTrimmed("Name", 100),
  email: z.string().trim().email("Email is invalid."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  role: z.enum(["REPORTER", "AGENT"]),
});

export const LoginInputSchema = z.object({
  email: z.string().trim().email("Email is invalid."),
  password: z.string().min(1, "Password is required."),
});

export const CreateTicketInputSchema = z.object({
  title: nonEmptyTrimmed("Title", 200),
  description: nonEmptyTrimmed("Description", 5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const AssignTicketInputSchema = z.object({
  ticketId: nonEmptyTrimmed("Ticket ID", 64),
  assigneeId: nonEmptyTrimmed("Assignee ID", 64),
});

export const ChangeTicketStatusInputSchema = z.object({
  ticketId: nonEmptyTrimmed("Ticket ID", 64),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const ResolveTicketInputSchema = z.object({
  ticketId: nonEmptyTrimmed("Ticket ID", 64),
});

export const AddCommentInputSchema = z.object({
  ticketId: nonEmptyTrimmed("Ticket ID", 64),
  content: nonEmptyTrimmed("Comment", 3000),
});

export const TicketsQueryArgsSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  slaState: z.enum(["ON_TRACK", "AT_RISK", "BREACHED"]).optional(),
  take: z.number().int().min(1).max(100).default(20),
  cursor: z.string().nullish(),
});

export function parseOrThrowValidation<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorFactory: (message: string, issues: unknown) => Error
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw errorFactory(
      result.error.issues[0]?.message ?? "Validation failed.",
      result.error.flatten()
    );
  }
  return result.data;
}
