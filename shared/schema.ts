import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, varchar, text, integer, real, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums for type safety
export const ParticipationStatus = {
  PLANNED: "planned",
  REGISTERED: "registered",
  ATTENDED: "attended",
  CANCELLED: "cancelled",
} as const;

export const PaymentStatus = {
  PLANNED: "planned",
  INVOICED: "invoiced",
  PAID: "paid",
  REFUNDED: "refunded",
} as const;

export const CostType = {
  ENTRY: "entry",
  TRAVEL: "travel",
  HOTEL: "hotel",
  TIRES: "tires",
  FUEL: "fuel",
  TOLLS: "tolls",
  FOOD: "food",
  OTHER: "other",
} as const;

export const VehicleType = {
  MOTORCYCLE: "motorcycle",
  CAR: "car",
  OTHER: "other",
} as const;

export const FuelType = {
  GASOLINE: "gasoline",
  DIESEL: "diesel",
  ELECTRIC: "electric",
} as const;

export const MaintenanceType = {
  OIL_CHANGE: "oil_change",
  TIRES: "tires",
  BRAKES: "brakes",
  SERVICE: "service",
  REPAIR: "repair",
  OTHER: "other",
} as const;

export const ScheduleBlockType = {
  REGISTRATION: "registration",
  SESSION: "session",
  BREAK: "break",
  LUNCH: "lunch",
  OTHER: "other",
} as const;

// ============= TRACKS =============
export interface Track {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  organizerName: string;
  organizerWebsite: string;
}

export const insertTrackSchema = z.object({
  name: z.string().min(1, "Track name is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  organizerName: z.string().default(""),
  organizerWebsite: z.string().url().or(z.literal("")).default(""),
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;

// ============= TRACKDAYS =============
export interface Trackday {
  id: string;
  trackId: string;
  date: string; // ISO date string
  durationDays: number;
  vehicleId: string | null;
  notes: string;
  participationStatus: typeof ParticipationStatus[keyof typeof ParticipationStatus];
  // Computed/cached fields for route
  routeDistance?: number; // km
  routeDuration?: number; // minutes
  routeFuelCost?: number; // cents
  routeTollsCost?: number; // cents
  routeGeometry?: string; // JSON array of [lng, lat] coordinates
}

export const insertTrackdaySchema = z.object({
  trackId: z.string().min(1, "Track is required"),
  date: z.string().min(1, "Date is required"),
  durationDays: z.number().min(1).max(30).default(1),
  vehicleId: z.string().nullable(),
  notes: z.string().default(""),
  participationStatus: z.enum(["planned", "registered", "attended", "cancelled"]).default("planned"),
});

export type InsertTrackday = z.infer<typeof insertTrackdaySchema>;

// ============= COST ITEMS =============
export interface CostItem {
  id: string;
  trackdayId: string;
  type: typeof CostType[keyof typeof CostType];
  amountCents: number;
  currency: string;
  status: typeof PaymentStatus[keyof typeof PaymentStatus];
  dueDate: string | null; // ISO date string
  paidAt: string | null; // ISO date string
  notes: string;
  isTravelAuto: boolean; // true if auto-generated from route calc
}

export const insertCostItemSchema = z.object({
  trackdayId: z.string().min(1),
  type: z.enum(["entry", "travel", "hotel", "tires", "fuel", "tolls", "food", "other"]),
  amountCents: z.number().min(0),
  currency: z.string().default("CHF"),
  status: z.enum(["planned", "invoiced", "paid", "refunded"]).default("planned"),
  dueDate: z.string().nullable().default(null),
  paidAt: z.string().nullable().default(null),
  notes: z.string().default(""),
  isTravelAuto: z.boolean().default(false),
});

export type InsertCostItem = z.infer<typeof insertCostItemSchema>;

// ============= VEHICLES =============
export interface Vehicle {
  id: string;
  name: string;
  type: typeof VehicleType[keyof typeof VehicleType];
  fuelType: typeof FuelType[keyof typeof FuelType];
  consumptionPer100: number; // liters per 100km
  notes: string;
}

export const insertVehicleSchema = z.object({
  name: z.string().min(1, "Vehicle name is required"),
  type: z.enum(["motorcycle", "car", "other"]).default("motorcycle"),
  fuelType: z.enum(["gasoline", "diesel", "electric"]).default("gasoline"),
  consumptionPer100: z.number().min(0).max(50).default(6.5),
  notes: z.string().default(""),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// ============= MAINTENANCE LOGS =============
export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: string; // ISO date string
  type: typeof MaintenanceType[keyof typeof MaintenanceType];
  costCents: number;
  odometerKm: number | null;
  notes: string;
}

export const insertMaintenanceLogSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["oil_change", "tires", "brakes", "service", "repair", "other"]),
  costCents: z.number().min(0),
  odometerKm: z.number().nullable().default(null),
  notes: z.string().default(""),
});

export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;

// ============= TRACKDAY SCHEDULE BLOCKS =============
export interface TrackdayScheduleBlock {
  id: string;
  trackdayId: string;
  startTime: string; // ISO datetime or time string
  endTime: string;
  title: string;
  type: typeof ScheduleBlockType[keyof typeof ScheduleBlockType];
  notes: string;
}

export const insertScheduleBlockSchema = z.object({
  trackdayId: z.string().min(1),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["registration", "session", "break", "lunch", "other"]).default("session"),
  notes: z.string().default(""),
});

export type InsertScheduleBlock = z.infer<typeof insertScheduleBlockSchema>;

// ============= TRACK SESSIONS =============
export interface TrackSession {
  id: string;
  trackdayId: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  bestLapMs: number | null; // milliseconds
  notes: string;
}

export const insertTrackSessionSchema = z.object({
  trackdayId: z.string().min(1),
  name: z.string().min(1, "Session name is required"),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  bestLapMs: z.number().nullable().default(null),
  notes: z.string().default(""),
});

export type InsertTrackSession = z.infer<typeof insertTrackSessionSchema>;

// ============= LAPS =============
export interface Lap {
  id: string;
  sessionId: string;
  lapNumber: number;
  lapTimeMs: number; // milliseconds
  sectorTimesMsJson: string | null; // JSON array of sector times
  valid: boolean;
}

export const insertLapSchema = z.object({
  sessionId: z.string().min(1),
  lapNumber: z.number().min(1),
  lapTimeMs: z.number().min(0),
  sectorTimesMsJson: z.string().nullable().default(null),
  valid: z.boolean().default(true),
});

export type InsertLap = z.infer<typeof insertLapSchema>;

// ============= BOOKING DRAFTS =============
export interface BookingDraft {
  id: string;
  trackId: string;
  status: string;
  capturedFields: Record<string, any>; // Flexible JSON object for captured booking data
  updatedAt: Date;
}

export const insertBookingDraftSchema = z.object({
  trackId: z.string().min(1, "Track is required"),
  status: z.string().default("draft"),
  capturedFields: z.record(z.any()).default({}),
});

export type InsertBookingDraft = z.infer<typeof insertBookingDraftSchema>;

// ============= SETTINGS (Singleton) =============
export interface Settings {
  id: string; // singleton, always "default"
  currency: string;
  homeLat: number;
  homeLng: number;
  fuelPricePerLitre: number; // in currency units
  tollsPerKm: number; // in currency units
  annualBudgetCents: number;
  openRouteServiceKey: string;
  openWeatherApiKey: string;
  googleMapsApiKey: string;
}

export const insertSettingsSchema = z.object({
  currency: z.string().default("CHF"),
  homeLat: z.number().min(-90).max(90).default(47.3769),
  homeLng: z.number().min(-180).max(180).default(8.5417),
  fuelPricePerLitre: z.number().min(0).default(1.90),
  tollsPerKm: z.number().min(0).default(0.05),
  annualBudgetCents: z.number().min(0).default(500000),
  openRouteServiceKey: z.string().default(""),
  openWeatherApiKey: z.string().default(""),
  googleMapsApiKey: z.string().default(""),
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// ============= WEATHER CACHE =============
export interface WeatherCache {
  trackdayId: string;
  fetchedAt: string; // ISO datetime
  temperature: number;
  rainChance: number; // 0-100
  windSpeed: number;
  description: string;
}

// ============= SUMMARY/ANALYTICS TYPES =============
export interface BudgetSummary {
  projectedCents: number;
  spentCents: number;
  remainingCents: number;
  annualBudgetCents: number;
}

export interface MonthlySpending {
  month: string; // YYYY-MM
  amountCents: number;
}

export interface DashboardStats {
  totalEvents: number;
  totalCostCents: number;
  maintenanceCostCents: number;
  upcomingEvents: number;
}

// ============= DRIZZLE TABLE DEFINITIONS =============

export const tracks = pgTable("tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  organizerName: text("organizer_name").notNull().default(""),
  organizerWebsite: text("organizer_website").notNull().default(""),
});

export const trackdays = pgTable("trackdays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 20 }).notNull(),
  durationDays: integer("duration_days").notNull().default(1),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  participationStatus: varchar("participation_status", { length: 20 }).notNull().default("planned"),
  routeDistance: real("route_distance"),
  routeDuration: real("route_duration"),
  routeFuelCost: integer("route_fuel_cost"),
  routeTollsCost: integer("route_tolls_cost"),
  routeGeometry: text("route_geometry"),
});

export const costItems = pgTable("cost_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackdayId: varchar("trackday_id").notNull().references(() => trackdays.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("CHF"),
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  dueDate: varchar("due_date", { length: 20 }),
  paidAt: varchar("paid_at", { length: 20 }),
  notes: text("notes").notNull().default(""),
  isTravelAuto: boolean("is_travel_auto").notNull().default(false),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  fuelType: varchar("fuel_type", { length: 20 }).notNull(),
  consumptionPer100: real("consumption_per_100").notNull(),
  notes: text("notes").notNull().default(""),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 20 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  costCents: integer("cost_cents").notNull(),
  odometerKm: integer("odometer_km"),
  notes: text("notes").notNull().default(""),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackdayId: varchar("trackday_id").notNull().references(() => trackdays.id, { onDelete: "cascade" }),
  startTime: varchar("start_time", { length: 50 }).notNull(),
  endTime: varchar("end_time", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  notes: text("notes").notNull().default(""),
});

export const trackSessions = pgTable("track_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackdayId: varchar("trackday_id").notNull().references(() => trackdays.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: varchar("start_time", { length: 50 }),
  endTime: varchar("end_time", { length: 50 }),
  bestLapMs: integer("best_lap_ms"),
  notes: text("notes").notNull().default(""),
});

export const laps = pgTable("laps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => trackSessions.id, { onDelete: "cascade" }),
  lapNumber: integer("lap_number").notNull(),
  lapTimeMs: integer("lap_time_ms").notNull(),
  sectorTimesMsJson: text("sector_times_ms_json"),
  valid: boolean("valid").notNull().default(true),
});

export const bookingDrafts = pgTable("booking_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  capturedFields: jsonb("captured_fields").notNull().default('{}'),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default("default"),
  currency: varchar("currency", { length: 10 }).notNull().default("CHF"),
  homeLat: real("home_lat").notNull().default(47.3769),
  homeLng: real("home_lng").notNull().default(8.5417),
  fuelPricePerLitre: real("fuel_price_per_litre").notNull().default(1.90),
  tollsPerKm: real("tolls_per_km").notNull().default(0.05),
  annualBudgetCents: integer("annual_budget_cents").notNull().default(500000),
  openRouteServiceKey: text("open_route_service_key").notNull().default(""),
  openWeatherApiKey: text("open_weather_api_key").notNull().default(""),
  googleMapsApiKey: text("google_maps_api_key").notNull().default(""),
});

export const weatherCache = pgTable("weather_cache", {
  trackdayId: varchar("trackday_id").primaryKey().references(() => trackdays.id, { onDelete: "cascade" }),
  fetchedAt: varchar("fetched_at", { length: 50 }).notNull(),
  temperature: real("temperature").notNull(),
  rainChance: integer("rain_chance").notNull(),
  windSpeed: real("wind_speed").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
});

// ============= AUTHENTICATION =============
// Replit Auth integration - Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth integration - User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
