import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

export interface JWTClaims {
  sub: string; // user id
  role: UserRole;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(claims: JWTClaims): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured.");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
  return jwt.sign(claims, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTClaims | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured.");
  try {
    return jwt.verify(token, secret) as JWTClaims;
  } catch {
    return null;
  }
}
