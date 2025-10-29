import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

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
}

export const insertTrackSchema = z.object({
  name: z.string().min(1, "Track name is required"),
  country: z.string().min(1, "Country is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
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
  participationStatus: keyof typeof ParticipationStatus;
  // Computed/cached fields for route
  routeDistance?: number; // km
  routeDuration?: number; // minutes
  routeFuelCost?: number; // cents
  routeTollsCost?: number; // cents
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
  type: keyof typeof CostType;
  amountCents: number;
  currency: string;
  status: keyof typeof PaymentStatus;
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
  type: keyof typeof VehicleType;
  fuelType: keyof typeof FuelType;
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
  type: keyof typeof MaintenanceType;
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
  type: keyof typeof ScheduleBlockType;
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
