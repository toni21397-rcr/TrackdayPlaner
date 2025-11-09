import { IStorage } from "./storage";
import seedData from "./seed-tracks.json";
import { logger } from "./logger";

/**
 * Seeds the database with comprehensive track data
 * Only adds tracks that don't already exist (by name+country)
 */
export async function seedTracks(storage: IStorage): Promise<{ added: number; skipped: number; total: number }> {
  try {
    logger.info('Starting track seeding', { totalTracks: seedData.length }, 'seedTracks');
    
    // Get existing tracks
    const existingTracks = await storage.getTracks();
    const existingKeys = new Set(
      existingTracks.map(t => `${t.name.toLowerCase()}|${t.country.toLowerCase()}`)
    );
    
    // Filter out tracks that already exist
    const tracksToAdd = seedData.filter(track => {
      const key = `${track.name.toLowerCase()}|${track.country.toLowerCase()}`;
      return !existingKeys.has(key);
    });
    
    if (tracksToAdd.length === 0) {
      logger.info('All tracks already exist in database', {
        totalTracks: seedData.length,
      }, 'seedTracks');
      return { added: 0, skipped: seedData.length, total: seedData.length };
    }
    
    // Insert new tracks
    logger.info('Adding new tracks', {
      tracksToAdd: tracksToAdd.length,
    }, 'seedTracks');
    for (const track of tracksToAdd) {
      await storage.createTrack(track);
    }
    
    const added = tracksToAdd.length;
    const skipped = seedData.length - added;
    
    logger.info('Track seeding completed', {
      added,
      skipped,
      total: seedData.length,
    }, 'seedTracks');
    
    return { added, skipped, total: seedData.length };
  } catch (error) {
    logger.error('Error seeding tracks', {
      error: error instanceof Error ? error.message : String(error),
    }, 'seedTracks');
    throw error;
  }
}
