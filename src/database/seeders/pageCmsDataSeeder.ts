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
    const { _id, ...updateData } = page;
    
    const existing = await qb.findOne({ page: page.page });
    
    if (existing) {
      // Completely replace the document to ensure deleted sections are removed
      await qb.deleteOne({ _id: existing._id });
      await qb.insertOne({ 
        ...updateData, 
        _id: existing._id, 
        createdAt: existing.createdAt, 
        updatedAt: new Date() 
      });
    } else {
      await qb.insertOne({ 
        ...updateData, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
    }
    
    processedCount++;
  }

  // Delete page CMS data that are no longer in the JSON file entirely
  const jsonPages = parsedData.map((page: any) => page.page);
  const deleteResult = await qb.deleteMany({ page: { $nin: jsonPages } });
  const deletedCount = deleteResult.deletedCount || 0;

  console.log(`✅ Page CMS Data seeded. Processed: ${processedCount}, Deleted: ${deletedCount}`);
};
