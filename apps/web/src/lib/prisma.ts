import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads in dev, otherwise Next.js's dev server
// creates a new client (and a new DB connection) on every file edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
