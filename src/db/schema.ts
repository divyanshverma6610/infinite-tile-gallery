import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";

export const tiles = pgTable("tiles", {
  id: serial("id").primaryKey(),
  n: integer("n").notNull().unique(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  cx: integer("cx").notNull(),
  cy: integer("cy").notNull(),
  name: varchar("name", { length: 20 }).notNull(),
  deviceId: varchar("device_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: varchar("status", { length: 10 }).notNull().default("active"),
  imageData: text("image_data").notNull(), // base64 PNG data
});

export const deviceLimits = pgTable("device_limits", {
  deviceId: varchar("device_id", { length: 64 }).primaryKey(),
  lastSubmitAt: timestamp("last_submit_at").notNull(),
});

export const bans = pgTable("bans", {
  deviceId: varchar("device_id", { length: 64 }).primaryKey(),
  banned: boolean("banned").notNull().default(true),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meta = pgTable("meta", {
  key: varchar("key", { length: 32 }).primaryKey(),
  value: integer("value").notNull().default(0),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  token: varchar("token", { length: 64 }).primaryKey(),
  adminId: integer("admin_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
