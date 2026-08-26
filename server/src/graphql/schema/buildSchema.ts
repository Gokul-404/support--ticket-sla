import { createSchema } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolvers } from "../resolvers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function buildAppSchema() {
  const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf-8");
  return createSchema({ typeDefs, resolvers });
}
