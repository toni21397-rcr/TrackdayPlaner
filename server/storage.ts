import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import type {
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
} from "@shared/schema";
import {
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
} from "@shared/schema";

export interface IStorage {
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
}

export class MemStorage implements IStorage {
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
    };

    // Seed initial data
    this.seedData();
  }

  private seedData() {
    // Seed 3 tracks
    const tracks = [
      { name: "Spa-Francorchamps", country: "Belgium", lat: 50.4372, lng: 5.9714 },
      { name: "Nürburgring", country: "Germany", lat: 50.3356, lng: 6.9475 },
      { name: "Hockenheimring", country: "Germany", lat: 49.3278, lng: 8.5658 },
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
}

export const storage = new DbStorage();
