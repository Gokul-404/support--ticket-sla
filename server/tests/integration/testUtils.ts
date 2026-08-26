import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Integration tests run against a REAL PostgreSQL instance — no mocked
 * database. Point DATABASE_URL (see .env.example / docker-compose.yml) at a
 * disposable Postgres instance before running `bun run test:integration`.
 *
 * `docker compose up -d postgres` is enough to provide one locally.
 */

export const testPrisma = new PrismaClient();

export async function resetDatabase(): Promise<void> {
  await testPrisma.comment.deleteMany();
  await testPrisma.ticket.deleteMany();
  await testPrisma.holiday.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function applyMigrations(): Promise<void> {
  // Ensures the test database schema is up to date before the suite runs.
  execSync("bunx prisma migrate deploy", { stdio: "inherit" });
}
