import { db } from "./db";
import { tracks } from "@shared/schema";
import seedData from "./seed-tracks.json";

async function seedTracks() {
  try {
    console.log("🌱 Starting track seeding...");
    
    // Check if tracks already exist
    const existing = await db.select().from(tracks);
    if (existing.length > 0) {
      console.log(`⚠️  Database already has ${existing.length} tracks. Skipping seed.`);
      console.log("   To re-seed, delete all tracks first.");
      return;
    }
    
    // Insert all tracks
    console.log(`📍 Inserting ${seedData.length} tracks...`);
    await db.insert(tracks).values(seedData);
    
    console.log(`✅ Successfully seeded ${seedData.length} tracks!`);
    console.log("   Tracks are now available in your Trackday Planner.");
    
  } catch (error) {
    console.error("❌ Error seeding tracks:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTracks()
    .then(() => {
      console.log("✅ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export { seedTracks };
