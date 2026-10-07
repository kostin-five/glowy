import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = pkg;
const { Pool } = pg;

export const getDatabasePoolConfig = (env: NodeJS.ProcessEnv = process.env): pg.PoolConfig => {
  const rawUrl = env.DATABASE_URL;
  if (!rawUrl) return { ssl: { rejectUnauthorized: true } };
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("Invalid database URL configuration"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid database URL protocol");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const disableTls = env.DATABASE_TLS_MODE === "local";
  if (disableTls && (!local || env.NODE_ENV === "production")) {
    throw new Error("Local database TLS mode is restricted to development loopback connections");
  }
  // pg connection-string SSL options must not replace the verified TLS configuration.
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) {
    url.searchParams.delete(key);
  }
  return {
    connectionString: url.toString(),
    ssl: disableTls ? false : {
      rejectUnauthorized: true,
      ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}),
    },
  };
};

const pool = new Pool(getDatabasePoolConfig());

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
