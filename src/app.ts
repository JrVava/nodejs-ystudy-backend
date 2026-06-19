// src/app.ts

import "reflect-metadata";
import express from "express";
import { useExpressServer } from "routing-controllers";
import path from "path";
import { config } from "./config";
import { decryptMiddleware } from "./middleware/decrypt";
import { encryptMiddleware } from "./middleware/encrypted";
import { decrypt } from "./utils/crypto";


const baseUrl = __dirname;

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initialize();
  }

  private initialize() {
    this.app.use(express.json());

    // ✅ APPLY GLOBAL MIDDLEWARES HERE
    this.app.use(decryptMiddleware);
    this.app.use(encryptMiddleware);

    this.app = useExpressServer(this.app, {
      cors: false,
      routePrefix: "/api",
      controllers: [
        path.join(baseUrl, "/controllers/*.{ts,js}"),
      ],
    });

    this.routes();
  }

  private routes() {
    this.app.post("/api/raw-decrypt", (req, res) => {
      try {
        const encryptedData = req.body?.data;
        if (!encryptedData) {
          return res.status(400).json({
            message: "Missing encrypted data",
          });
        }

        const decrypted = decrypt(encryptedData);
        return res.json({
          success: true,
          decrypted,
        });

      } catch (error) {
        return res.status(400).json({
          message: "Invalid encrypted payload",
        });
      }
    });

    this.app.get("/download", (req, res) => {
      res.download("logs/combined.log");
    });

    this.app.get("/server-status", (req, res) => {
      res.status(200).json({ status: "OK" });
    });
  }

  public start() {
    this.app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  }
}