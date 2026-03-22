import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // In some local Windows/network setups, TLS interception can cause
  // "self-signed certificate in certificate chain" errors.
  const allowSelfSignedInDev =
    process.env.NODE_ENV !== "production" &&
    process.env.PG_ALLOW_SELF_SIGNED_CERT === "true";

  let effectiveConnectionString = connectionString;
  if (allowSelfSignedInDev) {
    if (/sslmode=/i.test(effectiveConnectionString)) {
      effectiveConnectionString = effectiveConnectionString.replace(
        /sslmode=([^&]+)/i,
        "sslmode=no-verify"
      );
    } else {
      effectiveConnectionString += `${
        effectiveConnectionString.includes("?") ? "&" : "?"
      }sslmode=no-verify`;
    }
  }

  const adapter = new PrismaPg({
    connectionString: effectiveConnectionString,
    ssl: allowSelfSignedInDev ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
