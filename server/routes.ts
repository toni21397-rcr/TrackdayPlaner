import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAdmin, canModifyResource } from "./adminMiddleware";
import { seedTracks } from "./seed-tracks";
import {
  insertOrganizerSchema,
  insertTrackSchema,
  insertTrackdaySchema,
  insertCostItemSchema,
  insertVehicleSchema,
  insertMaintenanceLogSchema,
  insertScheduleBlockSchema,
  insertTrackSessionSchema,
  insertLapSchema,
  insertSettingsSchema,
  insertMaintenancePlanSchema,
  insertPlanChecklistItemSchema,
  insertChecklistItemPartSchema,
  insertVehiclePlanSchema,
  insertMaintenanceTaskSchema,
  insertTaskEventSchema,
  insertNotificationPreferencesSchema,
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

  // ============ ORGANIZERS ============
  app.get("/api/organizers", async (req, res) => {
    const organizers = await storage.getOrganizers();
    res.json(organizers);
  });

  app.get("/api/organizers/:id", async (req, res) => {
    const organizer = await storage.getOrganizer(req.params.id);
    if (!organizer) return res.status(404).json({ error: "Organizer not found" });
    res.json(organizer);
  });

  app.post("/api/organizers", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertOrganizerSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const organizer = await storage.createOrganizer({ ...data, createdBy: userId });
      res.json(organizer);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/organizers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizer = await storage.getOrganizer(req.params.id);
      if (!organizer) return res.status(404).json({ error: "Organizer not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, organizer.createdBy, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this organizer" });
      }
      
      const data = insertOrganizerSchema.parse(req.body);
      const updated = await storage.updateOrganizer(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Organizer not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/organizers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const organizer = await storage.getOrganizer(req.params.id);
      if (!organizer) return res.status(404).json({ error: "Organizer not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, organizer.createdBy, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to delete this organizer" });
      }
      
      const deleted = await storage.deleteOrganizer(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Organizer not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.post("/api/tracks", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertTrackSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const track = await storage.createTrack({ ...data, createdBy: userId });
      res.json(track);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/tracks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) return res.status(404).json({ error: "Track not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, track.createdBy, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this track" });
      }
      
      const data = insertTrackSchema.parse(req.body);
      const updated = await storage.updateTrack(req.params.id, data);
      if (!updated) return res.status(404).json({ error: "Track not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/tracks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const track = await storage.getTrack(req.params.id);
      if (!track) return res.status(404).json({ error: "Track not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, track.createdBy, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to delete this track" });
      }
      
      const deleted = await storage.deleteTrack(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Track not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Seed tracks from comprehensive database
  app.post("/api/seed-tracks", isAuthenticated, async (req, res) => {
    try {
      const result = await seedTracks(storage);
      res.json({
        message: `Successfully seeded ${result.added} tracks`,
        ...result
      });
    } catch (error: any) {
      console.error("Error seeding tracks:", error);
      res.status(500).json({ error: error.message });
    }
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

  app.post("/api/trackdays", isAuthenticated, async (req, res) => {
    try {
      const data = insertTrackdaySchema.parse(req.body);
      const trackday = await storage.createTrackday(data);
      res.json(trackday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/trackdays/:id", isAuthenticated, async (req, res) => {
    try {
      const data = insertTrackdaySchema.partial().parse(req.body);
      const trackday = await storage.updateTrackday(req.params.id, data);
      if (!trackday) return res.status(404).json({ error: "Trackday not found" });
      res.json(trackday);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/trackdays/:id", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteTrackday(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Trackday not found" });
    res.json({ success: true });
  });

  // Route calculation
  app.post("/api/trackdays/:id/calculate-route", isAuthenticated, async (req, res) => {
    const trackday = await storage.getTrackday(req.params.id);
    if (!trackday) return res.status(404).json({ error: "Trackday not found" });
    
    const track = await storage.getTrack(trackday.trackId);
    if (!track) return res.status(404).json({ error: "Track not found" });
    
    const settings = await storage.getSettings();
    const vehicle = trackday.vehicleId ? await storage.getVehicle(trackday.vehicleId) : null;
    
    // Calculate route (prefer Google Maps, fallback to OpenRouteService, then mock data)
    const routeData = await calculateRoute(
      settings.homeLat,
      settings.homeLng,
      track.lat,
      track.lng,
      settings.googleMapsApiKey,
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

  app.post("/api/cost-items", isAuthenticated, async (req, res) => {
    try {
      const data = insertCostItemSchema.parse(req.body);
      const item = await storage.createCostItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cost-items/:id", isAuthenticated, async (req, res) => {
    try {
      const data = insertCostItemSchema.partial().parse(req.body);
      const item = await storage.updateCostItem(req.params.id, data);
      if (!item) return res.status(404).json({ error: "Cost item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cost-items/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/vehicles", isAuthenticated, async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, data);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, async (req, res) => {
    const deleted = await storage.deleteVehicle(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Vehicle not found" });
    res.json({ success: true });
  });

  // ============ MAINTENANCE LOGS ============
  app.post("/api/maintenance", isAuthenticated, async (req, res) => {
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

  app.post("/api/schedule-blocks", isAuthenticated, async (req, res) => {
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

  app.post("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const data = insertTrackSessionSchema.parse(req.body);
      const session = await storage.createTrackSession(data);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ LAPS ============
  app.post("/api/laps", isAuthenticated, async (req, res) => {
    try {
      const data = insertLapSchema.parse(req.body);
      const lap = await storage.createLap(data);
      res.json(lap);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/laps/bulk", isAuthenticated, async (req, res) => {
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

  app.put("/api/settings", isAuthenticated, async (req, res) => {
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

  app.post("/api/weather/:trackdayId/refresh", isAuthenticated, async (req, res) => {
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

  // ============ ADMIN ROUTES ============
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const trackdays = await storage.getTrackdays();
      
      // Calculate activity stats for each user
      const usersWithStats = users.map(user => {
        const userTrackdays = trackdays.filter(td => {
          // This is a simplified version - in production you'd want to track user ownership of trackdays
          return true;
        });
        
        return {
          ...user,
          trackdayCount: userTrackdays.length,
          lastActive: user.updatedAt,
        };
      });
      
      res.json(usersWithStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle admin status (admin only)
  app.patch("/api/admin/users/:id/toggle-admin", isAdmin, async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user.claims.sub;
      
      // Prevent users from removing their own admin status
      if (targetUserId === currentUserId) {
        return res.status(400).json({ error: "You cannot modify your own admin status" });
      }
      
      const user = await storage.getUser(targetUserId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const updated = await storage.toggleUserAdmin(targetUserId, !user.isAdmin);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get system statistics (admin only)
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const tracks = await storage.getTracks();
      const organizers = await storage.getOrganizers();
      const trackdays = await storage.getTrackdays();
      
      const systemTracks = tracks.filter(t => !t.createdBy);
      const userTracks = tracks.filter(t => t.createdBy);
      const systemOrganizers = organizers.filter(o => !o.createdBy);
      const userOrganizers = organizers.filter(o => o.createdBy);
      
      res.json({
        totalUsers: users.length,
        adminUsers: users.filter(u => u.isAdmin).length,
        totalTracks: tracks.length,
        systemTracks: systemTracks.length,
        userTracks: userTracks.length,
        totalOrganizers: organizers.length,
        systemOrganizers: systemOrganizers.length,
        userOrganizers: userOrganizers.length,
        totalTrackdays: trackdays.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MAINTENANCE PLANS ============
  app.get("/api/maintenance-plans", isAuthenticated, async (req: any, res) => {
    try {
      const isTemplate = req.query.isTemplate === 'true';
      const userId = req.user.claims.sub;
      const plans = await storage.getMaintenancePlans({ isTemplate, ownerUserId: userId });
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getMaintenancePlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this plan" });
      }
      
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-plans", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertMaintenancePlanSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const plan = await storage.createMaintenancePlan({ ...data, ownerUserId: userId });
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/maintenance-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getMaintenancePlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      if (plan.ownerUserId !== userId) {
        return res.status(403).json({ error: "You don't have permission to modify this plan" });
      }
      
      const data = insertMaintenancePlanSchema.partial().parse(req.body);
      const updated = await storage.updateMaintenancePlan(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/maintenance-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getMaintenancePlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      if (plan.ownerUserId !== userId) {
        return res.status(403).json({ error: "You don't have permission to delete this plan" });
      }
      
      await storage.deleteMaintenancePlan(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ PLAN CHECKLIST ITEMS ============
  app.get("/api/maintenance-plans/:planId/checklist-items", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getMaintenancePlan(req.params.planId);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this plan's items" });
      }
      
      const items = await storage.getPlanChecklistItems(req.params.planId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-plans/:planId/checklist-items", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getMaintenancePlan(req.params.planId);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this plan" });
      }
      
      const data = insertPlanChecklistItemSchema.parse({ ...req.body, planId: req.params.planId });
      const item = await storage.createPlanChecklistItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getPlanChecklistItems("").then(items => items.find(i => i.id === req.params.id));
      if (!item) return res.status(404).json({ error: "Checklist item not found" });
      
      const plan = await storage.getMaintenancePlan(item.planId);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this item" });
      }
      
      const data = insertPlanChecklistItemSchema.partial().parse(req.body);
      const updated = await storage.updatePlanChecklistItem(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.getPlanChecklistItems("").then(items => items.find(i => i.id === req.params.id));
      if (!item) return res.status(404).json({ error: "Checklist item not found" });
      
      const plan = await storage.getMaintenancePlan(item.planId);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to delete this item" });
      }
      
      await storage.deletePlanChecklistItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ CHECKLIST ITEM PARTS ============
  app.get("/api/checklist-items/:checklistItemId/parts", isAuthenticated, async (req, res) => {
    try {
      const parts = await storage.getChecklistItemParts(req.params.checklistItemId);
      res.json(parts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/checklist-items/:checklistItemId/parts", isAuthenticated, async (req, res) => {
    try {
      const data = insertChecklistItemPartSchema.parse({ ...req.body, checklistItemId: req.params.checklistItemId });
      const part = await storage.createChecklistItemPart(data);
      res.json(part);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/parts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteChecklistItemPart(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ VEHICLE PLANS ============
  app.get("/api/vehicle-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vehicleId, status } = req.query;
      const user = await storage.getUser(userId);
      
      if (vehicleId) {
        const vehicle = await storage.getVehicle(vehicleId as string);
        if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
        if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
          return res.status(403).json({ error: "You don't have permission to view this vehicle's plans" });
        }
      }
      
      const plans = await storage.getVehiclePlans({ 
        vehicleId: vehicleId as string,
        status: status as string 
      });
      
      const filteredPlans = [];
      for (const plan of plans) {
        const vehicle = await storage.getVehicle(plan.vehicleId);
        if (vehicle && canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
          filteredPlans.push(plan);
        }
      }
      
      res.json(filteredPlans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/vehicle-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getVehiclePlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const userId = req.user.claims.sub;
      const vehicle = await storage.getVehicle(plan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this vehicle plan" });
      }
      
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vehicle-plans", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertVehiclePlanSchema.parse(req.body);
      
      const userId = req.user.claims.sub;
      const vehicle = await storage.getVehicle(data.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to create plans for this vehicle" });
      }
      
      const maintenancePlan = await storage.getMaintenancePlan(data.planId);
      if (!maintenancePlan) return res.status(404).json({ error: "Maintenance plan not found" });
      if (!canModifyResource(userId, maintenancePlan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to use this maintenance plan" });
      }
      
      const plan = await storage.createVehiclePlan(data);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicle-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingPlan = await storage.getVehiclePlan(req.params.id);
      if (!existingPlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const userId = req.user.claims.sub;
      const vehicle = await storage.getVehicle(existingPlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this vehicle plan" });
      }
      
      const data = insertVehiclePlanSchema.partial().parse(req.body);
      const updated = await storage.updateVehiclePlan(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicle-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plan = await storage.getVehiclePlan(req.params.id);
      if (!plan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const userId = req.user.claims.sub;
      const vehicle = await storage.getVehicle(plan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to delete this vehicle plan" });
      }
      
      await storage.deleteVehiclePlan(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MAINTENANCE TASKS ============
  app.get("/api/maintenance-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vehiclePlanId, status, vehicleId } = req.query;
      const user = await storage.getUser(userId);
      
      if (vehicleId) {
        const vehicle = await storage.getVehicle(vehicleId as string);
        if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
        if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
          return res.status(403).json({ error: "You don't have permission to view this vehicle's tasks" });
        }
      }
      
      if (vehiclePlanId) {
        const vehiclePlan = await storage.getVehiclePlan(vehiclePlanId as string);
        if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
        const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
        if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
        if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
          return res.status(403).json({ error: "You don't have permission to view this vehicle plan's tasks" });
        }
      }
      
      const tasks = await storage.getMaintenanceTasks({ 
        vehiclePlanId: vehiclePlanId as string,
        status: status as string,
        vehicleId: vehicleId as string
      });
      
      const filteredTasks = [];
      for (const task of tasks) {
        const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
        if (vehiclePlan) {
          const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
          if (vehicle && canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
            filteredTasks.push(task);
          }
        }
      }
      
      res.json(filteredTasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this task" });
      }
      
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertMaintenanceTaskSchema.parse(req.body);
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(data.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to create tasks for this vehicle" });
      }
      
      const task = await storage.createMaintenanceTask(data);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/maintenance-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingTask = await storage.getMaintenanceTask(req.params.id);
      if (!existingTask) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(existingTask.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this task" });
      }
      
      const parsed = insertMaintenanceTaskSchema.partial().parse(req.body);
      const data: Partial<any> = { ...parsed };
      if (parsed.dueAt && typeof parsed.dueAt === 'string') {
        data.dueAt = new Date(parsed.dueAt);
      }
      const updated = await storage.updateMaintenanceTask(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/maintenance-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to delete this task" });
      }
      
      await storage.deleteMaintenanceTask(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Task lifecycle actions
  app.post("/api/maintenance-tasks/:id/snooze", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this task" });
      }
      
      const { snoozedUntil } = req.body;
      if (!snoozedUntil) {
        return res.status(400).json({ error: "snoozedUntil is required" });
      }
      const updated = await storage.snoozeTask(req.params.id, new Date(snoozedUntil));
      
      await storage.createTaskEvent({
        taskId: req.params.id,
        type: "status_change",
        occurredAt: new Date(),
        payload: { newStatus: "snoozed", snoozedUntil },
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-tasks/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this task" });
      }
      
      const { completionSource, maintenanceLogId } = req.body;
      if (!completionSource) {
        return res.status(400).json({ error: "completionSource is required" });
      }
      const updated = await storage.completeTask(req.params.id, completionSource, maintenanceLogId);
      
      await storage.createTaskEvent({
        taskId: req.params.id,
        type: "status_change",
        occurredAt: new Date(),
        payload: { newStatus: "completed", completionSource, maintenanceLogId },
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/maintenance-tasks/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to modify this task" });
      }
      
      const updated = await storage.dismissTask(req.params.id);
      
      await storage.createTaskEvent({
        taskId: req.params.id,
        type: "status_change",
        occurredAt: new Date(),
        payload: { newStatus: "dismissed" },
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ TASK EVENTS ============
  app.get("/api/maintenance-tasks/:taskId/events", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getMaintenanceTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: "Maintenance task not found" });
      
      const userId = req.user.claims.sub;
      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) return res.status(404).json({ error: "Vehicle plan not found" });
      
      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      
      const user = await storage.getUser(userId);
      if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this task's events" });
      }
      
      const events = await storage.getTaskEvents(req.params.taskId);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ NOTIFICATION PREFERENCES ============
  app.get("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.getNotificationPreferences(userId);
      res.json(prefs || {
        userId,
        enableEmailNotifications: true,
        notificationTimezone: 'UTC',
        notificationHourUtc: 9,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertNotificationPreferencesSchema.parse({ ...req.body, userId });
      const prefs = await storage.upsertNotificationPreferences(data);
      res.json(prefs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ============ MAINTENANCE ANALYTICS ============
  app.get("/api/maintenance/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const userVehicles = await storage.getVehiclesByUserId(userId);
      
      if (userVehicles.length === 0) {
        return res.json({
          totalTasks: 0,
          completedTasks: 0,
          dismissedTasks: 0,
          overdueTasks: 0,
          dueSoonTasks: 0,
          completionRate: 0,
          averageCompletionTimeDays: 0,
          tasksByStatus: { pending: 0, due: 0, snoozed: 0, completed: 0, dismissed: 0 },
          tasksByVehicle: [],
        });
      }
      
      const allTasksPromises = userVehicles.map(v => storage.getMaintenanceTasks({ vehicleId: v.id }));
      const allTasksArrays = await Promise.all(allTasksPromises);
      const userTasks = allTasksArrays.flat();
      
      const tasksByVehicleId = new Map<string, any[]>();
      for (let i = 0; i < userVehicles.length; i++) {
        tasksByVehicleId.set(userVehicles[i].id, allTasksArrays[i]);
      }
      
      const now = new Date();
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const dismissedTasks = userTasks.filter(t => t.status === 'dismissed');
      const overdueTasks = userTasks.filter(t => 
        t.dueAt && 
        (t.status === 'pending' || t.status === 'due' || t.status === 'snoozed') && 
        new Date(t.dueAt) < now
      );
      const dueSoonTasks = userTasks.filter(t =>
        t.dueAt &&
        (t.status === 'pending' || t.status === 'due' || t.status === 'snoozed') &&
        new Date(t.dueAt) >= now &&
        new Date(t.dueAt) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
      
      let totalCompletionTimeMs = 0;
      let completedWithEvents = 0;
      
      const completedTaskIds = completedTasks.map(t => t.id);
      const taskEventsMap = await storage.getTaskEventsByTaskIds(completedTaskIds);
      
      for (const task of completedTasks) {
        const events = taskEventsMap.get(task.id) || [];
        const triggeredEvent = events.find((e: any) => e.type === 'triggered');
        const reversedEvents = [...events].reverse();
        const completedEvent = reversedEvents.find((e: any) => 
          e.type === 'status_change' && 
          e.payload?.newStatus === 'completed'
        );
        
        if (triggeredEvent && completedEvent) {
          const timeToComplete = new Date(completedEvent.occurredAt).getTime() - 
                                  new Date(triggeredEvent.occurredAt).getTime();
          totalCompletionTimeMs += timeToComplete;
          completedWithEvents++;
        }
      }
      
      const averageCompletionTimeDays = completedWithEvents > 0
        ? totalCompletionTimeMs / completedWithEvents / (1000 * 60 * 60 * 24)
        : 0;
      
      const completionRate = totalTasks > 0
        ? (completedTasks.length / totalTasks) * 100
        : 0;
      
      const tasksByStatus = {
        pending: userTasks.filter(t => t.status === 'pending').length,
        due: userTasks.filter(t => t.status === 'due').length,
        snoozed: userTasks.filter(t => t.status === 'snoozed').length,
        completed: completedTasks.length,
        dismissed: dismissedTasks.length,
      };
      
      const tasksByVehicle = userVehicles.map((vehicle) => {
          const vehicleTasks = tasksByVehicleId.get(vehicle.id) || [];
          
          return {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            totalTasks: vehicleTasks.length,
            completedTasks: vehicleTasks.filter(t => t.status === 'completed').length,
            overdueTasks: vehicleTasks.filter(t => 
              t.dueAt &&
              (t.status === 'pending' || t.status === 'due' || t.status === 'snoozed') && 
              new Date(t.dueAt) < now
            ).length,
          };
        });
      
      res.json({
        totalTasks,
        completedTasks: completedTasks.length,
        dismissedTasks: dismissedTasks.length,
        overdueTasks: overdueTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        completionRate: Math.round(completionRate * 10) / 10,
        averageCompletionTimeDays: Math.round(averageCompletionTimeDays * 10) / 10,
        tasksByStatus,
        tasksByVehicle: tasksByVehicle.filter(v => v.totalTasks > 0),
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MAINTENANCE SCHEDULING ============
  app.post("/api/maintenance/process-triggers", isAuthenticated, async (req: any, res) => {
    try {
      const { TriggerProcessor } = await import("./triggerProcessor.ts");
      const processor = new TriggerProcessor(storage);
      
      await processor.processAllTriggers();
      await processor.updateTaskStatuses();
      
      res.json({ success: true, message: "Trigger processing completed" });
    } catch (error: any) {
      console.error("Error processing triggers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send notification emails for due tasks
  app.post("/api/maintenance/send-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const { NotificationCoordinator } = await import("./notificationCoordinator.ts");
      const { emailService } = await import("./emailService.ts");
      
      const coordinator = new NotificationCoordinator(storage, emailService);
      await coordinator.sendDueTaskNotifications();
      
      res.json({ success: true, message: "Notifications sent successfully" });
    } catch (error: any) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle email action links (complete/snooze/dismiss tasks from email)
  app.get("/api/maintenance/email-action/:token", async (req, res) => {
    try {
      const { emailService } = await import("./emailService.ts");
      const { token } = req.params;
      
      // Verify and decode the token
      const decoded = emailService.verifyActionToken(token);
      if (!decoded) {
        return res.status(400).send(`
          <html>
            <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1 style="color: #dc2626;">Invalid or Expired Link</h1>
              <p>This action link is invalid or has expired. Please open the Trackday Planner app to manage your tasks.</p>
              <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Open Trackday Planner</a>
            </body>
          </html>
        `);
      }

      const { userId, taskId, action } = decoded;

      // Verify user has permission to modify this task
      const task = await storage.getMaintenanceTask(taskId);
      if (!task) {
        return res.status(404).send("Task not found");
      }

      const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) {
        return res.status(404).send("Vehicle plan not found");
      }

      const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle || vehicle.userId !== userId) {
        return res.status(403).send("Unauthorized");
      }

      // Perform the action
      let actionText = "";
      switch (action) {
        case "complete":
          await storage.completeTask(taskId, "email");
          actionText = "marked as complete";
          break;
        case "snooze":
          const snoozeDate = new Date();
          snoozeDate.setDate(snoozeDate.getDate() + 7);
          await storage.snoozeTask(taskId, snoozeDate);
          actionText = "snoozed for 7 days";
          break;
        case "dismiss":
          await storage.dismissTask(taskId);
          actionText = "dismissed";
          break;
        default:
          return res.status(400).send("Invalid action");
      }

      // Create task event
      await storage.createTaskEvent({
        taskId,
        type: "status_change",
        occurredAt: new Date(),
        payload: { source: "email", action },
      });

      // Return success page
      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="margin: 0;">✓ Success</h1>
            </div>
            <p style="font-size: 18px;">Task ${actionText} successfully!</p>
            <a href="/maintenance" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View All Tasks</a>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Error handling email action:", error);
      res.status(500).send("An error occurred processing your request");
    }
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
  googleMapsApiKey: string,
  openRouteServiceKey: string
): Promise<{ distance: number; duration: number; geometry?: string }> {
  let googleMapsError: Error | null = null;
  let openRouteServiceError: Error | null = null;
  
  // Try Google Maps first if API key is available (this matches navigation exactly!)
  if (googleMapsApiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${googleMapsApiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Maps API returned status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        const distance = Math.round(leg.distance.value / 1000); // m to km
        const duration = Math.round(leg.duration.value / 60); // s to min
        
        // Decode polyline to get route geometry
        const polyline = route.overview_polyline.points;
        const coordinates = decodePolyline(polyline);
        const geometry = JSON.stringify(coordinates);
        
        console.log('Route calculated using Google Maps API');
        return { distance, duration, geometry };
      } else {
        throw new Error(`Google Maps API returned status: ${data.status}`);
      }
    } catch (error) {
      googleMapsError = error instanceof Error ? error : new Error(String(error));
      console.error('Google Maps route calculation failed, will try OpenRouteService:', googleMapsError.message);
    }
  }
  
  // Try OpenRouteService if Google Maps failed or no key provided
  if (openRouteServiceKey) {
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?start=${fromLng},${fromLat}&end=${toLng},${toLat}`,
        {
          headers: {
            'Authorization': openRouteServiceKey,
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`OpenRouteService API returned status ${response.status}`);
      }
      
      const data = await response.json();
      const distance = Math.round(data.features[0].properties.segments[0].distance / 1000); // m to km
      const duration = Math.round(data.features[0].properties.segments[0].duration / 60); // s to min
      const geometry = JSON.stringify(data.features[0].geometry.coordinates); // Array of [lng, lat] pairs
      
      console.log('Route calculated using OpenRouteService API');
      return { distance, duration, geometry };
    } catch (error) {
      openRouteServiceError = error instanceof Error ? error : new Error(String(error));
      console.error('OpenRouteService route calculation failed, will use Haversine fallback:', openRouteServiceError.message);
    }
  }
  
  // Fallback to Haversine calculation with simple straight line geometry
  console.log('Using fallback Haversine distance calculation');
  if (googleMapsError || openRouteServiceError) {
    console.log('Both API methods failed, falling back to basic distance calculation');
  }
  
  const distance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
  const duration = Math.round(distance / 80); // Assume 80 km/h average
  const geometry = JSON.stringify([[fromLng, fromLat], [toLng, toLat]]);
  return { distance, duration, geometry };
}

// Helper function to decode Google Maps polyline format to coordinates
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]); // [lng, lat] format for GeoJSON
  }

  return coordinates;
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
