import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAdmin, canModifyResource } from "./adminMiddleware";
import { seedTracks } from "./seed-tracks";
import { seedMotorcycles } from "./seed-motorcycles";
import { getGoogleDirections, getORSRoute, getOpenWeatherForecast, isServiceAvailable } from "./apiClient";
import { ensureFreshCache } from "./weatherCacheMaintenance";
import { weatherRateLimiter, externalApiRateLimiter } from "./rateLimiting";
import { analyticsCache } from "./analyticsCache";
import { 
  asyncHandler, 
  NotFoundError, 
  ForbiddenError, 
  DatabaseError,
  ExternalServiceError 
} from "./errorHandler";
import { logger } from "./logger";
import multer from "multer";
import Papa from "papaparse";
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
  insertMotorcycleModelSchema,
  insertMarketplaceListingSchema,
  updateMarketplaceListingSchema,
  type BudgetSummary,
  type DashboardStats,
  type MonthlySpending,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit Auth integration - Setup auth middleware
  await setupAuth(app);

  // Replit Auth integration - Auth routes
  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) throw new NotFoundError('User');
    res.json(user);
  }));

  // ============ ORGANIZERS ============
  app.get("/api/organizers", async (req, res) => {
    const organizers = await storage.getOrganizers();
    res.json(organizers);
  });

  app.get("/api/organizers/:id", asyncHandler(async (req, res) => {
    const organizer = await storage.getOrganizer(req.params.id);
    if (!organizer) throw new NotFoundError('Organizer');
    res.json(organizer);
  }));

  app.post("/api/organizers", isAuthenticated, asyncHandler(async (req: any, res) => {
    const data = insertOrganizerSchema.parse(req.body);
    const userId = req.user.claims.sub;
    const organizer = await storage.createOrganizer({ ...data, createdBy: userId });
    res.json(organizer);
  }));

  app.patch("/api/organizers/:id", isAuthenticated, asyncHandler(async (req: any, res) => {
    const organizer = await storage.getOrganizer(req.params.id);
    if (!organizer) throw new NotFoundError('Organizer');
    
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!canModifyResource(userId, organizer.createdBy, user?.isAdmin || false)) {
      throw new ForbiddenError("You don't have permission to modify this organizer");
    }
    
    const data = insertOrganizerSchema.parse(req.body);
    const updated = await storage.updateOrganizer(req.params.id, data);
    if (!updated) throw new NotFoundError('Organizer');
    res.json(updated);
  }));

  app.delete("/api/organizers/:id", isAuthenticated, asyncHandler(async (req: any, res) => {
    const organizer = await storage.getOrganizer(req.params.id);
    if (!organizer) throw new NotFoundError('Organizer');
    
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!canModifyResource(userId, organizer.createdBy, user?.isAdmin || false)) {
      throw new ForbiddenError("You don't have permission to delete this organizer");
    }
    
    const deleted = await storage.deleteOrganizer(req.params.id);
    if (!deleted) throw new NotFoundError('Organizer');
    res.json({ success: true });
  }));

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

  // Seed motorcycle models from comprehensive database
  app.post("/api/seed-motorcycles", isAuthenticated, async (req, res) => {
    try {
      const result = await seedMotorcycles(storage);
      res.json({
        message: `Successfully seeded ${result.added} motorcycle models`,
        ...result
      });
    } catch (error: any) {
      console.error("Error seeding motorcycle models:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ TRACKDAYS ============
  app.get("/api/trackdays", async (req, res) => {
    const { year, participationStatus } = req.query;
    const result = await storage.getTrackdays({
      year: year as string,
      participationStatus: participationStatus as string,
      limit: 10000,
    });
    
    // Populate track and vehicle data
    const enriched = await Promise.all(result.items.map(async (td) => {
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
      console.log("Received trackday data:", JSON.stringify(req.body, null, 2));
      const data = insertTrackdaySchema.parse(req.body);
      console.log("Validated trackday data:", JSON.stringify(data, null, 2));
      const trackday = await storage.createTrackday(data);
      res.json(trackday);
    } catch (error: any) {
      console.log("Trackday creation error:", error);
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
  app.post("/api/trackdays/:id/calculate-route", externalApiRateLimiter, isAuthenticated, async (req, res) => {
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

  // Count trackdays with route data
  app.get("/api/trackdays/with-routes/count", isAuthenticated, async (req, res) => {
    const result = await storage.getTrackdays({ limit: 10000 });
    const count = result.items.filter(td => td.routeDistance !== null).length;
    res.json({ count });
  });

  // Bulk route recalculation for all trackdays
  app.post("/api/trackdays/recalculate-all-routes", externalApiRateLimiter, isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getTrackdays({ limit: 10000 });
      const settings = await storage.getSettings();
      
      // Filter trackdays that have route data (have been calculated before)
      const trackdaysWithRoutes = result.items.filter(td => td.routeDistance !== null);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ trackdayId: string; error: string }> = [];
      
      for (const trackday of trackdaysWithRoutes) {
        try {
          const track = await storage.getTrack(trackday.trackId);
          if (!track) {
            errorCount++;
            errors.push({ trackdayId: trackday.id, error: "Track not found" });
            continue;
          }
          
          const vehicle = trackday.vehicleId ? await storage.getVehicle(trackday.vehicleId) : null;
          
          // Calculate route
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
          await storage.updateTrackday(trackday.id, {
            routeDistance: distanceKm,
            routeDuration: routeData.duration,
            routeFuelCost: fuelCostCents,
            routeTollsCost: tollsCostCents,
            routeGeometry: routeData.geometry,
          });
          
          // Create/update auto-generated travel cost items
          const existingCosts = await storage.getCostItems(trackday.id);
          const autoTravelCosts = existingCosts.filter(c => c.isTravelAuto);
          
          // Delete old auto costs
          for (const cost of autoTravelCosts) {
            await storage.deleteCostItem(cost.id);
          }
          
          // Create new auto costs
          if (fuelCostCents > 0) {
            await storage.createCostItem({
              trackdayId: trackday.id,
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
              trackdayId: trackday.id,
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
          
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push({ trackdayId: trackday.id, error: error.message });
        }
      }
      
      res.json({
        total: trackdaysWithRoutes.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
  app.get("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    const { id } = req.params;
    const vehicle = await storage.getVehicle(id);
    
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    // Check authorization
    if (!canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    res.json(vehicle);
  });

  app.get("/api/vehicles", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const result = await storage.getVehiclesByUserId(userId, { limit: 10000 });
    
    // Populate maintenance logs
    const enriched = await Promise.all(result.items.map(async (v) => {
      const maintenance = await storage.getMaintenanceLogs(v.id);
      return { ...v, maintenance };
    }));
    
    res.json(enriched);
  });

  app.post("/api/vehicles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertVehicleSchema.parse({ ...req.body, userId });
      const vehicle = await storage.createVehicle(data);
      analyticsCache.invalidateUser(userId);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertVehicleSchema.parse({ ...req.body, userId });
      const vehicle = await storage.updateVehicle(req.params.id, data);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      analyticsCache.invalidateUser(userId);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const deleted = await storage.deleteVehicle(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Vehicle not found" });
    analyticsCache.invalidateUser(userId);
    res.json({ success: true });
  });

  // ============ MOTORCYCLE MODELS ============
  app.get("/api/motorcycle-models", async (req, res) => {
    const isActiveFilter = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const models = await storage.getMotorcycleModels(isActiveFilter !== undefined ? { isActive: isActiveFilter } : undefined);
    res.json(models);
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
  app.get("/api/weather/:trackdayId", weatherRateLimiter, async (req, res) => {
    ensureFreshCache();
    
    const cache = await storage.getWeatherCache(req.params.trackdayId);
    if (cache) {
      const isStale = isWeatherCacheStale(cache.fetchedAt);
      res.json({
        ...cache,
        isStale,
        cacheAge: getCacheAge(cache.fetchedAt),
      });
    } else {
      res.status(404).json({ error: "Weather not cached" });
    }
  });

  app.post("/api/weather/:trackdayId/refresh", weatherRateLimiter, isAuthenticated, async (req, res) => {
    ensureFreshCache();
    
    const trackday = await storage.getTrackday(req.params.trackdayId);
    if (!trackday) return res.status(404).json({ error: "Trackday not found" });
    
    const track = await storage.getTrack(trackday.trackId);
    if (!track) return res.status(404).json({ error: "Track not found" });
    
    const settings = await storage.getSettings();
    const existingCache = await storage.getWeatherCache(req.params.trackdayId);
    
    try {
      const weather = await fetchWeather(
        track.lat,
        track.lng,
        trackday.startDate,
        settings.openWeatherApiKey
      );
      
      const cache = await storage.setWeatherCache({
        trackdayId: req.params.trackdayId,
        fetchedAt: new Date().toISOString(),
        ...weather,
      });
      
      res.json(cache);
    } catch (error) {
      const errorType = (error as any).type || 'unknown';
      console.error(`Weather refresh failed (${errorType}), attempting fallback:`, error instanceof Error ? error.message : String(error));
      
      // If we have stale cache, return it instead of failing
      if (existingCache) {
        console.log('Returning stale weather cache due to API failure');
        res.json(existingCache);
      } else {
        // No cache exists, return mock data
        console.log('No weather cache available, returning mock data');
        const mockWeather = {
          temperature: 18 + Math.round(Math.random() * 8),
          rainChance: Math.round(Math.random() * 40),
          windSpeed: 10 + Math.round(Math.random() * 15),
          description: "partly cloudy",
        };
        
        const cache = await storage.setWeatherCache({
          trackdayId: req.params.trackdayId,
          fetchedAt: new Date().toISOString(),
          ...mockWeather,
        });
        
        res.json(cache);
      }
    }
  });

  // ============ SUMMARY/ANALYTICS ============
  app.get("/api/summary/stats", async (req, res) => {
    const result = await storage.getTrackdays({ limit: 10000 });
    const costItems = await storage.getCostItems();
    const maintenanceLogs = await storage.getMaintenanceLogs();
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();
    
    const thisYearTrackdays = result.items.filter(td => td.startDate.startsWith(currentYear));
    const upcomingTrackdays = result.items.filter(td => 
      td.startDate >= today && td.participationStatus !== "cancelled"
    );
    
    // Get trackday IDs for registered and attended trackdays
    const registeredTrackdayIds = new Set(
      thisYearTrackdays
        .filter(td => td.participationStatus === "registered" || td.participationStatus === "attended")
        .map(td => td.id)
    );
    
    // Count all paid costs + costs for registered/attended trackdays (assumes registration = paid)
    const totalCostCents = costItems.reduce((sum, c) => {
      // Include if marked as paid OR if it's for a registered/attended trackday
      if (c.status === "paid" || registeredTrackdayIds.has(c.trackdayId)) {
        return sum + c.amountCents;
      }
      return sum;
    }, 0);
    
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
      const result = await storage.getTrackdays({ limit: 10000 });
      
      // Calculate activity stats for each user
      const usersWithStats = users.map(user => {
        const userTrackdays = result.items.filter(td => {
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
      const result = await storage.getTrackdays({ limit: 10000 });
      
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
  // GET checklist items by query parameter (used by frontend)
  app.get("/api/maintenance_plan_checklists", isAuthenticated, async (req: any, res) => {
    try {
      const planId = req.query.planId as string;
      if (!planId) return res.status(400).json({ error: "planId is required" });
      
      const plan = await storage.getMaintenancePlan(planId);
      if (!plan) return res.status(404).json({ error: "Maintenance plan not found" });
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!canModifyResource(userId, plan.ownerUserId || "", user?.isAdmin || false)) {
        return res.status(403).json({ error: "You don't have permission to view this plan's items" });
      }
      
      const items = await storage.getPlanChecklistItems(planId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET checklist items by path parameter (alternative endpoint)
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
          // Populate plan details and checklist items
          const planDetails = await storage.getMaintenancePlan(plan.planId);
          const checklistItems = await storage.getPlanChecklistItems(plan.planId);
          filteredPlans.push({
            ...plan,
            plan: planDetails,
            checklistItems
          });
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      
      const result = await storage.getMaintenanceTasks({ 
        vehiclePlanId: vehiclePlanId as string,
        status: status as string,
        vehicleId: vehicleId as string,
        limit: 10000
      });
      
      const enrichedTasks = [];
      for (const task of result.items) {
        const vehiclePlan = await storage.getVehiclePlan(task.vehiclePlanId);
        if (vehiclePlan) {
          const vehicle = await storage.getVehicle(vehiclePlan.vehicleId);
          if (vehicle && canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
            const plan = await storage.getMaintenancePlan(vehiclePlan.planId);
            let checklistItemTitle = task.customTitle || "Untitled Task";
            
            if (task.checklistItemId && plan) {
              const checklistItems = await storage.getPlanChecklistItems(plan.id);
              const checklistItem = checklistItems.find(item => item.id === task.checklistItemId);
              if (checklistItem) {
                checklistItemTitle = checklistItem.title;
              }
            }
            
            enrichedTasks.push({
              ...task,
              vehicle,
              planName: plan?.name || "Unknown Plan",
              checklistItemTitle,
            });
          }
        }
      }
      
      res.json(enrichedTasks);
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      analyticsCache.invalidateUser(vehicle.userId);
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
      
      analyticsCache.invalidateUser(vehicle.userId);
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
      
      analyticsCache.invalidateUser(vehicle.userId);
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
      
      analyticsCache.invalidateUser(vehicle.userId);
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
      
      const cached = analyticsCache.getMaintenanceAnalytics(userId);
      if (cached) {
        return res.json(cached);
      }
      
      const vehiclesResult = await storage.getVehiclesByUserId(userId, { limit: 10000 });
      
      if (vehiclesResult.items.length === 0) {
        return res.json({
          totalTasks: 0,
          completedTasks: 0,
          dismissedTasks: 0,
          overdueTasks: 0,
          dueSoonTasks: 0,
          completionRate: 0,
          averageCompletionTimeDays: 0,
          tasksByStatus: { pending: 0, due: 0, overdue: 0, snoozed: 0, completed: 0, dismissed: 0 },
          tasksByVehicle: [],
        });
      }
      
      const allTasksPromises = vehiclesResult.items.map(v => storage.getMaintenanceTasks({ vehicleId: v.id, limit: 10000 }));
      const allTasksArrays = await Promise.all(allTasksPromises);
      const userTasks = allTasksArrays.flatMap(result => result.items);
      
      const tasksByVehicleId = new Map<string, any[]>();
      for (let i = 0; i < vehiclesResult.items.length; i++) {
        tasksByVehicleId.set(vehiclesResult.items[i].id, allTasksArrays[i].items);
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
      
      const pendingTasks = userTasks.filter(t => t.status === 'pending');
      const dueTasks = userTasks.filter(t => t.status === 'due');
      const snoozedTasks = userTasks.filter(t => t.status === 'snoozed');
      
      const overduePending = pendingTasks.filter(t => t.dueAt && new Date(t.dueAt) < now).length;
      const overdueDue = dueTasks.filter(t => t.dueAt && new Date(t.dueAt) < now).length;
      const overdueSnoozed = snoozedTasks.filter(t => t.dueAt && new Date(t.dueAt) < now).length;
      const totalOverdue = overduePending + overdueDue + overdueSnoozed;
      
      const tasksByStatus = {
        pending: pendingTasks.length - overduePending,
        due: dueTasks.length - overdueDue,
        overdue: totalOverdue,
        snoozed: snoozedTasks.length - overdueSnoozed,
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
      
      const result = {
        totalTasks,
        completedTasks: completedTasks.length,
        dismissedTasks: dismissedTasks.length,
        overdueTasks: overdueTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        completionRate: Math.round(completionRate * 10) / 10,
        averageCompletionTimeDays: Math.round(averageCompletionTimeDays * 10) / 10,
        tasksByStatus,
        tasksByVehicle: tasksByVehicle.filter(v => v.totalTasks > 0),
      };
      
      analyticsCache.setMaintenanceAnalytics(userId, result);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get enriched task list for analytics drill-down
  app.get("/api/maintenance/analytics/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = req.user;
      
      const cached = analyticsCache.getEnrichedTasks(userId);
      if (cached) {
        return res.json(cached);
      }
      
      const vehiclesResult = await storage.getVehiclesByUserId(userId, { limit: 10000 });
      
      if (vehiclesResult.items.length === 0) {
        return res.json([]);
      }
      
      const allTasksPromises = vehiclesResult.items.map(v => storage.getMaintenanceTasks({ vehicleId: v.id, limit: 10000 }));
      const allTasksArrays = await Promise.all(allTasksPromises);
      const userTasks = allTasksArrays.flatMap(result => result.items);
      
      if (userTasks.length === 0) {
        return res.json([]);
      }
      
      const uniqueVehiclePlanIds = Array.from(new Set(userTasks.map(t => t.vehiclePlanId)));
      const vehiclePlans = await Promise.all(
        uniqueVehiclePlanIds.map(id => storage.getVehiclePlan(id))
      );
      const vehiclePlanMap = new Map(vehiclePlans.filter(Boolean).map(vp => [vp!.id, vp]));
      
      const uniquePlanIds = Array.from(new Set(vehiclePlans.filter(Boolean).map(vp => vp!.planId)));
      const plans = await Promise.all(
        uniquePlanIds.map(id => storage.getMaintenancePlan(id))
      );
      const planMap = new Map(plans.filter(Boolean).map(p => [p!.id, p]));
      
      const allChecklistItemPromises = uniquePlanIds.map(planId => 
        storage.getPlanChecklistItems(planId)
      );
      const allChecklistItemArrays = await Promise.all(allChecklistItemPromises);
      const allChecklistItems = allChecklistItemArrays.flat();
      const checklistItemMap = new Map(allChecklistItems.map(item => [item.id, item]));
      
      const vehicleMap = new Map(vehiclesResult.items.map(v => [v.id, v]));
      
      const enrichedTasks = [];
      
      for (const task of userTasks) {
        const vehiclePlan = vehiclePlanMap.get(task.vehiclePlanId);
        if (!vehiclePlan) continue;
        
        const vehicle = vehicleMap.get(vehiclePlan.vehicleId);
        if (!vehicle || !canModifyResource(userId, vehicle.userId, user?.isAdmin || false)) {
          continue;
        }
        
        const plan = planMap.get(vehiclePlan.planId);
        let checklistItemTitle = task.customTitle || "Untitled Task";
        let maintenanceType = null;
        let isCritical = false;
        
        if (task.checklistItemId) {
          const checklistItem = checklistItemMap.get(task.checklistItemId);
          if (checklistItem) {
            checklistItemTitle = checklistItem.title;
            maintenanceType = checklistItem.maintenanceType;
            isCritical = checklistItem.isCritical;
          }
        }
        
        const now = new Date();
        const isOverdue = task.dueAt && 
          (task.status === 'pending' || task.status === 'due' || task.status === 'snoozed') && 
          new Date(task.dueAt) < now;
        
        const effectiveStatus = isOverdue ? 'overdue' : task.status;
        
        enrichedTasks.push({
          ...task,
          vehicle,
          planName: plan?.name || "Unknown Plan",
          checklistItemTitle,
          maintenanceType,
          isCritical,
          effectiveStatus,
          isOverdue,
        });
      }
      
      analyticsCache.setEnrichedTasks(userId, enrichedTasks);
      res.json(enrichedTasks);
    } catch (error: any) {
      console.error("Error fetching enriched tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ MAINTENANCE SCHEDULING ============
  app.post("/api/maintenance/process-triggers", isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { TriggerProcessor } = await import("./triggerProcessor.ts");
    const processor = new TriggerProcessor(storage);
    
    await processor.processAllTriggers();
    await processor.updateTaskStatuses();
    
    analyticsCache.invalidateAll();
    
    logger.business('Maintenance triggers processed', {
      userId,
      action: 'processTriggers',
    }, 'maintenance');
    
    res.json({ success: true, message: "Trigger processing completed" });
  }));

  // Send notification emails for due tasks
  app.post("/api/maintenance/send-notifications", isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { NotificationCoordinator } = await import("./notificationCoordinator.ts");
    const { emailService } = await import("./emailService.ts");
    
    const coordinator = new NotificationCoordinator(storage, emailService);
    await coordinator.sendDueTaskNotifications();
    
    logger.business('Maintenance notifications sent', {
      userId,
      action: 'sendNotifications',
    }, 'maintenance');
    
    res.json({ success: true, message: "Notifications sent successfully" });
  }));

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

  // ============ ADMIN DATA MANAGEMENT ============
  
  // Configure multer for file uploads (memory storage for small CSV files)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

  // Export motorcycle models as CSV
  app.get("/api/admin/reference-data/motorcycle-models/export", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const models = await storage.getMotorcycleModels();
      
      const csvData = Papa.unparse(models.map(m => ({
        name: m.name,
        isActive: m.isActive,
        displayOrder: m.displayOrder,
      })), {
        header: true,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="motorcycle-models.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting motorcycle models:", error);
      res.status(500).json({ error: "Failed to export motorcycle models" });
    }
  });

  // Export tracks as CSV
  app.get("/api/admin/reference-data/tracks/export", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tracks = await storage.getTracks();
      
      const csvData = Papa.unparse(tracks.map(t => ({
        name: t.name,
        country: t.country,
        lat: t.lat,
        lng: t.lng,
        organizerName: t.organizerName || "",
        organizerWebsite: t.organizerWebsite || "",
      })), {
        header: true,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tracks.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting tracks:", error);
      res.status(500).json({ error: "Failed to export tracks" });
    }
  });

  // Export organizers as CSV
  app.get("/api/admin/reference-data/organizers/export", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const organizers = await storage.getOrganizers();
      
      const csvData = Papa.unparse(organizers.map(o => ({
        name: o.name,
        website: o.website || "",
        contactEmail: o.contactEmail || "",
        contactPhone: o.contactPhone || "",
        description: o.description || "",
      })), {
        header: true,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="organizers.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting organizers:", error);
      res.status(500).json({ error: "Failed to export organizers" });
    }
  });

  // Import motorcycle models from CSV
  app.post("/api/admin/reference-data/motorcycle-models/import", isAuthenticated, isAdmin, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ error: "CSV parsing error", details: parsed.errors });
      }

      const models = [];
      const errors = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const row: any = parsed.data[i];
        try {
          const model = insertMotorcycleModelSchema.parse({
            name: row.name?.trim(),
            isActive: row.isActive === 'true' || row.isActive === true,
            displayOrder: parseInt(row.displayOrder) || i,
            createdBy: null, // System/admin data
          });
          models.push(model);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: "Validation errors", details: errors });
      }

      await storage.bulkReplaceMotorcycleModels(models);
      res.json({ success: true, imported: models.length });
    } catch (error) {
      console.error("Error importing motorcycle models:", error);
      res.status(500).json({ error: "Failed to import motorcycle models" });
    }
  });

  // Import tracks from CSV
  app.post("/api/admin/reference-data/tracks/import", isAuthenticated, isAdmin, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ error: "CSV parsing error", details: parsed.errors });
      }

      const tracks = [];
      const errors = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const row: any = parsed.data[i];
        try {
          const track = insertTrackSchema.parse({
            name: row.name?.trim(),
            country: row.country?.trim(),
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
            organizerName: row.organizerName?.trim() || "",
            organizerWebsite: row.organizerWebsite?.trim() || "",
            createdBy: null, // System/admin data
          });
          tracks.push(track);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: "Validation errors", details: errors });
      }

      await storage.bulkReplaceTracks(tracks);
      res.json({ success: true, imported: tracks.length });
    } catch (error) {
      console.error("Error importing tracks:", error);
      res.status(500).json({ error: "Failed to import tracks" });
    }
  });

  // Import organizers from CSV
  app.post("/api/admin/reference-data/organizers/import", isAuthenticated, isAdmin, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ error: "CSV parsing error", details: parsed.errors });
      }

      const organizers = [];
      const errors = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const row: any = parsed.data[i];
        try {
          const organizer = insertOrganizerSchema.parse({
            name: row.name?.trim(),
            website: row.website?.trim() || "",
            contactEmail: row.contactEmail?.trim() || "",
            contactPhone: row.contactPhone?.trim() || "",
            description: row.description?.trim() || "",
            createdBy: null, // System/admin data
          });
          organizers.push(organizer);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: "Validation errors", details: errors });
      }

      await storage.bulkReplaceOrganizers(organizers);
      res.json({ success: true, imported: organizers.length });
    } catch (error) {
      console.error("Error importing organizers:", error);
      res.status(500).json({ error: "Failed to import organizers" });
    }
  });

  // ============ MARKETPLACE ============

  app.get("/api/marketplace/listings", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        sellerId: req.query.sellerId as string | undefined,
        search: req.query.search as string | undefined,
        sort: req.query.sort as "newest" | "price_asc" | "price_desc" | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      };
      
      const result = await storage.getMarketplaceListings(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getMarketplaceListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplace/listings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMarketplaceListingSchema.parse(req.body);
      
      const listing = await storage.createMarketplaceListing(data, userId);
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/marketplace/listings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = updateMarketplaceListingSchema.parse(req.body);
      
      const listing = await storage.updateMarketplaceListing(req.params.id, data, userId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found or unauthorized" });
      }
      
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/marketplace/listings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deleted = await storage.deleteMarketplaceListing(req.params.id, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Listing not found or unauthorized" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ OBJECT STORAGE (for marketplace images) ============
  
  const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");
  const { ObjectPermission } = await import("./objectAcl");

  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      const userId = req.user?.claims?.sub;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.post("/api/marketplace/images", isAuthenticated, async (req: any, res) => {
    const imageURLSchema = z.object({
      imageURL: z.string().url("Must be a valid URL"),
    });
    
    const validation = imageURLSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validation.error.errors 
      });
    }

    const userId = req.user.claims.sub;
    const { imageURL } = validation.data;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageURL,
        {
          owner: userId,
          visibility: "public",
        }
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting marketplace image:", error);
      res.status(500).json({ error: "Internal server error" });
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
  
  // Try Google Maps first if API key is available and circuit breaker is closed
  if (googleMapsApiKey && isServiceAvailable('googleMaps')) {
    try {
      const result = await getGoogleDirections(fromLat, fromLng, toLat, toLng, googleMapsApiKey);
      console.log('Route calculated using Google Maps API');
      return result;
    } catch (error) {
      googleMapsError = error instanceof Error ? error : new Error(String(error));
      const errorType = (error as any).type || 'unknown';
      console.error(`Google Maps route calculation failed (${errorType}), will try OpenRouteService:`, googleMapsError.message);
    }
  } else if (googleMapsApiKey && !isServiceAvailable('googleMaps')) {
    console.warn('Google Maps circuit breaker is open, skipping to OpenRouteService');
  }
  
  // Try OpenRouteService if Google Maps failed or no key provided and circuit breaker is closed
  if (openRouteServiceKey && isServiceAvailable('openRouteService')) {
    try {
      const result = await getORSRoute(fromLat, fromLng, toLat, toLng, openRouteServiceKey);
      console.log('Route calculated using OpenRouteService API');
      return result;
    } catch (error) {
      openRouteServiceError = error instanceof Error ? error : new Error(String(error));
      const errorType = (error as any).type || 'unknown';
      console.error(`OpenRouteService route calculation failed (${errorType}), will use Haversine fallback:`, openRouteServiceError.message);
    }
  } else if (openRouteServiceKey && !isServiceAvailable('openRouteService')) {
    console.warn('OpenRouteService circuit breaker is open, skipping to Haversine fallback');
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
    console.log('No OpenWeather API key configured, returning mock data');
    return {
      temperature: 18 + Math.round(Math.random() * 8),
      rainChance: Math.round(Math.random() * 40),
      windSpeed: 10 + Math.round(Math.random() * 15),
      description: ["partly cloudy", "sunny", "overcast"][Math.floor(Math.random() * 3)],
    };
  }
  
  // Check circuit breaker before attempting API call
  if (!isServiceAvailable('openWeather')) {
    throw new Error('OpenWeather circuit breaker is open');
  }
  
  // Use centralized API client with timeout and retry logic
  return await getOpenWeatherForecast(lat, lng, apiKey);
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

const WEATHER_CACHE_TTL_HOURS = 6;
const WEATHER_CACHE_MAX_AGE_DAYS = 30;

function getCacheAgeHours(fetchedAt: string): number {
  const fetchedDate = new Date(fetchedAt);
  const now = new Date();
  return (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60);
}

function isWeatherCacheStale(fetchedAt: string): boolean {
  return getCacheAgeHours(fetchedAt) >= WEATHER_CACHE_TTL_HOURS;
}

function getCacheAge(fetchedAt: string): { hours: number; minutes: number; isStale: boolean } {
  const fetchedDate = new Date(fetchedAt);
  const now = new Date();
  const ageMs = now.getTime() - fetchedDate.getTime();
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    hours,
    minutes,
    isStale: getCacheAgeHours(fetchedAt) >= WEATHER_CACHE_TTL_HOURS,
  };
}
