
import { connectDB } from "../mongo";
import { adminSeeder } from "./adminSeeder";
import { navigationSeeder } from "./navigationSeeder";

const seeders = [
  {
    name: "Admin Seeder",
    run: adminSeeder,
  },
  {
    name: "Navigation Seeder",
    run: navigationSeeder,
  },
  // Add more here
  // { name: "Role Seeder", run: roleSeeder },
];

const runSeeders = async () => {
  try {
    console.log("🌱 Starting seeding...");
    await connectDB();
    for (const seeder of seeders) {
      console.log(`🚀 Running: ${seeder.name}`);
      await seeder.run();
    }

    console.log("🎉 All seeders executed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

runSeeders();