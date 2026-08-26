import { GraphQLError } from "graphql";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "TICKET_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "INVALID_COMMENT"
  | "INVALID_PRIORITY"
  | "INVALID_CURSOR"
  | "EMAIL_ALREADY_IN_USE"
  | "INVALID_CREDENTIALS";

export class AppError extends GraphQLError {
  constructor(message: string, code: ErrorCode, extra?: Record<string, unknown>) {
    super(message, {
      extensions: { code, ...extra },
    });
    this.name = "AppError";
  }
}

export const Errors = {
  validation: (message: string, issues?: unknown) =>
    new AppError(message, "VALIDATION_ERROR", { issues }),
  unauthorized: (message = "You must be logged in to do this.") =>
    new AppError(message, "UNAUTHORIZED"),
  forbidden: (message = "You do not have permission to do this.") =>
    new AppError(message, "FORBIDDEN"),
  ticketNotFound: (id?: string) =>
    new AppError(`Ticket${id ? ` "${id}"` : ""} was not found.`, "TICKET_NOT_FOUND"),
  userNotFound: (id?: string) =>
    new AppError(`User${id ? ` "${id}"` : ""} was not found.`, "USER_NOT_FOUND"),
  invalidStatusTransition: (from: string, to: string) =>
    new AppError(
      `Cannot transition ticket from ${from} to ${to}.`,
      "INVALID_STATUS_TRANSITION"
    ),
  invalidComment: (message = "Comment content is invalid.") =>
    new AppError(message, "INVALID_COMMENT"),
  invalidPriority: (message = "Priority is invalid.") =>
    new AppError(message, "INVALID_PRIORITY"),
  invalidCursor: (message = "Pagination cursor is invalid.") =>
    new AppError(message, "INVALID_CURSOR"),
  emailInUse: () => new AppError("Email is already registered.", "EMAIL_ALREADY_IN_USE"),
  invalidCredentials: () =>
    new AppError("Email or password is incorrect.", "INVALID_CREDENTIALS"),
};
