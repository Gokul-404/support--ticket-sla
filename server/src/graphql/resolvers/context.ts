import type { YogaInitialContext } from "graphql-yoga";
import { prisma } from "../../utils/prisma.js";
import { verifyToken } from "../../services/auth/authService.js";
import type { User } from "@prisma/client";

export interface GraphQLContext {
  prisma: typeof prisma;
  currentUser: Pick<User, "id" | "role" | "email" | "name" | "createdAt"> | null;
}

export async function createContext(
  initialContext: YogaInitialContext
): Promise<GraphQLContext> {
  const authHeader = initialContext.request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  let currentUser: GraphQLContext["currentUser"] = null;

  if (token) {
    const claims = verifyToken(token);
    if (claims) {
      const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, role: true, email: true, name: true, createdAt: true },
      });
      currentUser = user;
    }
  }

  return { prisma, currentUser };
}
