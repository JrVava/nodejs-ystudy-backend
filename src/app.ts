import "reflect-metadata";
import express from "express";
import cors from "cors";
import { useExpressServer } from "routing-controllers";
import path from "path";
import { config } from "./config";
import { connectDB } from "./database/mongo";
import { decrypt, encrypt } from "./utils/crypto";
import { HttpErrorHandler } from "./utils/HttpErrorHandler";

const baseUrl = __dirname;

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initialize();
  }

  private async initialize() {
    // ✅ CONNECT DB FIRST
    await connectDB();

    // ✅ APPLY CORS GLOBALLY BEFORE ROUTES
    this.app.use(cors());

    // ✅ INIT routing-controllers FIRST
    this.app = useExpressServer(this.app, {
      cors: true,
      routePrefix: "/api",
      defaultErrorHandler: false,
      middlewares: [HttpErrorHandler],
      controllers: [
        path.join(baseUrl, "/controllers/**/*.{ts,js}"),
      ],
    });

    // ✅ THEN APPLY BODY PARSER (ONLY FOR CUSTOM ROUTES)
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // ✅ SERVE STATIC MEDIA FOLDER
    this.app.use("/media", express.static(path.join(__dirname, "../media")));

    // ✅ CUSTOM ROUTES AFTER BODY PARSER
    this.routes();
  }

  private routes() {
    this.app.post("/api/raw-encrypt", (req, res) => {
      try {
        const decryptedData = req.body;

        if (!decryptedData) {
          return res.status(400).json({
            success: false,
            message: "Missing decrypted data",
          });
        }

        const encrypted = encrypt(decryptedData);

        return res.json({
          data: encrypted,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({
          success: false,
          message: "Encryption failed",
        });
      }
    });

    this.app.post("/api/raw-decrypt", (req, res) => {
      try {

        const encryptedData = req.body?.data;

        if (!encryptedData) {
          return res.status(400).json({
            success: false,
            message: "Missing encrypted data",
          });
        }

        const decrypted = decrypt(encryptedData);

        return res.json({
          data: decrypted,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({
          success: false,
          message: "Decryption failed",
        });
      }
    });
  }

  public start() {
    this.app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  }
}