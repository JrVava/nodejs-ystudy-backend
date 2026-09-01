import fs from "fs";
import path from "path";
import { QueryBuilder } from "../QueryBuilder";
import { ObjectId } from "mongodb";

const processCmsObject = (obj: any) => {
  if (Array.isArray(obj)) {
    obj.forEach(processCmsObject);
  } else if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === 'image') {
        if (obj[key] && typeof obj[key] === 'string' && ObjectId.isValid(obj[key])) {
          obj[key] = new ObjectId(obj[key]);
        } else if (obj[key] && obj[key].$oid) {
          obj[key] = new ObjectId(obj[key].$oid);
        } else if (obj[key] === "") {
          obj[key] = null;
        }
      } else {
        processCmsObject(obj[key]);
      }
    }
  }
};

export const pageCmsDataSeeder = async () => {
  const filePath = path.join(__dirname, "../data/page_cms_data.json");
  const rawData = fs.readFileSync(filePath, "utf8");
  const parsedData = JSON.parse(rawData);

  const qb = new QueryBuilder("page_cms_data");

  let processedCount = 0;
  for (const page of parsedData) {
    processCmsObject(page);
    
    // Exclude _id to avoid immutable field errors on update
    const { _id, ...updateData } = page;
    
    await qb.upsertOne(
      { page: page.page },
      {
        $set: { ...updateData, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      }
    );
    processedCount++;
  }

  // Delete page CMS data that are no longer in the JSON file
  const jsonPages = parsedData.map((page: any) => page.page);
  const deleteResult = await qb.deleteMany({ page: { $nin: jsonPages } });
  const deletedCount = deleteResult.deletedCount || 0;

  console.log(`✅ Page CMS Data seeded. Processed: ${processedCount}, Deleted: ${deletedCount}`);
};
