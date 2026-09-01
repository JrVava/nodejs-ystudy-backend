import fs from "fs";
import path from "path";
import { QueryBuilder } from "../QueryBuilder";
import { ObjectId } from "mongodb";

export const navigationSeeder = async () => {
  const filePath = path.join(__dirname, "../data/navigations.json");
  const rawData = fs.readFileSync(filePath, "utf8");
  const parsedData = JSON.parse(rawData);

  const navigations = parsedData.map((item: any) => {
    return {
      ...item,
      _id: item._id?.$oid ? new ObjectId(item._id.$oid) : new ObjectId(),
      parentId: item.parentId?.$oid ? new ObjectId(item.parentId.$oid) : null,
      createdAt: item.createdAt?.$date ? new Date(item.createdAt.$date) : new Date(),
      updatedAt: item.updatedAt?.$date ? new Date(item.updatedAt.$date) : new Date(),
    };
  });

  const qb = new QueryBuilder("navigations");

  // Insert new navigations or update existing ones
  let insertedCount = 0;
  let updatedCount = 0;
  for (const nav of navigations) {
    const existing = await qb.findById(nav._id);
    if (!existing) {
      await qb.insertOne(nav);
      insertedCount++;
    } else {
      // Exclude _id from the update to avoid immutable field errors
      const { _id, ...updateData } = nav;
      await qb.updateById(nav._id, updateData);
      updatedCount++;
    }
  }

  // Delete navigations that are no longer in the JSON file
  const jsonNavIds = navigations.map((nav: any) => nav._id);
  const deleteResult = await qb.deleteMany({ _id: { $nin: jsonNavIds } });
  const deletedCount = deleteResult.deletedCount || 0;

  console.log(`✅ Navigations seeded. Inserted: ${insertedCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}`);
};
