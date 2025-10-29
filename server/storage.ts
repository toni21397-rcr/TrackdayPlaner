import { randomUUID } from "crypto";
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

export const storage = new MemStorage();
