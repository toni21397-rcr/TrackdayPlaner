import { IStorage } from "./storage";
import seedData from "./seed-motorcycles.json";

/**
 * Seeds the database with comprehensive motorcycle model data
 * Only adds models that don't already exist (by make+model combination)
 */
export async function seedMotorcycles(storage: IStorage): Promise<{ added: number; skipped: number; total: number }> {
  try {
    console.log("🏍️  Starting motorcycle model seeding...");
    
    // Get existing motorcycle models
    const existingModels = await storage.getMotorcycleModels();
    const existingKeys = new Set(
      existingModels.map(m => m.name.toLowerCase())
    );
    
    // Filter out models that already exist
    const modelsToAdd = seedData.filter(model => {
      const key = model.name.toLowerCase();
      return !existingKeys.has(key);
    });
    
    if (modelsToAdd.length === 0) {
      console.log(`✅ All ${seedData.length} motorcycle models already exist in database.`);
      return { added: 0, skipped: seedData.length, total: seedData.length };
    }
    
    // Insert new models
    console.log(`🏍️  Adding ${modelsToAdd.length} new motorcycle models...`);
    for (const model of modelsToAdd) {
      await storage.createMotorcycleModel(model);
    }
    
    const added = modelsToAdd.length;
    const skipped = seedData.length - added;
    
    console.log(`✅ Successfully seeded ${added} motorcycle models!`);
    console.log(`   (Skipped ${skipped} existing models)`);
    
    return { added, skipped, total: seedData.length };
  } catch (error) {
    console.error("❌ Error seeding motorcycle models:", error);
    throw error;
  }
}
