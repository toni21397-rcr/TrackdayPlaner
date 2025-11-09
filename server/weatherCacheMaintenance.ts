import { storage } from "./storage";

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
    
    console.log(JSON.stringify({
      action: 'weatherCacheCleanup',
      removed,
      durationMs,
      maxAgeDays: WEATHER_CACHE_MAX_AGE_DAYS,
    }));
    
    return { removed, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(JSON.stringify({
      action: 'weatherCacheCleanup',
      removed: 0,
      durationMs,
      error: errorMessage,
    }));
    
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
    console.error('Lazy weather cache cleanup failed:', error);
  });
}

export function startPeriodicCleanup(): void {
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  
  console.log('Starting periodic weather cache cleanup (24h interval)');
  
  cleanupOldWeatherCache().then(result => {
    console.log(`Initial weather cache cleanup completed: ${result.removed} entries removed in ${result.durationMs}ms`);
  }).catch(error => {
    console.error('Initial weather cache cleanup failed:', error);
  });
  
  setInterval(() => {
    cleanupOldWeatherCache().then(result => {
      console.log(`Scheduled weather cache cleanup completed: ${result.removed} entries removed in ${result.durationMs}ms`);
    }).catch(error => {
      console.error('Scheduled weather cache cleanup failed:', error);
    });
  }, CLEANUP_INTERVAL_MS);
}
