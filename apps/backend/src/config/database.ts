import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const envPathRoot = path.resolve(process.cwd(), ".env");
const envPathApps = path.resolve(process.cwd(), "../../.env");

if (fs.existsSync(envPathRoot)) {
  dotenv.config({ path: envPathRoot });
} else if (fs.existsSync(envPathApps)) {
  dotenv.config({ path: envPathApps });
} else {
  dotenv.config();
}

const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined
    })
  : new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: dbPort,
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? "cotizapp",
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined
    });

