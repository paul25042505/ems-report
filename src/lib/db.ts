import { PrismaClient } from "@prisma/client";

// 開發模式熱重載時重複使用同一個連線
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
