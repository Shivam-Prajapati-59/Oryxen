import {
  timestamp,
  integer,
  pgTable,
  varchar,
  text,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";

export const perpsTable = pgTable("perps", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  // Basic Info
  symbol: varchar({ length: 100 }).notNull(),
  indexId: varchar({ length: 50 }).notNull(),

  // Protocol Info
  market: varchar({ length: 100 }).notNull(),
  contractType: varchar({ length: 50 }).notNull(),

  // Market Data
  imageUrl: text(),

  // Status
  isActive: boolean().notNull().default(true),

  // Timestamps
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
  lastFetchedAt: timestamp(),
});
