import { readFileSync } from 'fs';

const API_BASE = 'http://localhost:5000/api';

async function importOrganizers() {
  try {
    console.log('Starting organizer import...\n');

    // Step 1: Get and delete all existing organizers
    console.log('Fetching existing organizers...');
    const getResponse = await fetch(`${API_BASE}/organizers`);
    const existingOrganizers = await getResponse.json();
    
    console.log(`Found ${existingOrganizers.length} existing organizers to delete`);
    
    for (const organizer of existingOrganizers) {
      await fetch(`${API_BASE}/organizers/${organizer.id}`, {
        method: 'DELETE',
      });
      console.log(`✓ Deleted: ${organizer.name}`);
    }
    console.log('');

    // Step 2: Read and parse CSV
    console.log('Reading CSV file...');
    const csvContent = readFileSync('attached_assets/european_motorcycle_trackday_organizers_1761830257989.csv', 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} organizers to import\n`);

    // Step 3: Insert new organizers
    let successCount = 0;
    let errorCount = 0;

    for (const line of dataLines) {
      // Parse CSV line (handle quoted fields if any)
      const match = line.match(/^"?([^"]*)"?,(.*)$/);
      if (!match) {
        console.error(`⨯ Failed to parse line: ${line}`);
        errorCount++;
        continue;
      }

      const name = match[1].trim();
      const website = match[2].trim();

      if (!name || !website) {
        console.error(`⨯ Missing name or website in line: ${line}`);
        errorCount++;
        continue;
      }

      try {
        const response = await fetch(`${API_BASE}/organizers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            website,
            contactEmail: "",
            contactPhone: "",
            description: "",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log(`✓ Added: ${name}`);
        successCount++;
      } catch (error) {
        console.error(`⨯ Error adding ${name}:`, error);
        errorCount++;
      }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Success: ${successCount} organizers`);
    console.log(`Errors: ${errorCount} organizers`);
    console.log(`Total: ${dataLines.length} organizers`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importOrganizers()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
