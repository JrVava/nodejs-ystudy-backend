;
import { hashPassword } from "../../utils/hash";
import { QueryBuilder } from "../QueryBuilder";

export const adminSeeder = async () => {
  const qb = new QueryBuilder("users");

  const adminEmail = "admin@ystudy.com";

  const existing = await qb.findOne({ email: adminEmail });

  if (existing) {
    console.log("⏭️ Admin already exists");
    return;
  }

  const hashedPassword = await hashPassword("admin123");

  await qb.insertOne({
    name: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    createdAt: new Date(),
  });

  console.log("✅ Admin seeded");
};