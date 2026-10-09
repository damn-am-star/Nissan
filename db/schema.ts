import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const athleteHydrationLogs = pgTable("athlete_hydration_logs", {
  id: serial().primaryKey(),
  athleteName: text("athlete_name").notNull(),
  sport: text().notNull(),
  fluidMl: serial("fluid_ml").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
