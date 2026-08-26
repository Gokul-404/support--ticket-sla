import { execute, parse, type DocumentNode } from "graphql";
import { buildAppSchema } from "../../src/graphql/schema/buildSchema.js";
import { testPrisma } from "./testUtils.js";
import type { GraphQLContext } from "../../src/graphql/resolvers/context.js";
import type { User } from "@prisma/client";

const schema = buildAppSchema();

export async function execGraphQL<TData = Record<string, unknown>>(args: {
  query: string;
  variables?: Record<string, unknown>;
  currentUser?: Pick<User, "id" | "role" | "email" | "name" | "createdAt"> | null;
}) {
  const context: GraphQLContext = {
    prisma: testPrisma,
    currentUser: args.currentUser ?? null,
  };

  const document: DocumentNode = parse(args.query);

  const result = await execute({
    schema,
    document,
    variableValues: args.variables,
    contextValue: context,
  });

  return result as { data?: TData; errors?: readonly { message: string; extensions?: Record<string, unknown> }[] };
}
