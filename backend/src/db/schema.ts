import {
  pgTable,
  serial,
  varchar,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const marketFundingData = pgTable(
  "market_funding_data",
  {
    id: serial("id").primaryKey(),
    protocol: varchar("protocol", { length: 50 }).notNull(), // e.g., 'hyperliquid'
    symbol: varchar("symbol", { length: 50 }).notNull(), // e.g., 'BTC-PERP'
    price: numeric("price", { precision: 20, scale: 8 }).notNull(),
    imageUrl: varchar("image_url", { length: 255 }),
    fundingRate: numeric("funding_rate", {
      precision: 20,
      scale: 12,
    }).notNull(),

    // Storing the complex objects as JSONB for flexibility
    projections: jsonb("projections").notNull(),
    metadata: jsonb("metadata").notNull(),

    // The actual timestamp from the protocol
    sourceTimestamp: timestamp("source_timestamp", { withTimezone: true }),

    // Internal record tracking
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      // Unique constraint for the Upsert logic
      protocolSymbolIdx: uniqueIndex("protocol_symbol_unique_idx").on(
        table.protocol,
        table.symbol,
      ),
    };
  },
);

// Type inference
export type MarketFundingDataRecord = typeof marketFundingData.$inferSelect;
export type NewMarketFundingDataRecord = typeof marketFundingData.$inferInsert;
