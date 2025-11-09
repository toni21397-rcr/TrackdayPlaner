import { storage } from "./storage";
import { logger } from "./logger";

const WEATHER_CACHE_TTL_HOURS = 6;
const WEATHER_CACHE_MAX_AGE_DAYS = 30;

export interface CleanupResult {
  removed: number;
  durationMs: number;
  error?: string;
}

export async function cleanupOldWeatherCache(): Promise<CleanupResult> {
  const startTime = Date.now();
  
  try {
    const removed = await storage.cleanupOldWeatherCache(WEATHER_CACHE_MAX_AGE_DAYS);
    const durationMs = Date.now() - startTime;
    
    logger.debug('Weather cache cleanup completed', {
      removed,
      durationMs,
      maxAgeDays: WEATHER_CACHE_MAX_AGE_DAYS,
    }, 'weatherCache');
    
    return { removed, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Weather cache cleanup failed', {
      removed: 0,
      durationMs,
      error: errorMessage,
    }, 'weatherCache');
    
    return { removed: 0, durationMs, error: errorMessage };
  }
}

let lastCleanupTime = 0;
const LAZY_CLEANUP_THROTTLE_MS = 60 * 60 * 1000;

export function ensureFreshCache(): void {
  const now = Date.now();
  if (now - lastCleanupTime < LAZY_CLEANUP_THROTTLE_MS) {
    return;
  }
  
  lastCleanupTime = now;
  cleanupOldWeatherCache().catch(error => {
    logger.error('Lazy weather cache cleanup failed', { error: error.message }, 'weatherCache');
  });
}

export function startPeriodicCleanup(): void {
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  
  logger.info('Starting periodic weather cache cleanup (24h interval)', {}, 'weatherCache');
  
  cleanupOldWeatherCache().then(result => {
    logger.info('Initial weather cache cleanup completed', {
      removed: result.removed,
      durationMs: result.durationMs,
    }, 'weatherCache');
  }).catch(error => {
    logger.error('Initial weather cache cleanup failed', { error: error.message }, 'weatherCache');
  });
  
  setInterval(() => {
    cleanupOldWeatherCache().then(result => {
      logger.info('Scheduled weather cache cleanup completed', {
        removed: result.removed,
        durationMs: result.durationMs,
      }, 'weatherCache');
    }).catch(error => {
      logger.error('Scheduled weather cache cleanup failed', { error: error.message }, 'weatherCache');
    });
  }, CLEANUP_INTERVAL_MS);
}
