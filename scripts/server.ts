// scripts/server.ts
import { seedDatabase } from "../src/lib/seed";

(async () => {
  try {
    await seedDatabase();
    console.log("✅ Seeded database with dummy data.");
    process.exit(0); // Add this line to exit cleanly
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
})();
