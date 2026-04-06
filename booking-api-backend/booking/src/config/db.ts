import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema/index.js";
import { env } from "./env.js";

const client = postgres(env.DATABASE_URL, { ssl: "require" });
export const db = drizzle(client, { schema });

export type DB = typeof db;
