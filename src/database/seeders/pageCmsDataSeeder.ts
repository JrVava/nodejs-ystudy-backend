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
    await qb.upsertOne({ page: page.page }, page);
    processedCount++;
  }

  console.log(`✅ Page CMS Data seeded. Processed: ${processedCount}`);
};
