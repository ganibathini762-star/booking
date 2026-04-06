import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "organizer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: userRoleEnum("role").default("user").notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  isVerified: boolean("is_verified").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  googleId: varchar("google_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
