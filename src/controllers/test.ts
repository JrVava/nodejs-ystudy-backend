// src/controllers/test.controller.ts

import { JsonController, Get } from "routing-controllers";
import logger from "../utils/logger";
import { getDB } from "../database/mongo";
 
@JsonController("/test")
export class TestController {
  
  @Get("/")
  async getTest() {
    // const db = getDB();
    // await db.collection("users").insertOne({ name: "Ashish" });
    logger.info("Test endpoint hit");
    return { message: "Hello from controller🚀 ",data: { name: "John Doe", age: 30 } };
  }
}