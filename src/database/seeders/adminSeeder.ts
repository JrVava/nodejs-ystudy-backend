;
import { hashPassword } from "../../utils/hash";
import { getDB } from "../mongo";


export const adminSeeder = async () => {
  const db = getDB();

  const adminEmail = "admin@ystudy.com";

  const existing = await db.collection("users").findOne({ email: adminEmail });

  if (existing) {
    console.log("⏭️ Admin already exists");
    return;
  }

  const hashedPassword = await hashPassword("admin123");

  await db.collection("users").insertOne({
    name: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    createdAt: new Date(),
  });

  console.log("✅ Admin seeded");
};