import { IStorage } from "./storage";
import seedData from "./seed-tracks.json";

/**
 * Seeds the database with comprehensive track data
 * Only adds tracks that don't already exist (by name+country)
 */
export async function seedTracks(storage: IStorage): Promise<{ added: number; skipped: number; total: number }> {
  try {
    console.log("🌱 Starting track seeding...");
    
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
      console.log(`✅ All ${seedData.length} tracks already exist in database.`);
      return { added: 0, skipped: seedData.length, total: seedData.length };
    }
    
    // Insert new tracks
    console.log(`📍 Adding ${tracksToAdd.length} new tracks...`);
    for (const track of tracksToAdd) {
      await storage.createTrack(track);
    }
    
    const added = tracksToAdd.length;
    const skipped = seedData.length - added;
    
    console.log(`✅ Successfully seeded ${added} tracks!`);
    console.log(`   (Skipped ${skipped} existing tracks)`);
    
    return { added, skipped, total: seedData.length };
  } catch (error) {
    console.error("❌ Error seeding tracks:", error);
    throw error;
  }
}
