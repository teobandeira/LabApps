import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const connectionLimitFromEnv = Number(
  process.env.DB_CONNECTION_LIMIT || process.env.MARIADB_CONNECTION_LIMIT || "",
);
const connectionLimitFromUrl = Number(parsedDatabaseUrl.searchParams.get("connection_limit") || "");
const resolvedConnectionLimit = Number.isFinite(connectionLimitFromEnv)
  ? connectionLimitFromEnv
  : Number.isFinite(connectionLimitFromUrl)
    ? connectionLimitFromUrl
    : process.env.NODE_ENV === "production"
      ? 10
      : 2;
const adapter = new PrismaMariaDb({
  host: parsedDatabaseUrl.hostname,
  port: parsedDatabaseUrl.port ? Number(parsedDatabaseUrl.port) : 3306,
  user: decodeURIComponent(parsedDatabaseUrl.username),
  password: decodeURIComponent(parsedDatabaseUrl.password),
  database: decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//, "")),
  connectionLimit: Math.max(1, Math.floor(resolvedConnectionLimit)),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
