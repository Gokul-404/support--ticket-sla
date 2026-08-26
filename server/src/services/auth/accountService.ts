import type { PrismaClient, UserRole } from "@prisma/client";
import { Errors } from "../../utils/errors.js";
import { hashPassword, signToken, verifyPassword } from "./authService.js";

export class AccountService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(args: { name: string; email: string; password: string; role: UserRole }) {
    const existing = await this.prisma.user.findUnique({ where: { email: args.email } });
    if (existing) throw Errors.emailInUse();

    const passwordHash = await hashPassword(args.password);
    const user = await this.prisma.user.create({
      data: { name: args.name, email: args.email, passwordHash, role: args.role },
    });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    return { token, user };
  }

  async login(args: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: args.email } });
    if (!user) throw Errors.invalidCredentials();

    const valid = await verifyPassword(args.password, user.passwordHash);
    if (!valid) throw Errors.invalidCredentials();

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    return { token, user };
  }
}
