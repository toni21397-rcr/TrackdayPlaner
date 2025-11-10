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

export const CadenceType = {
  TRACKDAY: "trackday",
  TIME_INTERVAL: "time_interval",
  ODOMETER: "odometer",
  ENGINE_HOURS: "engine_hours",
} as const;

export const TaskStatus = {
  PENDING: "pending",
  DUE: "due",
  SNOOZED: "snoozed",
  COMPLETED: "completed",
  DISMISSED: "dismissed",
} as const;

export const CompletionSource = {
  AUTO: "auto",
  MANUAL: "manual",
} as const;

export const VehiclePlanStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
} as const;

export const TaskEventType = {
  STATUS_CHANGE: "status_change",
  NOTIFICATION_SENT: "notification_sent",
  TRIGGERED: "triggered",
} as const;

export const PackingListSource = {
  PLAN: "plan",
  MANUAL: "manual",
} as const;

export const cadenceConfigSchema = z.object({
  trackday: z.object({
    afterEveryN: z.number().min(1).default(1),
  }).optional(),
  time_interval: z.object({
    intervalDays: z.number().min(1),
    startDate: z.string().optional(),
  }).optional(),
  odometer: z.object({
    intervalKm: z.number().min(1),
    startOdometer: z.number().optional(),
  }).optional(),
  engine_hours: z.object({
    intervalHours: z.number().min(1),
    startHours: z.number().optional(),
  }).optional(),
});

export type CadenceConfig = z.infer<typeof cadenceConfigSchema>;

export const dueOffsetSchema = z.object({
  days: z.number().default(0),
  trackdays: z.number().default(0),
  odometerKm: z.number().default(0),
});

export type DueOffset = z.infer<typeof dueOffsetSchema>;

export const autoCompleteMatcherSchema = z.object({
  maintenanceType: z.string().optional(),
  odometerTolerance: z.number().optional(),
  partsRequired: z.array(z.string()).optional(),
});

export type AutoCompleteMatcher = z.infer<typeof autoCompleteMatcherSchema>;

// ============= ORGANIZERS =============
export interface Organizer {
  id: string;
  name: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  createdBy?: string | null;
}

export const insertOrganizerSchema = z.object({
  name: z.string().min(1, "Organizer name is required"),
  website: z.string().url().or(z.literal("")).default(""),
  contactEmail: z.string().email().or(z.literal("")).default(""),
  contactPhone: z.string().default(""),
  description: z.string().default(""),
  createdBy: z.string().nullable().optional(),
});

export type InsertOrganizer = z.infer<typeof insertOrganizerSchema>;

// ============= TRACKS =============
export interface Track {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  organizerId: string | null;
  organizerName: string;
  organizerWebsite: string;
  createdBy?: string | null;
}

export const insertTrackSchema = z.object({
  name: z.string().min(1, "Track name is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  organizerId: z.string().nullable().default(null),
  organizerName: z.string().default(""),
  organizerWebsite: z.string().url().or(z.literal("")).default(""),
  createdBy: z.string().nullable().optional(),
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;

// ============= TRACKDAYS =============
export interface Trackday {
  id: string;
  trackId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
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
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  durationDays: z.number().min(1).max(30).optional(),
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
  userId: string;
  name: string;
  type: typeof VehicleType[keyof typeof VehicleType];
  fuelType: typeof FuelType[keyof typeof FuelType];
  consumptionPer100: number; // liters per 100km
  notes: string;
}

export const insertVehicleSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Vehicle name is required"),
  type: z.enum(["motorcycle", "car", "other"]).default("motorcycle"),
  fuelType: z.enum(["gasoline", "diesel", "electric"]).default("gasoline"),
  consumptionPer100: z.number().min(0).max(50).default(6.5),
  notes: z.string().default(""),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// ============= MOTORCYCLE MODELS =============
export interface MotorcycleModel {
  id: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: string | null;
  updatedAt: Date | null;
}

export const insertMotorcycleModelSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
  createdBy: z.string().nullable().optional(),
});

export type InsertMotorcycleModel = z.infer<typeof insertMotorcycleModelSchema>;

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

export const organizers = pgTable("organizers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website").notNull().default(""),
  contactEmail: varchar("contact_email", { length: 255 }).notNull().default(""),
  contactPhone: varchar("contact_phone", { length: 50 }).notNull().default(""),
  description: text("description").notNull().default(""),
  createdBy: varchar("created_by"), // null = system/admin created, otherwise user ID
});

export const tracks = pgTable(
  "tracks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    organizerId: varchar("organizer_id").references(() => organizers.id, { onDelete: "set null" }),
    organizerName: text("organizer_name").notNull().default(""),
    organizerWebsite: text("organizer_website").notNull().default(""),
    createdBy: varchar("created_by"),
    summary: text("summary").notNull().default(""),
    lengthKm: real("length_km"),
    turns: integer("turns"),
    surface: varchar("surface", { length: 50 }).notNull().default(""),
    difficulty: varchar("difficulty", { length: 50 }).notNull().default(""),
    facilities: text("facilities").array().notNull().default(sql`ARRAY[]::text[]`),
    tips: text("tips").array().notNull().default(sql`ARRAY[]::text[]`),
  },
  (table) => [
    index("IDX_tracks_organizer").on(table.organizerId),
    index("IDX_tracks_country").on(table.country),
  ],
);

export const trackdays = pgTable(
  "trackdays",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    trackId: varchar("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
    startDate: varchar("start_date", { length: 20 }).notNull(),
    endDate: varchar("end_date", { length: 20 }).notNull(),
    durationDays: integer("duration_days").notNull().default(1),
    vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
    participationStatus: varchar("participation_status", { length: 20 }).notNull().default("planned"),
    routeDistance: real("route_distance"),
    routeDuration: real("route_duration"),
    routeFuelCost: integer("route_fuel_cost"),
    routeTollsCost: integer("route_tolls_cost"),
    routeGeometry: text("route_geometry"),
  },
  (table) => [
    index("IDX_trackdays_track_date").on(table.trackId, table.startDate),
    index("IDX_trackdays_date").on(table.startDate),
    index("IDX_trackdays_vehicle").on(table.vehicleId),
    index("IDX_trackdays_status").on(table.participationStatus),
  ],
);

export const costItems = pgTable(
  "cost_items",
  {
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
  },
  (table) => [
    index("IDX_cost_items_trackday").on(table.trackdayId),
    index("IDX_cost_items_type_status").on(table.type, table.status),
  ],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    fuelType: varchar("fuel_type", { length: 20 }).notNull(),
    consumptionPer100: real("consumption_per_100").notNull(),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("IDX_vehicles_user").on(table.userId),
  ],
);

export const motorcycleModels = pgTable("motorcycle_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: varchar("created_by"), // null = system/admin, otherwise user ID
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceLogs = pgTable(
  "maintenance_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 20 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    costCents: integer("cost_cents").notNull(),
    odometerKm: integer("odometer_km"),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("IDX_maintenance_logs_vehicle_date").on(table.vehicleId, table.date),
    index("IDX_maintenance_logs_type").on(table.type),
  ],
);

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    trackdayId: varchar("trackday_id").notNull().references(() => trackdays.id, { onDelete: "cascade" }),
    startTime: varchar("start_time", { length: 50 }).notNull(),
    endTime: varchar("end_time", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("IDX_schedule_blocks_trackday").on(table.trackdayId),
  ],
);

export const trackSessions = pgTable(
  "track_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    trackdayId: varchar("trackday_id").notNull().references(() => trackdays.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    startTime: varchar("start_time", { length: 50 }),
    endTime: varchar("end_time", { length: 50 }),
    bestLapMs: integer("best_lap_ms"),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("IDX_track_sessions_trackday").on(table.trackdayId),
  ],
);

export const laps = pgTable(
  "laps",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().references(() => trackSessions.id, { onDelete: "cascade" }),
    lapNumber: integer("lap_number").notNull(),
    lapTimeMs: integer("lap_time_ms").notNull(),
    sectorTimesMsJson: text("sector_times_ms_json"),
    valid: boolean("valid").notNull().default(true),
  },
  (table) => [
    index("IDX_laps_session").on(table.sessionId),
    index("IDX_laps_session_number").on(table.sessionId, table.lapNumber),
  ],
);

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

export const weatherCache = pgTable(
  "weather_cache",
  {
    trackdayId: varchar("trackday_id").primaryKey().references(() => trackdays.id, { onDelete: "cascade" }),
    fetchedAt: varchar("fetched_at", { length: 50 }).notNull(),
    temperature: real("temperature").notNull(),
    rainChance: integer("rain_chance").notNull(),
    windSpeed: real("wind_speed").notNull(),
    description: varchar("description", { length: 255 }).notNull(),
  },
  (table) => [
    index("IDX_weather_cache_fetched_at").on(table.fetchedAt),
  ],
);

// ============= MAINTENANCE PLANNING =============
// Interfaces
export interface MaintenancePlan {
  id: string;
  ownerUserId: string | null;
  name: string;
  description: string;
  isTemplate: boolean;
  cadenceType: typeof CadenceType[keyof typeof CadenceType];
  cadenceConfig: CadenceConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanChecklistItem {
  id: string;
  planId: string;
  title: string;
  description: string;
  maintenanceType: string;
  defaultDueOffset: DueOffset;
  autoCompleteMatcher: AutoCompleteMatcher;
  sequence: number;
  isCritical: boolean;
}

export interface ChecklistItemPart {
  id: string;
  checklistItemId: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  isTool: boolean;
}

export interface VehiclePlan {
  id: string;
  vehicleId: string;
  planId: string;
  activationDate: string;
  odometerAtActivation: number | null;
  engineHoursAtActivation: number | null;
  timezone: string;
  status: typeof VehiclePlanStatus[keyof typeof VehiclePlanStatus];
  metadata: any; // JSON
  createdAt: Date;
}

export interface MaintenanceTask {
  id: string;
  vehiclePlanId: string;
  checklistItemId: string | null;
  customTitle: string | null;
  notes: string;
  dueAt: Date;
  windowStart: Date | null;
  status: typeof TaskStatus[keyof typeof TaskStatus];
  snoozedUntil: Date | null;
  completedAt: Date | null;
  dismissedAt: Date | null;
  completionSource: typeof CompletionSource[keyof typeof CompletionSource] | null;
  maintenanceLogId: string | null;
  lastNotificationAt: Date | null;
  triggerContext: any; // JSON
  hashId: string | null;
  createdAt: Date;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: typeof TaskEventType[keyof typeof TaskEventType];
  payload: any; // JSON
  occurredAt: Date;
}

export interface PackingList {
  id: string;
  vehiclePlanId: string;
  checklistItemId: string | null;
  source: typeof PackingListSource[keyof typeof PackingListSource];
  generatedForTrackdayId: string | null;
  exportedAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  timezone: string;
  quietHours: any; // JSON
}

// Zod Schemas
export const insertMaintenancePlanSchema = z.object({
  ownerUserId: z.string().nullable().optional(),
  name: z.string().min(1, "Plan name is required"),
  description: z.string().default(""),
  isTemplate: z.boolean().default(false),
  cadenceType: z.enum(["trackday", "time_interval", "odometer", "engine_hours"]),
  cadenceConfig: cadenceConfigSchema.default({}),
});

export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;

export const insertPlanChecklistItemSchema = z.object({
  planId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  maintenanceType: z.string().default("other"),
  defaultDueOffset: dueOffsetSchema.default({ days: 0, trackdays: 0, odometerKm: 0 }),
  autoCompleteMatcher: autoCompleteMatcherSchema.default({}),
  sequence: z.number().default(0),
  isCritical: z.boolean().default(false),
});

export type InsertPlanChecklistItem = z.infer<typeof insertPlanChecklistItemSchema>;

export const insertChecklistItemPartSchema = z.object({
  checklistItemId: z.string(),
  name: z.string().min(1, "Part name is required"),
  quantity: z.number().default(1),
  unit: z.string().default("pcs"),
  notes: z.string().default(""),
  isTool: z.boolean().default(false),
});

export type InsertChecklistItemPart = z.infer<typeof insertChecklistItemPartSchema>;

export const insertVehiclePlanSchema = z.object({
  vehicleId: z.string(),
  planId: z.string(),
  activationDate: z.string(),
  odometerAtActivation: z.number().nullable().optional(),
  engineHoursAtActivation: z.number().nullable().optional(),
  timezone: z.string().default("UTC"),
  status: z.enum(["active", "paused"]).default("active"),
  metadata: z.any().default({}),
});

export type InsertVehiclePlan = z.infer<typeof insertVehiclePlanSchema>;

export const insertMaintenanceTaskSchema = z.object({
  vehiclePlanId: z.string(),
  checklistItemId: z.string().nullable().optional(),
  customTitle: z.string().nullable().optional(),
  notes: z.string().default(""),
  dueAt: z.date().or(z.string()),
  windowStart: z.date().or(z.string()).nullable().optional(),
  status: z.enum(["pending", "due", "snoozed", "completed", "dismissed"]).default("pending"),
  snoozedUntil: z.date().or(z.string()).nullable().optional(),
  triggerContext: z.any().default({}),
  hashId: z.string().nullable().optional(),
});

export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;

export const insertTaskEventSchema = z.object({
  taskId: z.string(),
  type: z.enum(["status_change", "notification_sent", "triggered"]),
  occurredAt: z.date().optional(),
  payload: z.any().default({}),
});

export type InsertTaskEvent = z.infer<typeof insertTaskEventSchema>;

export const insertNotificationPreferencesSchema = z.object({
  userId: z.string(),
  emailEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  timezone: z.string().default("UTC"),
  quietHours: z.any().default({}),
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// Tables
export const maintenancePlans = pgTable(
  "maintenance_plans",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    isTemplate: boolean("is_template").notNull().default(false),
    cadenceType: varchar("cadence_type", { length: 50 }).notNull(),
    cadenceConfig: jsonb("cadence_config").notNull().default('{}'),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("IDX_maintenance_plans_owner").on(table.ownerUserId),
    index("IDX_maintenance_plans_template").on(table.isTemplate),
  ],
);

export const planChecklistItems = pgTable(
  "plan_checklist_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    planId: varchar("plan_id").notNull().references(() => maintenancePlans.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
    defaultDueOffset: jsonb("default_due_offset").notNull().default('{}'),
    autoCompleteMatcher: jsonb("auto_complete_matcher").notNull().default('{}'),
    sequence: integer("sequence").notNull().default(0),
    isCritical: boolean("is_critical").notNull().default(false),
  },
  (table) => [
    index("IDX_plan_checklist_items_plan").on(table.planId),
  ],
);

export const checklistItemParts = pgTable(
  "checklist_item_parts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    checklistItemId: varchar("checklist_item_id").notNull().references(() => planChecklistItems.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit: varchar("unit", { length: 50 }).notNull().default("pcs"),
    notes: text("notes").notNull().default(""),
    isTool: boolean("is_tool").notNull().default(false),
  },
  (table) => [
    index("IDX_checklist_item_parts_item").on(table.checklistItemId),
  ],
);

export const vehiclePlans = pgTable(
  "vehicle_plans",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    planId: varchar("plan_id").notNull().references(() => maintenancePlans.id, { onDelete: "cascade" }),
    activationDate: varchar("activation_date", { length: 20 }).notNull(),
    odometerAtActivation: integer("odometer_at_activation"),
    engineHoursAtActivation: real("engine_hours_at_activation"),
    timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").notNull().default('{}'),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("IDX_vehicle_plans_vehicle_status").on(table.vehicleId, table.status)],
);

export const maintenanceTasks = pgTable(
  "maintenance_tasks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehiclePlanId: varchar("vehicle_plan_id").notNull().references(() => vehiclePlans.id, { onDelete: "cascade" }),
    checklistItemId: varchar("checklist_item_id").references(() => planChecklistItems.id, { onDelete: "set null" }),
    customTitle: varchar("custom_title", { length: 255 }),
    notes: text("notes").notNull().default(""),
    dueAt: timestamp("due_at").notNull(),
    windowStart: timestamp("window_start"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    snoozedUntil: timestamp("snoozed_until"),
    completedAt: timestamp("completed_at"),
    dismissedAt: timestamp("dismissed_at"),
    completionSource: varchar("completion_source", { length: 20 }),
    maintenanceLogId: varchar("maintenance_log_id").references(() => maintenanceLogs.id, { onDelete: "set null" }),
    lastNotificationAt: timestamp("last_notification_at"),
    triggerContext: jsonb("trigger_context").notNull().default('{}'),
    hashId: varchar("hash_id").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("IDX_maintenance_tasks_plan_status_due").on(table.vehiclePlanId, table.status, table.dueAt),
    index("IDX_maintenance_tasks_hash").on(table.hashId),
  ],
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    taskId: varchar("task_id").notNull().references(() => maintenanceTasks.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull().default('{}'),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [index("IDX_task_events_task_occurred").on(table.taskId, table.occurredAt)],
);

export const packingLists = pgTable("packing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehiclePlanId: varchar("vehicle_plan_id").notNull().references(() => vehiclePlans.id, { onDelete: "cascade" }),
  checklistItemId: varchar("checklist_item_id").references(() => planChecklistItems.id, { onDelete: "set null" }),
  source: varchar("source", { length: 20 }).notNull(),
  generatedForTrackdayId: varchar("generated_for_trackday_id").references(() => trackdays.id, { onDelete: "cascade" }),
  exportedAt: timestamp("exported_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  quietHours: jsonb("quiet_hours").notNull().default('{}'),
});

// ============= MARKETPLACE =============

export const MarketplaceCategory = {
  BIKE: "bike",
  PARTS_ENGINE: "parts_engine",
  PARTS_SUSPENSION: "parts_suspension",
  PARTS_BRAKES: "parts_brakes",
  PARTS_BODYWORK: "parts_bodywork",
  PARTS_ELECTRONICS: "parts_electronics",
  GEAR_HELMET: "gear_helmet",
  GEAR_SUIT: "gear_suit",
  GEAR_GLOVES: "gear_gloves",
  GEAR_BOOTS: "gear_boots",
  ACCESSORIES: "accessories",
  WANTED: "wanted",
} as const;

export const ItemCondition = {
  NEW: "new",
  LIKE_NEW: "like_new",
  GOOD: "good",
  FAIR: "fair",
  FOR_PARTS: "for_parts",
} as const;

export const ListingStatus = {
  ACTIVE: "active",
  SOLD: "sold",
  ARCHIVED: "archived",
} as const;

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerUserId: varchar("seller_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    condition: varchar("condition", { length: 20 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("CHF"),
    locationCity: varchar("location_city", { length: 100 }).notNull().default(""),
    locationCountry: varchar("location_country", { length: 100 }).notNull().default(""),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 50 }).notNull().default(""),
    description: text("description").notNull().default(""),
    images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  },
  (table) => [
    index("IDX_marketplace_listings_seller").on(table.sellerUserId),
    index("IDX_marketplace_listings_category_status").on(table.category, table.status),
    index("IDX_marketplace_listings_created").on(table.createdAt),
    index("IDX_marketplace_listings_price").on(table.priceCents),
  ],
);

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
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Marketplace Listings Schemas
export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
});

export const updateMarketplaceListingSchema = insertMarketplaceListingSchema.partial().extend({
  status: z.enum(["active", "sold", "archived"]).optional(),
});

export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type UpdateMarketplaceListing = z.infer<typeof updateMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
