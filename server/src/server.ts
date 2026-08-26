import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { buildAppSchema } from "./graphql/schema/buildSchema.js";
import { createContext } from "./graphql/resolvers/context.js";

const schema = buildAppSchema();

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/graphql",
  maskedErrors: {
    // Never leak internal stack traces; AppError messages are already safe.
    maskError: (error, message) => {
      const err = error as { extensions?: { code?: string } };
      if (err?.extensions?.code) {
        return error as Error;
      }
      console.error(error);
      return new Error(message);
    },
  },
});

const port = Number(process.env.PORT ?? 4000);
const server = createServer(yoga);

server.listen(port, () => {
  console.log(`GraphQL server ready at http://localhost:${port}/graphql`);
});
