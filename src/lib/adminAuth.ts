import { db } from "@/db";
import { admins, adminSessions } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

export async function createSession(adminId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await db.insert(adminSessions).values({
    token,
    adminId,
    expiresAt,
  });
  return token;
}

export async function validateSession(
  token: string
): Promise<{ adminId: number } | null> {
  if (!token) return null;
  const results = await db
    .select()
    .from(adminSessions)
    .where(eq(adminSessions.token, token))
    .limit(1);
  if (results.length === 0) return null;
  const session = results[0];
  if (session.expiresAt < new Date()) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
    return null;
  }
  return { adminId: session.adminId };
}

export async function requireAdmin(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return false;
  const session = await validateSession(match[1]);
  return session !== null;
}

export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await db.select().from(admins).limit(1);
  if (existing.length === 0) {
    const hash = await hashPassword("admin123");
    await db.insert(admins).values({
      email: "admin@tiles.app",
      passwordHash: hash,
    });
  }
}
