import { JsonController, Get, Res, Req } from "routing-controllers";
import logger from "../utils/logger";
import { encrypt } from "../utils/crypto";
import { Request, Response } from "express";

@JsonController("/test")
export class TestController {

  @Get("/")
  async getTest(@Req() req: Request, @Res() res: Response) {
    logger.info("Test endpoint hit");
    return res.json({ data: encrypt({ message: "Hello from controller🚀 ", data: { name: "John Doe", age: 30 } }) });
  }
}