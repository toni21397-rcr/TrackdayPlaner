import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertTrackSchema,
  insertTrackdaySchema,
  insertCostItemSchema,
  insertVehicleSchema,
  insertMaintenanceLogSchema,
  insertScheduleBlockSchema,
  insertTrackSessionSchema,
  insertLapSchema,
  insertSettingsSchema,
  type BudgetSummary,
  type DashboardStats,
  type MonthlySpending,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth integration - Setup auth middleware
  await setupAuth(app);

  // Replit Auth integration - Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============ TRACKS ============
  app.get("/api/tracks", async (req, res) => {
    const tracks = await storage.getTracks();
    res.json(tracks);
  });

  app.get("/api/tracks/:id", async (req, res) => {
    const track = await storage.getTrack(req.params.id);
    if (!track) return res.status(404).json({ error: "Track not found" });
    res.json(track);
  });

  app.post("/api/tracks", async (req, res) => {
    try {
      const data = insertTrackSchema.parse(req.body);
      const track = await storage.createTrack(data);
      res.json(track);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/tracks/:id", async (req, res) => {
    try {
      const data = insertTrackSchema.parse(req.body);
      const track = await storage.updateTrack(req.params.id, data);
      if (!track) return res.status(404).json({ error: "Track not found" });
      res.json(track);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    const deleted = await storage.deleteTrack(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Track not found" });
    res.json({ success: true });
  });

  // ============ TRACKDAYS ============
  app.get("/api/trackdays", async (req, res) => {
    const { year, participationStatus } = req.query;
    const trackdays = await storage.getTrackdays({
      year: year as string,
      participationStatus: participationStatus as string,
    });
    
    // Populate track and vehicle data
    const enriched = await Promise.all(trackdays.map(async (td) => {
      const track = await storage.getTrack(td.trackId);
      const vehicle = td.vehicleId ? await storage.getVehicle(td.vehicleId) : undefined;
      return { ...td, track, vehicle };
    }));
    
    res.json(enriched);
  });

  app.get("/api/trackdays/upcoming", async (req, res) => {
    const trackdays = await storage.getUpcomingTrackdays(5);
    const enriched = await Promise.all(trackdays.map(async (td) => {
      const track = await storage.getTrack(td.trackId);
      return { ...td, track };
    }));
    res.json(enriched);
  });

  app.get("/api/trackdays/:id", async (req, res) => {
    const trackday = await storage.getTrackday(req.params.id);
    if (!trackday) return res.status(404).json({ error: "Trackday not found" });
    
    const track = await storage.getTrack(trackday.trackId);
    const vehicle = trackday.vehicleId ? await storage.getVehicle(trackday.vehicleId) : undefined;
    
    res.json({ ...trackday, track, vehicle });
  });

  app.post("/api/trackdays", async (req, res) => {
    try {
      const data = insertTrackdaySchema.parse(req.body);
      const trackday = await storage.createTrackday(data);
      res.json(trackday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/trackdays/:id", async (req, res) => {
    try {
      const data = insertTrackdaySchema.partial().parse(req.body);
      const trackday = await storage.updateTrackday(req.params.id, data);
      if (!trackday) return res.status(404).json({ error: "Trackday not found" });
      res.json(trackday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/trackdays/:id", async (req, res) => {
    const deleted = await storage.deleteTrackday(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Trackday not found" });
    res.json({ success: true });
  });

  // Route calculation
  app.post("/api/trackdays/:id/calculate-route", async (req, res) => {
    const trackday = await storage.getTrackday(req.params.id);
    if (!trackday) return res.status(404).json({ error: "Trackday not found" });
    
    const track = await storage.getTrack(trackday.trackId);
    if (!track) return res.status(404).json({ error: "Track not found" });
    
    const settings = await storage.getSettings();
    const vehicle = trackday.vehicleId ? await storage.getVehicle(trackday.vehicleId) : null;
    
    // Calculate route (using mock data if no API key)
    const routeData = await calculateRoute(
      settings.homeLat,
      settings.homeLng,
      track.lat,
      track.lng,
      settings.openRouteServiceKey
    );
    
    // Calculate costs
    const distanceKm = routeData.distance;
    const roundTripKm = distanceKm * 2;
    
    let fuelCostCents = 0;
    if (vehicle && vehicle.fuelType !== "electric") {
      const fuelNeeded = (roundTripKm / 100) * vehicle.consumptionPer100;
      fuelCostCents = Math.round(fuelNeeded * settings.fuelPricePerLitre * 100);
    }
    
    const tollsCostCents = Math.round(roundTripKm * settings.tollsPerKm * 100);
    
    // Update trackday with route data
    const updated = await storage.updateTrackday(req.params.id, {
      routeDistance: distanceKm,
      routeDuration: routeData.duration,
      routeFuelCost: fuelCostCents,
      routeTollsCost: tollsCostCents,
      routeGeometry: routeData.geometry,
    });
    
    // Create/update auto-generated travel cost items
    const existingCosts = await storage.getCostItems(req.params.id);
    const autoTravelCosts = existingCosts.filter(c => c.isTravelAuto);
    
    // Delete old auto costs
    for (const cost of autoTravelCosts) {
      await storage.deleteCostItem(cost.id);
    }
    
    // Create new auto costs
    if (fuelCostCents > 0) {
      await storage.createCostItem({
        trackdayId: req.params.id,
        type: "fuel",
        amountCents: fuelCostCents,
        currency: settings.currency,
        status: "planned",
        dueDate: null,
        paidAt: null,
        notes: "Auto-calculated fuel cost",
        isTravelAuto: true,
      });
    }
    
    if (tollsCostCents > 0) {
      await storage.createCostItem({
        trackdayId: req.params.id,
        type: "tolls",
        amountCents: tollsCostCents,
        currency: settings.currency,
        status: "planned",
        dueDate: null,
        paidAt: null,
        notes: "Auto-calculated tolls",
        isTravelAuto: true,
      });
    }
    
    res.json(updated);
  });

  // ============ COST ITEMS ============
  app.get("/api/cost-items", async (req, res) => {
    const { trackdayId } = req.query;
    const items = await storage.getCostItems(trackdayId as string | undefined);
    res.json(items);
  });

  app.post("/api/cost-items", async (req, res) => {
    try {
      const data = insertCostItemSchema.parse(req.body);
      const item = await storage.createCostItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cost-items/:id", async (req, res) => {
    try {
      const data = insertCostItemSchema.partial().parse(req.body);
      const item = await storage.updateCostItem(req.params.id, data);
      if (!item) return res.status(404).json({ error: "Cost item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cost-items/:id", async (req, res) => {
    const deleted = await storage.deleteCostItem(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Cost item not found" });
    res.json({ success: true });
  });

  // ============ VEHICLES ============
  app.get("/api/vehicles", async (req, res) => {
    const vehicles = await storage.getVehicles();
    
    // Populate maintenance logs
    const enriched = await Promise.all(vehicles.map(async (v) => {
      const maintenance = await storage.getMaintenanceLogs(v.id);
      return { ...v, maintenance };
    }));
    
    res.json(enriched);
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, data);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    const deleted = await storage.deleteVehicle(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ success: true });
  });

  // ============ MAINTENANCE LOGS ============
  app.post("/api/maintenance", async (req, res) => {
    try {
      const data = insertMaintenanceLogSchema.parse(req.body);
      const log = await storage.createMaintenanceLog(data);
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ SCHEDULE BLOCKS ============
  app.get("/api/schedule-blocks", async (req, res) => {
    const { trackdayId } = req.query;
    if (!trackdayId) return res.status(400).json({ error: "trackdayId required" });
    
    const blocks = await storage.getScheduleBlocks(trackdayId as string);
    res.json(blocks);
  });

  app.post("/api/schedule-blocks", async (req, res) => {
    try {
      const data = insertScheduleBlockSchema.parse(req.body);
      const block = await storage.createScheduleBlock(data);
      res.json(block);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ TRACK SESSIONS ============
  app.get("/api/sessions", async (req, res) => {
    const { trackdayId } = req.query;
    if (!trackdayId) return res.status(400).json({ error: "trackdayId required" });
    
    const sessions = await storage.getTrackSessions(trackdayId as string);
    
    // Populate laps
    const enriched = await Promise.all(sessions.map(async (s) => {
      const laps = await storage.getLaps(s.id);
      return { ...s, laps };
    }));
    
    res.json(enriched);
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertTrackSessionSchema.parse(req.body);
      const session = await storage.createTrackSession(data);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ LAPS ============
  app.post("/api/laps", async (req, res) => {
    try {
      const data = insertLapSchema.parse(req.body);
      const lap = await storage.createLap(data);
      res.json(lap);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/laps/bulk", async (req, res) => {
    try {
      const { laps } = req.body;
      if (!Array.isArray(laps)) {
        return res.status(400).json({ error: "laps must be an array" });
      }
      
      // Validate all laps
      const validatedLaps = laps.map((lap, index) => {
        try {
          return insertLapSchema.parse(lap);
        } catch (error: any) {
          throw new Error(`Lap ${index + 1}: ${error.message}`);
        }
      });
      
      // Insert all laps
      const createdLaps = await Promise.all(
        validatedLaps.map(lap => storage.createLap(lap))
      );
      
      res.json({ success: true, imported: createdLaps.length, laps: createdLaps });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ SETTINGS ============
  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const data = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ WEATHER ============
  app.get("/api/weather/:trackdayId", async (req, res) => {
    const cache = await storage.getWeatherCache(req.params.trackdayId);
    if (cache) {
      res.json(cache);
    } else {
      res.status(404).json({ error: "Weather not cached" });
    }
  });

  app.post("/api/weather/:trackdayId/refresh", async (req, res) => {
    const trackday = await storage.getTrackday(req.params.trackdayId);
    if (!trackday) return res.status(404).json({ error: "Trackday not found" });
    
    const track = await storage.getTrack(trackday.trackId);
    if (!track) return res.status(404).json({ error: "Track not found" });
    
    const settings = await storage.getSettings();
    
    const weather = await fetchWeather(
      track.lat,
      track.lng,
      trackday.date,
      settings.openWeatherApiKey
    );
    
    const cache = await storage.setWeatherCache({
      trackdayId: req.params.trackdayId,
      fetchedAt: new Date().toISOString(),
      ...weather,
    });
    
    res.json(cache);
  });

  // ============ SUMMARY/ANALYTICS ============
  app.get("/api/summary/stats", async (req, res) => {
    const trackdays = await storage.getTrackdays();
    const costItems = await storage.getCostItems();
    const maintenanceLogs = await storage.getMaintenanceLogs();
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();
    
    const thisYearTrackdays = trackdays.filter(td => td.date.startsWith(currentYear));
    const upcomingTrackdays = trackdays.filter(td => 
      td.date >= today && td.participationStatus !== "cancelled"
    );
    
    const paidCosts = costItems.filter(c => c.status === "paid");
    const totalCostCents = paidCosts.reduce((sum, c) => sum + c.amountCents, 0);
    
    const thisYearMaintenance = maintenanceLogs.filter(m => m.date.startsWith(currentYear));
    const maintenanceCostCents = thisYearMaintenance.reduce((sum, m) => sum + m.costCents, 0);
    
    const stats: DashboardStats = {
      totalEvents: thisYearTrackdays.length,
      totalCostCents,
      maintenanceCostCents,
      upcomingEvents: upcomingTrackdays.length,
    };
    
    res.json(stats);
  });

  app.get("/api/summary/budget", async (req, res) => {
    const settings = await storage.getSettings();
    const costItems = await storage.getCostItems();
    const maintenanceLogs = await storage.getMaintenanceLogs();
    const currentYear = new Date().getFullYear().toString();
    
    const thisYearCosts = costItems.filter(c => {
      // Try to find associated trackday to check year
      return true; // Simplified for now
    });
    
    const projectedCents = thisYearCosts
      .filter(c => c.status === "planned" || c.status === "invoiced")
      .reduce((sum, c) => sum + c.amountCents, 0);
    
    const spentCents = thisYearCosts
      .filter(c => c.status === "paid")
      .reduce((sum, c) => sum + c.amountCents, 0);
    
    const thisYearMaintenance = maintenanceLogs.filter(m => m.date.startsWith(currentYear));
    const maintenanceCents = thisYearMaintenance.reduce((sum, m) => sum + m.costCents, 0);
    
    const totalProjected = projectedCents + spentCents + maintenanceCents;
    const totalSpent = spentCents + maintenanceCents;
    const remainingCents = settings.annualBudgetCents - totalProjected;
    
    const budget: BudgetSummary = {
      projectedCents: totalProjected,
      spentCents: totalSpent,
      remainingCents,
      annualBudgetCents: settings.annualBudgetCents,
    };
    
    res.json(budget);
  });

  app.get("/api/summary/monthly", async (req, res) => {
    const costItems = await storage.getCostItems();
    const maintenanceLogs = await storage.getMaintenanceLogs();
    const currentYear = new Date().getFullYear();
    
    const monthlyMap = new Map<string, number>();
    
    // Aggregate costs by month (simplified - using current date for costs)
    costItems.filter(c => c.status === "paid" && c.paidAt).forEach(c => {
      const month = c.paidAt!.substring(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + c.amountCents);
    });
    
    // Aggregate maintenance by month
    maintenanceLogs.forEach(m => {
      const month = m.date.substring(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + m.costCents);
    });
    
    // Convert to array and fill in missing months
    const monthly: MonthlySpending[] = [];
    for (let i = 0; i < 12; i++) {
      const month = `${currentYear}-${(i + 1).toString().padStart(2, '0')}`;
      monthly.push({
        month,
        amountCents: monthlyMap.get(month) || 0,
      });
    }
    
    res.json(monthly);
  });

  const httpServer = createServer(app);
  return httpServer;
}

// ============ HELPER FUNCTIONS ============

async function calculateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  apiKey: string
): Promise<{ distance: number; duration: number; geometry?: string }> {
  // If no API key, use mock data with simple straight line geometry
  if (!apiKey) {
    const distance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
    const duration = Math.round(distance / 80); // Assume 80 km/h average
    const geometry = JSON.stringify([[fromLng, fromLat], [toLng, toLat]]);
    return { distance, duration, geometry };
  }
  
  // Try to use OpenRouteService API
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`,
      {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    const distance = Math.round(data.features[0].properties.segments[0].distance / 1000); // m to km
    const duration = Math.round(data.features[0].properties.segments[0].duration / 60); // s to min
    const geometry = JSON.stringify(data.features[0].geometry.coordinates); // Array of [lng, lat] pairs
    
    return { distance, duration, geometry };
  } catch (error) {
    console.error('Route calculation failed, using fallback:', error);
    const distance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
    const duration = Math.round(distance / 80);
    const geometry = JSON.stringify([[fromLng, fromLat], [toLng, toLat]]);
    return { distance, duration, geometry };
  }
}

async function fetchWeather(
  lat: number,
  lng: number,
  date: string,
  apiKey: string
): Promise<{ temperature: number; rainChance: number; windSpeed: number; description: string }> {
  // If no API key, use mock data
  if (!apiKey) {
    return {
      temperature: 18 + Math.round(Math.random() * 8),
      rainChance: Math.round(Math.random() * 40),
      windSpeed: 10 + Math.round(Math.random() * 15),
      description: ["partly cloudy", "sunny", "overcast"][Math.floor(Math.random() * 3)],
    };
  }
  
  // Try to use OpenWeather API
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    );
    
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    // Find forecast closest to the date
    const forecast = data.list[0]; // Simplified - would need to find closest date
    
    return {
      temperature: Math.round(forecast.main.temp),
      rainChance: Math.round((forecast.pop || 0) * 100),
      windSpeed: Math.round(forecast.wind.speed * 3.6), // m/s to km/h
      description: forecast.weather[0].description,
    };
  } catch (error) {
    console.error('Weather fetch failed, using mock:', error);
    return {
      temperature: 18 + Math.round(Math.random() * 8),
      rainChance: Math.round(Math.random() * 40),
      windSpeed: 10 + Math.round(Math.random() * 15),
      description: "partly cloudy",
    };
  }
}

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
