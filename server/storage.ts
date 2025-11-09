import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, inArray, sql as drizzleSql, gte, lte, or, ilike, desc, asc, count } from "drizzle-orm";
import type {
  Organizer, InsertOrganizer,
  Track, InsertTrack,
  Trackday, InsertTrackday,
  CostItem, InsertCostItem,
  Vehicle, InsertVehicle,
  MaintenanceLog, InsertMaintenanceLog,
  TrackdayScheduleBlock, InsertScheduleBlock,
  TrackSession, InsertTrackSession,
  Lap, InsertLap,
  Settings, InsertSettings,
  WeatherCache,
  User, UpsertUser,
  MaintenancePlan, InsertMaintenancePlan,
  PlanChecklistItem, InsertPlanChecklistItem,
  ChecklistItemPart, InsertChecklistItemPart,
  VehiclePlan, InsertVehiclePlan,
  MaintenanceTask, InsertMaintenanceTask,
  TaskEvent, InsertTaskEvent,
  NotificationPreferences, InsertNotificationPreferences,
  MotorcycleModel, InsertMotorcycleModel,
  MarketplaceListing, InsertMarketplaceListing, UpdateMarketplaceListing,
} from "@shared/schema";
import {
  organizers,
  tracks,
  trackdays,
  costItems,
  vehicles,
  maintenanceLogs,
  scheduleBlocks,
  trackSessions,
  laps,
  settings as settingsTable,
  weatherCache as weatherCacheTable,
  users,
  maintenancePlans,
  planChecklistItems,
  checklistItemParts,
  vehiclePlans,
  maintenanceTasks,
  taskEvents,
  notificationPreferences,
  motorcycleModels,
  marketplaceListings,
} from "@shared/schema";

export interface IStorage {
  // Organizers
  getOrganizers(): Promise<Organizer[]>;
  getOrganizer(id: string): Promise<Organizer | undefined>;
  createOrganizer(data: InsertOrganizer): Promise<Organizer>;
  updateOrganizer(id: string, data: InsertOrganizer): Promise<Organizer | undefined>;
  deleteOrganizer(id: string): Promise<boolean>;

  // Tracks
  getTracks(): Promise<Track[]>;
  getTrack(id: string): Promise<Track | undefined>;
  createTrack(data: InsertTrack): Promise<Track>;
  updateTrack(id: string, data: InsertTrack): Promise<Track | undefined>;
  deleteTrack(id: string): Promise<boolean>;

  // Trackdays
  getTrackdays(filters?: { year?: string; participationStatus?: string }): Promise<Trackday[]>;
  getTrackday(id: string): Promise<Trackday | undefined>;
  getUpcomingTrackdays(limit?: number): Promise<Trackday[]>;
  createTrackday(data: InsertTrackday): Promise<Trackday>;
  updateTrackday(id: string, data: Partial<Trackday>): Promise<Trackday | undefined>;
  deleteTrackday(id: string): Promise<boolean>;

  // Cost Items
  getCostItems(trackdayId?: string): Promise<CostItem[]>;
  getCostItem(id: string): Promise<CostItem | undefined>;
  createCostItem(data: InsertCostItem): Promise<CostItem>;
  updateCostItem(id: string, data: Partial<InsertCostItem>): Promise<CostItem | undefined>;
  deleteCostItem(id: string): Promise<boolean>;

  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehiclesByUserId(userId: string): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  createVehicle(data: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: InsertVehicle): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;

  // Maintenance Logs
  getMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLog[]>;
  createMaintenanceLog(data: InsertMaintenanceLog): Promise<MaintenanceLog>;

  // Schedule Blocks
  getScheduleBlocks(trackdayId: string): Promise<TrackdayScheduleBlock[]>;
  createScheduleBlock(data: InsertScheduleBlock): Promise<TrackdayScheduleBlock>;

  // Track Sessions
  getTrackSessions(trackdayId: string): Promise<TrackSession[]>;
  createTrackSession(data: InsertTrackSession): Promise<TrackSession>;

  // Laps
  getLaps(sessionId: string): Promise<Lap[]>;
  createLap(data: InsertLap): Promise<Lap>;

  // Settings (Singleton)
  getSettings(): Promise<Settings>;
  updateSettings(data: InsertSettings): Promise<Settings>;

  // Weather Cache
  getWeatherCache(trackdayId: string): Promise<WeatherCache | undefined>;
  setWeatherCache(data: WeatherCache): Promise<WeatherCache>;

  // Users (Replit Auth integration)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  toggleUserAdmin(id: string, isAdmin: boolean): Promise<User>;

  // Maintenance Plans
  getMaintenancePlans(filters?: { isTemplate?: boolean; ownerUserId?: string }): Promise<MaintenancePlan[]>;
  getMaintenancePlan(id: string): Promise<MaintenancePlan | undefined>;
  createMaintenancePlan(data: InsertMaintenancePlan): Promise<MaintenancePlan>;
  updateMaintenancePlan(id: string, data: Partial<InsertMaintenancePlan>): Promise<MaintenancePlan | undefined>;
  deleteMaintenancePlan(id: string): Promise<boolean>;

  // Plan Checklist Items
  getPlanChecklistItems(planId: string): Promise<PlanChecklistItem[]>;
  createPlanChecklistItem(data: InsertPlanChecklistItem): Promise<PlanChecklistItem>;
  updatePlanChecklistItem(id: string, data: Partial<InsertPlanChecklistItem>): Promise<PlanChecklistItem | undefined>;
  deletePlanChecklistItem(id: string): Promise<boolean>;

  // Checklist Item Parts
  getChecklistItemParts(checklistItemId: string): Promise<ChecklistItemPart[]>;
  createChecklistItemPart(data: InsertChecklistItemPart): Promise<ChecklistItemPart>;
  deleteChecklistItemPart(id: string): Promise<boolean>;

  // Vehicle Plans
  getVehiclePlans(filters?: { vehicleId?: string; status?: string }): Promise<VehiclePlan[]>;
  getVehiclePlan(id: string): Promise<VehiclePlan | undefined>;
  createVehiclePlan(data: InsertVehiclePlan): Promise<VehiclePlan>;
  updateVehiclePlan(id: string, data: Partial<InsertVehiclePlan>): Promise<VehiclePlan | undefined>;
  deleteVehiclePlan(id: string): Promise<boolean>;

  // Maintenance Tasks
  getMaintenanceTasks(filters?: { vehiclePlanId?: string; status?: string; vehicleId?: string }): Promise<MaintenanceTask[]>;
  getMaintenanceTask(id: string): Promise<MaintenanceTask | undefined>;
  createMaintenanceTask(data: InsertMaintenanceTask): Promise<MaintenanceTask>;
  updateMaintenanceTask(id: string, data: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined>;
  deleteMaintenanceTask(id: string): Promise<boolean>;
  snoozeTask(id: string, snoozedUntil: Date): Promise<MaintenanceTask | undefined>;
  completeTask(id: string, completionSource: string, maintenanceLogId?: string): Promise<MaintenanceTask | undefined>;
  dismissTask(id: string): Promise<MaintenanceTask | undefined>;

  // Task Events
  createTaskEvent(data: InsertTaskEvent): Promise<TaskEvent>;
  getTaskEvents(taskId: string): Promise<TaskEvent[]>;
  getTaskEventsByTaskIds(taskIds: string[]): Promise<Map<string, TaskEvent[]>>;

  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(data: InsertNotificationPreferences): Promise<NotificationPreferences>;

  // Motorcycle Models
  getMotorcycleModels(filters?: { isActive?: boolean }): Promise<MotorcycleModel[]>;
  getMotorcycleModel(id: string): Promise<MotorcycleModel | undefined>;
  createMotorcycleModel(data: InsertMotorcycleModel): Promise<MotorcycleModel>;
  updateMotorcycleModel(id: string, data: Partial<InsertMotorcycleModel>): Promise<MotorcycleModel | undefined>;
  deleteMotorcycleModel(id: string): Promise<boolean>;

  // Bulk operations for admin data management
  bulkReplaceMotorcycleModels(models: InsertMotorcycleModel[]): Promise<void>;
  bulkReplaceTracks(tracks: InsertTrack[]): Promise<void>;
  bulkReplaceOrganizers(organizers: InsertOrganizer[]): Promise<void>;

  // Marketplace Listings
  getMarketplaceListings(filters?: {
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc";
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: MarketplaceListing[];
    total: number;
    nextCursor?: string | null;
  }>;
  getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined>;
  createMarketplaceListing(data: InsertMarketplaceListing, sellerId: string): Promise<MarketplaceListing>;
  updateMarketplaceListing(id: string, data: Partial<UpdateMarketplaceListing>, actorId: string): Promise<MarketplaceListing | undefined>;
  deleteMarketplaceListing(id: string, actorId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private organizers: Map<string, Organizer> = new Map();
  private tracks: Map<string, Track> = new Map();
  private trackdays: Map<string, Trackday> = new Map();
  private costItems: Map<string, CostItem> = new Map();
  private vehicles: Map<string, Vehicle> = new Map();
  private maintenanceLogs: Map<string, MaintenanceLog> = new Map();
  private scheduleBlocks: Map<string, TrackdayScheduleBlock> = new Map();
  private trackSessions: Map<string, TrackSession> = new Map();
  private laps: Map<string, Lap> = new Map();
  private settings: Settings;
  private weatherCache: Map<string, WeatherCache> = new Map();

  constructor() {
    // Initialize with default settings
    this.settings = {
      id: "default",
      currency: "CHF",
      homeLat: 47.3769,
      homeLng: 8.5417,
      fuelPricePerLitre: 1.90,
      tollsPerKm: 0.05,
      annualBudgetCents: 500000, // CHF 5000
      openRouteServiceKey: "",
      openWeatherApiKey: "",
      googleMapsApiKey: "",
    };

    // Seed initial data
    this.seedData();
  }

  private seedData() {
    // Seed 3 tracks
    const tracks = [
      { name: "Spa-Francorchamps", country: "Belgium", lat: 50.4372, lng: 5.9714, organizerId: null, organizerName: "", organizerWebsite: "" },
      { name: "Nürburgring", country: "Germany", lat: 50.3356, lng: 6.9475, organizerId: null, organizerName: "", organizerWebsite: "" },
      { name: "Hockenheimring", country: "Germany", lat: 49.3278, lng: 8.5658, organizerId: null, organizerName: "", organizerWebsite: "" },
    ];
    tracks.forEach(t => {
      const id = randomUUID();
      this.tracks.set(id, { ...t, id });
    });

    // Seed 1 vehicle
    const vehicle = {
      name: "Yamaha R1",
      type: "motorcycle" as const,
      fuelType: "gasoline" as const,
      consumptionPer100: 6.5,
      notes: "Track bike with racing setup",
    };
    const vehicleId = randomUUID();
    this.vehicles.set(vehicleId, { ...vehicle, id: vehicleId });

    // Seed 2 trackdays
    const trackIds = Array.from(this.tracks.keys());
    const trackday1 = {
      trackId: trackIds[0],
      date: "2025-05-15",
      durationDays: 2,
      vehicleId,
      notes: "Two-day advanced session",
      participationStatus: "registered" as const,
    };
    const trackday1Id = randomUUID();
    this.trackdays.set(trackday1Id, { ...trackday1, id: trackday1Id });

    const trackday2 = {
      trackId: trackIds[1],
      date: "2025-06-20",
      durationDays: 1,
      vehicleId,
      notes: "Single day track session",
      participationStatus: "planned" as const,
    };
    const trackday2Id = randomUUID();
    this.trackdays.set(trackday2Id, { ...trackday2, id: trackday2Id });

    // Seed cost items for trackday1
    const costItem1 = {
      trackdayId: trackday1Id,
      type: "entry" as const,
      amountCents: 45000, // CHF 450
      currency: "CHF",
      status: "paid" as const,
      dueDate: null,
      paidAt: "2025-04-01",
      notes: "Early bird registration",
      isTravelAuto: false,
    };
    this.costItems.set(randomUUID(), { ...costItem1, id: randomUUID() });
  }

  // ========== ORGANIZERS ==========
  async getOrganizers(): Promise<Organizer[]> {
    return Array.from(this.organizers.values());
  }

  async getOrganizer(id: string): Promise<Organizer | undefined> {
    return this.organizers.get(id);
  }

  async createOrganizer(data: InsertOrganizer): Promise<Organizer> {
    const id = randomUUID();
    const organizer: Organizer = { ...data, id };
    this.organizers.set(id, organizer);
    return organizer;
  }

  async updateOrganizer(id: string, data: InsertOrganizer): Promise<Organizer | undefined> {
    if (!this.organizers.has(id)) return undefined;
    const organizer: Organizer = { ...data, id };
    this.organizers.set(id, organizer);
    return organizer;
  }

  async deleteOrganizer(id: string): Promise<boolean> {
    return this.organizers.delete(id);
  }

  // ========== TRACKS ==========
  async getTracks(): Promise<Track[]> {
    return Array.from(this.tracks.values());
  }

  async getTrack(id: string): Promise<Track | undefined> {
    return this.tracks.get(id);
  }

  async createTrack(data: InsertTrack): Promise<Track> {
    const id = randomUUID();
    const track: Track = { ...data, id };
    this.tracks.set(id, track);
    return track;
  }

  async updateTrack(id: string, data: InsertTrack): Promise<Track | undefined> {
    if (!this.tracks.has(id)) return undefined;
    const track: Track = { ...data, id };
    this.tracks.set(id, track);
    return track;
  }

  async deleteTrack(id: string): Promise<boolean> {
    return this.tracks.delete(id);
  }

  // ========== TRACKDAYS ==========
  async getTrackdays(filters?: { year?: string; participationStatus?: string }): Promise<Trackday[]> {
    let trackdays = Array.from(this.trackdays.values());
    
    if (filters?.year && filters.year !== "all") {
      trackdays = trackdays.filter(td => td.date.startsWith(filters.year!));
    }
    
    if (filters?.participationStatus && filters.participationStatus !== "all") {
      trackdays = trackdays.filter(td => td.participationStatus === filters.participationStatus);
    }
    
    return trackdays.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTrackday(id: string): Promise<Trackday | undefined> {
    return this.trackdays.get(id);
  }

  async getUpcomingTrackdays(limit: number = 5): Promise<Trackday[]> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.trackdays.values())
      .filter(td => td.date >= today && td.participationStatus !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  async createTrackday(data: InsertTrackday): Promise<Trackday> {
    const id = randomUUID();
    const trackday: Trackday = { ...data, id };
    this.trackdays.set(id, trackday);
    return trackday;
  }

  async updateTrackday(id: string, data: Partial<Trackday>): Promise<Trackday | undefined> {
    const existing = this.trackdays.get(id);
    if (!existing) return undefined;
    const trackday = { ...existing, ...data, id };
    this.trackdays.set(id, trackday);
    return trackday;
  }

  async deleteTrackday(id: string): Promise<boolean> {
    // Also delete related cost items, schedule blocks, sessions
    Array.from(this.costItems.entries()).forEach(([key, item]) => {
      if (item.trackdayId === id) this.costItems.delete(key);
    });
    Array.from(this.scheduleBlocks.entries()).forEach(([key, block]) => {
      if (block.trackdayId === id) this.scheduleBlocks.delete(key);
    });
    Array.from(this.trackSessions.entries()).forEach(([key, session]) => {
      if (session.trackdayId === id) {
        // Delete laps for this session
        Array.from(this.laps.entries()).forEach(([lapKey, lap]) => {
          if (lap.sessionId === key) this.laps.delete(lapKey);
        });
        this.trackSessions.delete(key);
      }
    });
    return this.trackdays.delete(id);
  }

  // ========== COST ITEMS ==========
  async getCostItems(trackdayId?: string): Promise<CostItem[]> {
    const items = Array.from(this.costItems.values());
    if (trackdayId) {
      return items.filter(item => item.trackdayId === trackdayId);
    }
    return items;
  }

  async getCostItem(id: string): Promise<CostItem | undefined> {
    return this.costItems.get(id);
  }

  async createCostItem(data: InsertCostItem): Promise<CostItem> {
    const id = randomUUID();
    const costItem: CostItem = { ...data, id };
    this.costItems.set(id, costItem);
    return costItem;
  }

  async updateCostItem(id: string, data: Partial<InsertCostItem>): Promise<CostItem | undefined> {
    const existing = this.costItems.get(id);
    if (!existing) return undefined;
    const costItem = { ...existing, ...data, id };
    this.costItems.set(id, costItem);
    return costItem;
  }

  async deleteCostItem(id: string): Promise<boolean> {
    return this.costItems.delete(id);
  }

  // ========== VEHICLES ==========
  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async getVehiclesByUserId(userId: string): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(v => v.userId === userId);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async createVehicle(data: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const vehicle: Vehicle = { ...data, id };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: string, data: InsertVehicle): Promise<Vehicle | undefined> {
    if (!this.vehicles.has(id)) return undefined;
    const vehicle: Vehicle = { ...data, id };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    return this.vehicles.delete(id);
  }

  // ========== MAINTENANCE LOGS ==========
  async getMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLog[]> {
    const logs = Array.from(this.maintenanceLogs.values());
    if (vehicleId) {
      return logs.filter(log => log.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
    }
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  async createMaintenanceLog(data: InsertMaintenanceLog): Promise<MaintenanceLog> {
    const id = randomUUID();
    const log: MaintenanceLog = { ...data, id };
    this.maintenanceLogs.set(id, log);
    return log;
  }

  // ========== SCHEDULE BLOCKS ==========
  async getScheduleBlocks(trackdayId: string): Promise<TrackdayScheduleBlock[]> {
    return Array.from(this.scheduleBlocks.values())
      .filter(block => block.trackdayId === trackdayId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async createScheduleBlock(data: InsertScheduleBlock): Promise<TrackdayScheduleBlock> {
    const id = randomUUID();
    const block: TrackdayScheduleBlock = { ...data, id };
    this.scheduleBlocks.set(id, block);
    return block;
  }

  // ========== TRACK SESSIONS ==========
  async getTrackSessions(trackdayId: string): Promise<TrackSession[]> {
    return Array.from(this.trackSessions.values())
      .filter(session => session.trackdayId === trackdayId)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }

  async createTrackSession(data: InsertTrackSession): Promise<TrackSession> {
    const id = randomUUID();
    const session: TrackSession = { ...data, id };
    this.trackSessions.set(id, session);
    return session;
  }

  // ========== LAPS ==========
  async getLaps(sessionId: string): Promise<Lap[]> {
    return Array.from(this.laps.values())
      .filter(lap => lap.sessionId === sessionId)
      .sort((a, b) => a.lapNumber - b.lapNumber);
  }

  async createLap(data: InsertLap): Promise<Lap> {
    const id = randomUUID();
    const lap: Lap = { ...data, id };
    this.laps.set(id, lap);
    
    // Update session best lap if this is better
    const session = this.trackSessions.get(data.sessionId);
    if (session && data.valid) {
      if (!session.bestLapMs || data.lapTimeMs < session.bestLapMs) {
        session.bestLapMs = data.lapTimeMs;
        this.trackSessions.set(data.sessionId, session);
      }
    }
    
    return lap;
  }

  // ========== SETTINGS ==========
  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(data: InsertSettings): Promise<Settings> {
    this.settings = { ...this.settings, ...data };
    return this.settings;
  }

  // ========== WEATHER CACHE ==========
  async getWeatherCache(trackdayId: string): Promise<WeatherCache | undefined> {
    return this.weatherCache.get(trackdayId);
  }

  async setWeatherCache(data: WeatherCache): Promise<WeatherCache> {
    this.weatherCache.set(data.trackdayId, data);
    return data;
  }

  // ========== USERS (Replit Auth integration) ==========
  async getUser(id: string): Promise<User | undefined> {
    throw new Error("User operations not implemented in MemStorage");
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    throw new Error("User operations not implemented in MemStorage");
  }

  async getAllUsers(): Promise<User[]> {
    throw new Error("User operations not implemented in MemStorage");
  }

  async toggleUserAdmin(id: string, isAdmin: boolean): Promise<User> {
    throw new Error("User operations not implemented in MemStorage");
  }
}

// PostgreSQL Storage Implementation using Drizzle ORM
export class DbStorage implements IStorage {
  private db;
  private initPromise: Promise<void>;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
    this.initPromise = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure default settings exist
      const existingSettings = await this.db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
      if (existingSettings.length === 0) {
        await this.db.insert(settingsTable).values({
          id: "default",
          currency: "CHF",
          homeLat: 47.3769,
          homeLng: 8.5417,
          fuelPricePerLitre: 1.90,
          tollsPerKm: 0.05,
          annualBudgetCents: 500000,
          openRouteServiceKey: "",
          openWeatherApiKey: "",
        });
      }

      // Seed initial data if database is empty
      const existingTracks = await this.db.select().from(tracks);
      if (existingTracks.length === 0) {
        await this.seedData();
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private async seedData() {
    // Seed 3 tracks
    const trackData = [
      { name: "Spa-Francorchamps", country: "Belgium", lat: 50.4372, lng: 5.9714 },
      { name: "Nürburgring", country: "Germany", lat: 50.3356, lng: 6.9475 },
      { name: "Hockenheimring", country: "Germany", lat: 49.3278, lng: 8.5658 },
    ];
    const createdTracks = await this.db.insert(tracks).values(trackData).returning();

    // Seed 1 vehicle
    const vehicleData = {
      name: "Yamaha R1",
      type: "motorcycle",
      fuelType: "gasoline",
      consumptionPer100: 6.5,
      notes: "Track bike with racing setup",
    };
    const createdVehicles = await this.db.insert(vehicles).values(vehicleData).returning();

    // Seed 2 trackdays
    const trackdayData = [
      {
        trackId: createdTracks[0].id,
        date: "2025-05-15",
        durationDays: 2,
        vehicleId: createdVehicles[0].id,
        notes: "Two-day advanced session",
        participationStatus: "registered",
      },
      {
        trackId: createdTracks[1].id,
        date: "2025-06-20",
        durationDays: 1,
        vehicleId: createdVehicles[0].id,
        notes: "Single day track session",
        participationStatus: "planned",
      },
    ];
    const createdTrackdays = await this.db.insert(trackdays).values(trackdayData).returning();

    // Seed cost item for first trackday
    await this.db.insert(costItems).values({
      trackdayId: createdTrackdays[0].id,
      type: "entry",
      amountCents: 45000,
      currency: "CHF",
      status: "paid",
      paidAt: "2025-04-01",
      notes: "Early bird registration",
      isTravelAuto: false,
    });
  }

  // ========== ORGANIZERS ==========
  async getOrganizers(): Promise<Organizer[]> {
    await this.ensureInitialized();
    return await this.db.select().from(organizers);
  }

  async getOrganizer(id: string): Promise<Organizer | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(organizers).where(eq(organizers.id, id));
    return result[0];
  }

  async createOrganizer(data: InsertOrganizer): Promise<Organizer> {
    await this.ensureInitialized();
    const result = await this.db.insert(organizers).values(data).returning();
    return result[0];
  }

  async updateOrganizer(id: string, data: InsertOrganizer): Promise<Organizer | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(organizers).set(data).where(eq(organizers.id, id)).returning();
    return result[0];
  }

  async deleteOrganizer(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(organizers).where(eq(organizers.id, id));
    return true;
  }

  // ========== TRACKS ==========
  async getTracks(): Promise<Track[]> {
    await this.ensureInitialized();
    return await this.db.select().from(tracks);
  }

  async getTrack(id: string): Promise<Track | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(tracks).where(eq(tracks.id, id));
    return result[0];
  }

  async createTrack(data: InsertTrack): Promise<Track> {
    await this.ensureInitialized();
    const result = await this.db.insert(tracks).values(data).returning();
    return result[0];
  }

  async updateTrack(id: string, data: InsertTrack): Promise<Track | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(tracks).set(data).where(eq(tracks.id, id)).returning();
    return result[0];
  }

  async deleteTrack(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(tracks).where(eq(tracks.id, id));
    return true;
  }

  // ========== TRACKDAYS ==========
  async getTrackdays(filters?: { year?: string; participationStatus?: string }): Promise<Trackday[]> {
    await this.ensureInitialized();
    let query = this.db.select().from(trackdays);
    
    const conditions = [];
    if (filters?.year && filters.year !== "all") {
      conditions.push(drizzleSql`${trackdays.date} LIKE ${filters.year + '%'}`);
    }
    if (filters?.participationStatus && filters.participationStatus !== "all") {
      conditions.push(eq(trackdays.participationStatus, filters.participationStatus));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query;
    return result.sort((a, b) => b.date.localeCompare(a.date)) as Trackday[];
  }

  async getTrackday(id: string): Promise<Trackday | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(trackdays).where(eq(trackdays.id, id));
    return result[0] as Trackday | undefined;
  }

  async getUpcomingTrackdays(limit: number = 5): Promise<Trackday[]> {
    await this.ensureInitialized();
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db
      .select()
      .from(trackdays)
      .where(
        and(
          drizzleSql`${trackdays.date} >= ${today}`,
          drizzleSql`${trackdays.participationStatus} != 'cancelled'`
        )
      )
      .limit(limit);
    return result.sort((a, b) => a.date.localeCompare(b.date)) as Trackday[];
  }

  async createTrackday(data: InsertTrackday): Promise<Trackday> {
    await this.ensureInitialized();
    const result = await this.db.insert(trackdays).values(data).returning();
    return result[0] as Trackday;
  }

  async updateTrackday(id: string, data: Partial<Trackday>): Promise<Trackday | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(trackdays).set(data).where(eq(trackdays.id, id)).returning();
    return result[0] as Trackday | undefined;
  }

  async deleteTrackday(id: string): Promise<boolean> {
    await this.ensureInitialized();
    // Cascading deletes handled by database foreign key constraints
    await this.db.delete(trackdays).where(eq(trackdays.id, id));
    return true;
  }

  // ========== COST ITEMS ==========
  async getCostItems(trackdayId?: string): Promise<CostItem[]> {
    await this.ensureInitialized();
    if (trackdayId) {
      return await this.db.select().from(costItems).where(eq(costItems.trackdayId, trackdayId)) as CostItem[];
    }
    return await this.db.select().from(costItems) as CostItem[];
  }

  async getCostItem(id: string): Promise<CostItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(costItems).where(eq(costItems.id, id));
    return result[0] as CostItem | undefined;
  }

  async createCostItem(data: InsertCostItem): Promise<CostItem> {
    await this.ensureInitialized();
    const result = await this.db.insert(costItems).values(data).returning();
    return result[0] as CostItem;
  }

  async updateCostItem(id: string, data: Partial<InsertCostItem>): Promise<CostItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(costItems).set(data).where(eq(costItems.id, id)).returning();
    return result[0] as CostItem | undefined;
  }

  async deleteCostItem(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(costItems).where(eq(costItems.id, id));
    return true;
  }

  // ========== VEHICLES ==========
  async getVehicles(): Promise<Vehicle[]> {
    await this.ensureInitialized();
    return await this.db.select().from(vehicles) as Vehicle[];
  }

  async getVehiclesByUserId(userId: string): Promise<Vehicle[]> {
    await this.ensureInitialized();
    return await this.db.select().from(vehicles).where(eq(vehicles.userId, userId)) as Vehicle[];
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(vehicles).where(eq(vehicles.id, id));
    return result[0] as Vehicle | undefined;
  }

  async createVehicle(data: InsertVehicle): Promise<Vehicle> {
    await this.ensureInitialized();
    const result = await this.db.insert(vehicles).values(data).returning();
    return result[0] as Vehicle;
  }

  async updateVehicle(id: string, data: InsertVehicle): Promise<Vehicle | undefined> {
    await this.ensureInitialized();
    const result = await this.db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
    return result[0] as Vehicle | undefined;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.db.delete(vehicles).where(eq(vehicles.id, id));
    return true;
  }

  // ========== MAINTENANCE LOGS ==========
  async getMaintenanceLogs(vehicleId?: string): Promise<MaintenanceLog[]> {
    await this.ensureInitialized();
    if (vehicleId) {
      const result = await this.db.select().from(maintenanceLogs).where(eq(maintenanceLogs.vehicleId, vehicleId));
      return result.sort((a, b) => b.date.localeCompare(a.date)) as MaintenanceLog[];
    }
    const result = await this.db.select().from(maintenanceLogs);
    return result.sort((a, b) => b.date.localeCompare(a.date)) as MaintenanceLog[];
  }

  async createMaintenanceLog(data: InsertMaintenanceLog): Promise<MaintenanceLog> {
    await this.ensureInitialized();
    const result = await this.db.insert(maintenanceLogs).values(data).returning();
    return result[0] as MaintenanceLog;
  }

  // ========== SCHEDULE BLOCKS ==========
  async getScheduleBlocks(trackdayId: string): Promise<TrackdayScheduleBlock[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(scheduleBlocks).where(eq(scheduleBlocks.trackdayId, trackdayId));
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime)) as TrackdayScheduleBlock[];
  }

  async createScheduleBlock(data: InsertScheduleBlock): Promise<TrackdayScheduleBlock> {
    await this.ensureInitialized();
    const result = await this.db.insert(scheduleBlocks).values(data).returning();
    return result[0] as TrackdayScheduleBlock;
  }

  // ========== TRACK SESSIONS ==========
  async getTrackSessions(trackdayId: string): Promise<TrackSession[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(trackSessions).where(eq(trackSessions.trackdayId, trackdayId));
    return result.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }

  async createTrackSession(data: InsertTrackSession): Promise<TrackSession> {
    await this.ensureInitialized();
    const result = await this.db.insert(trackSessions).values(data).returning();
    return result[0];
  }

  // ========== LAPS ==========
  async getLaps(sessionId: string): Promise<Lap[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(laps).where(eq(laps.sessionId, sessionId));
    return result.sort((a, b) => a.lapNumber - b.lapNumber);
  }

  async createLap(data: InsertLap): Promise<Lap> {
    await this.ensureInitialized();
    const result = await this.db.insert(laps).values(data).returning();
    const lap = result[0];
    
    // Update session best lap if this is better
    if (data.valid) {
      const session = await this.db.select().from(trackSessions).where(eq(trackSessions.id, data.sessionId));
      if (session[0]) {
        if (!session[0].bestLapMs || data.lapTimeMs < session[0].bestLapMs) {
          await this.db.update(trackSessions)
            .set({ bestLapMs: data.lapTimeMs })
            .where(eq(trackSessions.id, data.sessionId));
        }
      }
    }
    
    return lap;
  }

  // ========== SETTINGS ==========
  async getSettings(): Promise<Settings> {
    await this.ensureInitialized();
    const result = await this.db.select().from(settingsTable).where(eq(settingsTable.id, "default"));
    return result[0];
  }

  async updateSettings(data: InsertSettings): Promise<Settings> {
    await this.ensureInitialized();
    const result = await this.db.update(settingsTable)
      .set(data)
      .where(eq(settingsTable.id, "default"))
      .returning();
    return result[0];
  }

  // ========== WEATHER CACHE ==========
  async getWeatherCache(trackdayId: string): Promise<WeatherCache | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(weatherCacheTable).where(eq(weatherCacheTable.trackdayId, trackdayId));
    return result[0];
  }

  async setWeatherCache(data: WeatherCache): Promise<WeatherCache> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(weatherCacheTable)
      .values(data)
      .onConflictDoUpdate({
        target: weatherCacheTable.trackdayId,
        set: data,
      })
      .returning();
    return result[0];
  }

  // ========== USERS (Replit Auth integration) ==========
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    await this.ensureInitialized();
    const { id, ...updateData } = userData;
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await this.db.select().from(users);
  }

  async toggleUserAdmin(id: string, isAdmin: boolean): Promise<User> {
    await this.ensureInitialized();
    const [user] = await this.db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ========== MAINTENANCE PLANS ==========
  async getMaintenancePlans(filters?: { isTemplate?: boolean; ownerUserId?: string }): Promise<MaintenancePlan[]> {
    await this.ensureInitialized();
    let query = this.db.select().from(maintenancePlans);
    
    if (filters?.isTemplate !== undefined) {
      query = query.where(eq(maintenancePlans.isTemplate, filters.isTemplate)) as any;
    }
    if (filters?.ownerUserId) {
      query = query.where(eq(maintenancePlans.ownerUserId, filters.ownerUserId)) as any;
    }
    
    return (await query) as MaintenancePlan[];
  }

  async getMaintenancePlan(id: string): Promise<MaintenancePlan | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(maintenancePlans).where(eq(maintenancePlans.id, id));
    return result[0] as MaintenancePlan | undefined;
  }

  async createMaintenancePlan(data: InsertMaintenancePlan): Promise<MaintenancePlan> {
    await this.ensureInitialized();
    const result = await this.db.insert(maintenancePlans).values(data).returning();
    return result[0] as MaintenancePlan;
  }

  async updateMaintenancePlan(id: string, data: Partial<InsertMaintenancePlan>): Promise<MaintenancePlan | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(maintenancePlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenancePlans.id, id))
      .returning();
    return result[0] as MaintenancePlan | undefined;
  }

  async deleteMaintenancePlan(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(maintenancePlans).where(eq(maintenancePlans.id, id));
    return (result as any).rowCount > 0;
  }

  // ========== PLAN CHECKLIST ITEMS ==========
  async getPlanChecklistItems(planId: string): Promise<PlanChecklistItem[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(planChecklistItems).where(eq(planChecklistItems.planId, planId));
    return result.sort((a, b) => a.sequence - b.sequence) as PlanChecklistItem[];
  }

  async createPlanChecklistItem(data: InsertPlanChecklistItem): Promise<PlanChecklistItem> {
    await this.ensureInitialized();
    const result = await this.db.insert(planChecklistItems).values(data).returning();
    return result[0] as PlanChecklistItem;
  }

  async updatePlanChecklistItem(id: string, data: Partial<InsertPlanChecklistItem>): Promise<PlanChecklistItem | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(planChecklistItems)
      .set(data)
      .where(eq(planChecklistItems.id, id))
      .returning();
    return result[0] as PlanChecklistItem | undefined;
  }

  async deletePlanChecklistItem(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(planChecklistItems).where(eq(planChecklistItems.id, id));
    return (result as any).rowCount > 0;
  }

  // ========== CHECKLIST ITEM PARTS ==========
  async getChecklistItemParts(checklistItemId: string): Promise<ChecklistItemPart[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(checklistItemParts).where(eq(checklistItemParts.checklistItemId, checklistItemId));
    return result as ChecklistItemPart[];
  }

  async createChecklistItemPart(data: InsertChecklistItemPart): Promise<ChecklistItemPart> {
    await this.ensureInitialized();
    const result = await this.db.insert(checklistItemParts).values(data).returning();
    return result[0] as ChecklistItemPart;
  }

  async deleteChecklistItemPart(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(checklistItemParts).where(eq(checklistItemParts.id, id));
    return (result as any).rowCount > 0;
  }

  // ========== VEHICLE PLANS ==========
  async getVehiclePlans(filters?: { vehicleId?: string; status?: string }): Promise<VehiclePlan[]> {
    await this.ensureInitialized();
    let query = this.db.select().from(vehiclePlans);
    
    if (filters?.vehicleId) {
      query = query.where(eq(vehiclePlans.vehicleId, filters.vehicleId)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(vehiclePlans.status, filters.status)) as any;
    }
    
    return (await query) as VehiclePlan[];
  }

  async getVehiclePlan(id: string): Promise<VehiclePlan | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(vehiclePlans).where(eq(vehiclePlans.id, id));
    return result[0] as VehiclePlan | undefined;
  }

  async createVehiclePlan(data: InsertVehiclePlan): Promise<VehiclePlan> {
    await this.ensureInitialized();
    const result = await this.db.insert(vehiclePlans).values(data).returning();
    return result[0] as VehiclePlan;
  }

  async updateVehiclePlan(id: string, data: Partial<InsertVehiclePlan>): Promise<VehiclePlan | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(vehiclePlans)
      .set(data)
      .where(eq(vehiclePlans.id, id))
      .returning();
    return result[0] as VehiclePlan | undefined;
  }

  async deleteVehiclePlan(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(vehiclePlans).where(eq(vehiclePlans.id, id));
    return (result as any).rowCount > 0;
  }

  // ========== MAINTENANCE TASKS ==========
  async getMaintenanceTasks(filters?: { vehiclePlanId?: string; status?: string; vehicleId?: string }): Promise<MaintenanceTask[]> {
    await this.ensureInitialized();
    
    if (filters?.vehicleId) {
      const plans = await this.db.select().from(vehiclePlans).where(eq(vehiclePlans.vehicleId, filters.vehicleId));
      const vehiclePlanIds = plans.map(vp => vp.id);
      
      if (vehiclePlanIds.length === 0) {
        return [];
      }
      
      const tasks = await this.db.select().from(maintenanceTasks).where(inArray(maintenanceTasks.vehiclePlanId, vehiclePlanIds));
      
      let filtered = tasks;
      if (filters?.status) {
        filtered = tasks.filter(t => t.status === filters.status);
      }
      
      return filtered.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) as MaintenanceTask[];
    }
    
    let query = this.db.select().from(maintenanceTasks);
    
    if (filters?.vehiclePlanId) {
      query = query.where(eq(maintenanceTasks.vehiclePlanId, filters.vehiclePlanId)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(maintenanceTasks.status, filters.status)) as any;
    }
    
    return (await query).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) as MaintenanceTask[];
  }

  async getMaintenanceTask(id: string): Promise<MaintenanceTask | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, id));
    return result[0] as MaintenanceTask | undefined;
  }

  async createMaintenanceTask(data: InsertMaintenanceTask): Promise<MaintenanceTask> {
    await this.ensureInitialized();
    const result = await this.db.insert(maintenanceTasks).values(data).returning();
    return result[0] as MaintenanceTask;
  }

  async updateMaintenanceTask(id: string, data: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(maintenanceTasks)
      .set(data)
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return result[0] as MaintenanceTask | undefined;
  }

  async deleteMaintenanceTask(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, id));
    return (result as any).rowCount > 0;
  }

  async snoozeTask(id: string, snoozedUntil: Date): Promise<MaintenanceTask | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(maintenanceTasks)
      .set({ 
        status: "snoozed",
        snoozedUntil,
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return result[0] as MaintenanceTask | undefined;
  }

  async completeTask(id: string, completionSource: string, maintenanceLogId?: string): Promise<MaintenanceTask | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(maintenanceTasks)
      .set({ 
        status: "completed",
        completedAt: new Date(),
        completionSource,
        maintenanceLogId,
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return result[0] as MaintenanceTask | undefined;
  }

  async dismissTask(id: string): Promise<MaintenanceTask | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(maintenanceTasks)
      .set({ 
        status: "dismissed",
        dismissedAt: new Date(),
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return result[0] as MaintenanceTask | undefined;
  }

  // ========== TASK EVENTS ==========
  async createTaskEvent(data: InsertTaskEvent): Promise<TaskEvent> {
    await this.ensureInitialized();
    const result = await this.db.insert(taskEvents).values(data).returning();
    return result[0] as TaskEvent;
  }

  async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
    await this.ensureInitialized();
    const result = await this.db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId));
    return result.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()) as TaskEvent[];
  }

  async getTaskEventsByTaskIds(taskIds: string[]): Promise<Map<string, TaskEvent[]>> {
    await this.ensureInitialized();
    if (taskIds.length === 0) {
      return new Map();
    }
    
    const result = await this.db.select().from(taskEvents).where(
      taskIds.length === 1 
        ? eq(taskEvents.taskId, taskIds[0])
        : drizzleSql`${taskEvents.taskId} IN (${drizzleSql.join(taskIds.map(id => drizzleSql`${id}`), drizzleSql`, `)})`
    );
    
    const eventsByTaskId = new Map<string, TaskEvent[]>();
    for (const event of result) {
      const taskId = (event as any).taskId;
      if (!eventsByTaskId.has(taskId)) {
        eventsByTaskId.set(taskId, []);
      }
      eventsByTaskId.get(taskId)!.push(event as TaskEvent);
    }
    
    const eventsArrays = Array.from(eventsByTaskId.values());
    for (const events of eventsArrays) {
      events.sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    }
    
    return eventsByTaskId;
  }

  // ========== NOTIFICATION PREFERENCES ==========
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    await this.ensureInitialized();
    const result = await this.db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return result[0] as NotificationPreferences | undefined;
  }

  async upsertNotificationPreferences(data: InsertNotificationPreferences): Promise<NotificationPreferences> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(notificationPreferences)
      .values(data)
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: data,
      })
      .returning();
    return result[0] as NotificationPreferences;
  }

  async getMotorcycleModels(filters?: { isActive?: boolean }): Promise<MotorcycleModel[]> {
    await this.ensureInitialized();
    const query = this.db.select().from(motorcycleModels);
    
    if (filters?.isActive !== undefined) {
      const result = await query.where(eq(motorcycleModels.isActive, filters.isActive));
      return result as MotorcycleModel[];
    }
    
    const result = await query.orderBy(motorcycleModels.displayOrder, motorcycleModels.name);
    return result as MotorcycleModel[];
  }

  async getMotorcycleModel(id: string): Promise<MotorcycleModel | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(motorcycleModels)
      .where(eq(motorcycleModels.id, id));
    return result[0] as MotorcycleModel | undefined;
  }

  async createMotorcycleModel(data: InsertMotorcycleModel): Promise<MotorcycleModel> {
    await this.ensureInitialized();
    const result = await this.db
      .insert(motorcycleModels)
      .values(data)
      .returning();
    return result[0] as MotorcycleModel;
  }

  async updateMotorcycleModel(id: string, data: Partial<InsertMotorcycleModel>): Promise<MotorcycleModel | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .update(motorcycleModels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(motorcycleModels.id, id))
      .returning();
    return result[0] as MotorcycleModel | undefined;
  }

  async deleteMotorcycleModel(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await this.db
      .delete(motorcycleModels)
      .where(eq(motorcycleModels.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async bulkReplaceMotorcycleModels(models: InsertMotorcycleModel[]): Promise<void> {
    await this.ensureInitialized();
    // Neon HTTP driver doesn't support transactions, use sequential operations
    await this.db.delete(motorcycleModels);
    
    if (models.length > 0) {
      await this.db.insert(motorcycleModels).values(models);
    }
  }

  async bulkReplaceTracks(tracksData: InsertTrack[]): Promise<void> {
    await this.ensureInitialized();
    // Neon HTTP driver doesn't support transactions, use sequential operations
    await this.db.delete(tracks);
    
    if (tracksData.length > 0) {
      await this.db.insert(tracks).values(tracksData);
    }
  }

  async bulkReplaceOrganizers(organizersData: InsertOrganizer[]): Promise<void> {
    await this.ensureInitialized();
    // Neon HTTP driver doesn't support transactions, use sequential operations
    await this.db.delete(organizers);
    
    if (organizersData.length > 0) {
      await this.db.insert(organizers).values(organizersData);
    }
  }

  async getMarketplaceListings(filters?: {
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc";
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: MarketplaceListing[];
    total: number;
    nextCursor?: string | null;
  }> {
    await this.ensureInitialized();
    
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(marketplaceListings.category, filters.category));
    }
    
    if (filters?.status) {
      conditions.push(eq(marketplaceListings.status, filters.status));
    } else {
      conditions.push(eq(marketplaceListings.status, "active"));
    }
    
    if (filters?.sellerId) {
      conditions.push(eq(marketplaceListings.sellerUserId, filters.sellerId));
    }
    
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(marketplaceListings.priceCents, filters.minPrice));
    }
    
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(marketplaceListings.priceCents, filters.maxPrice));
    }
    
    if (filters?.search && filters.search.length >= 3) {
      conditions.push(
        or(
          ilike(marketplaceListings.title, `%${filters.search}%`),
          ilike(marketplaceListings.description, `%${filters.search}%`)
        )
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const totalResult = await this.db
      .select({ count: count() })
      .from(marketplaceListings)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    let orderByClause;
    if (filters?.sort === "price_asc") {
      orderByClause = [asc(marketplaceListings.priceCents), desc(marketplaceListings.createdAt)];
    } else if (filters?.sort === "price_desc") {
      orderByClause = [desc(marketplaceListings.priceCents), desc(marketplaceListings.createdAt)];
    } else {
      orderByClause = [desc(marketplaceListings.createdAt)];
    }
    
    const page = filters?.page || 1;
    const pageSize = Math.min(filters?.pageSize || 20, 50);
    const offset = (page - 1) * pageSize;
    
    const items = await this.db
      .select()
      .from(marketplaceListings)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset);
    
    return {
      items: items as MarketplaceListing[],
      total: Number(total),
      nextCursor: null,
    };
  }

  async getMarketplaceListing(id: string): Promise<MarketplaceListing | undefined> {
    await this.ensureInitialized();
    const result = await this.db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, id));
    return result[0] as MarketplaceListing | undefined;
  }

  async createMarketplaceListing(data: InsertMarketplaceListing, sellerId: string): Promise<MarketplaceListing> {
    await this.ensureInitialized();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);
    
    const result = await this.db
      .insert(marketplaceListings)
      .values({
        ...data,
        sellerUserId: sellerId,
        status: "active",
        expiresAt,
      })
      .returning();
    
    return result[0] as MarketplaceListing;
  }

  async updateMarketplaceListing(
    id: string,
    data: Partial<UpdateMarketplaceListing>,
    actorId: string
  ): Promise<MarketplaceListing | undefined> {
    await this.ensureInitialized();
    
    const listing = await this.getMarketplaceListing(id);
    if (!listing || listing.sellerUserId !== actorId) {
      return undefined;
    }
    
    const result = await this.db
      .update(marketplaceListings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceListings.id, id))
      .returning();
    
    return result[0] as MarketplaceListing | undefined;
  }

  async deleteMarketplaceListing(id: string, actorId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const listing = await this.getMarketplaceListing(id);
    if (!listing || listing.sellerUserId !== actorId) {
      return false;
    }
    
    const result = await this.db
      .delete(marketplaceListings)
      .where(eq(marketplaceListings.id, id))
      .returning();
    
    return result.length > 0;
  }
}

export const storage = new DbStorage();
