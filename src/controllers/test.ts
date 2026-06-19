// src/controllers/test.controller.ts

import { JsonController, Get } from "routing-controllers";
import logger from "../utils/logger";

@JsonController("/test")
export class TestController {
  
  @Get("/")
  getTest() {
    logger.info("Test endpoint hit");
    return { message: "Hello from controller🚀 ",data: { name: "John Doe", age: 30 } };
  }
}