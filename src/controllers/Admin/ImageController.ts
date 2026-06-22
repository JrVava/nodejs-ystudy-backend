import { JsonController, Post, Get, Body, Param, QueryParam, UploadedFile, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadQueue } from "../../queue/uploadQueue";
import { QueryBuilder } from "../../database/QueryBuilder";
import { Folder } from "../../models/Folder";
import { Media } from "../../models/Media";
import { encrypt } from "../../utils/crypto";
import { UploadSession } from "../../interfaces/UploadSession";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";

const mediaDir = path.join(__dirname, "../../../media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// We use memory storage to capture the chunk buffer and write it manually
const storage = multer.memoryStorage();
const uploadOptions = { storage };
const activeUploads: Record<string, UploadSession> = {};

@JsonController("/upload")
@UseBefore(AdminMiddleware)
export class ImageController {
  @Post("/init")
  initUpload(@Body() body: { fileName: string; totalSize: number; folderName?: string }) {
    try {
      const uploadId = uuidv4();
      activeUploads[uploadId] = {
        id: uploadId,
        fileName: body.fileName,
        totalSize: body.totalSize,
        uploadedBytes: 0,
        status: "uploading",
        folderName: body.folderName,
      };
      return { uploadId };
    } catch (error) {
      logger.error(`[ImageController:initUpload] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/chunk/:uploadId")
  async uploadChunk(
    @Param("uploadId") uploadId: string,
    @UploadedFile("chunk", { options: uploadOptions }) file: any,
    @Body() body: any
  ) {
    try {
      const session = activeUploads[uploadId];
      if (!session) throw new HttpError(404, "Upload session not found");
      if (session.status === "paused") throw new HttpError(400, "Upload is paused");

      const safeFolder = session.folderName ? path.basename(session.folderName) : "uploads";
      const targetDir = path.join(__dirname, "../../../media", safeFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${uploadId}-${session.fileName}`);
      
      // Simulate network delay so the user can visibly see the ETA and progress bar
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Append buffer to file
      if (file && file.buffer) {
         fs.appendFileSync(filePath, file.buffer);
         session.uploadedBytes += file.buffer.length;
      }

      return { success: true, uploadedBytes: session.uploadedBytes };
    } catch (error) {
      logger.error(`[ImageController:uploadChunk] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/complete/:uploadId")
  async completeUpload(@Param("uploadId") uploadId: string) {
    try {
      const session = activeUploads[uploadId];
      if (!session) throw new HttpError(404, "Upload session not found");

      session.status = "processing";
      
      const safeFolder = session.folderName ? path.basename(session.folderName) : "uploads";
      
      // 1. Upsert Folder into DB
      const folderDB = new QueryBuilder<Folder>("folders");
      const folderResult = await folderDB.upsertOne(
        { name: safeFolder },
        { 
          $setOnInsert: { createdAt: new Date() },
          $set: { updatedAt: new Date() }
        }
      );
      
      const folderId = folderResult.upsertedId || (await folderDB.findOne({ name: safeFolder }))?._id;

      // 2. Insert Media into DB
      const mediaDB = new QueryBuilder<Media>("media");
      const filePath = `media/${safeFolder}/${uploadId}-${session.fileName}`;
      
      await mediaDB.insertOne({
        fileName: session.fileName,
        folderId: folderId!,
        uploadId: session.id,
        size: session.totalSize || 0,
        filePath,
        createdAt: new Date()
      });

      // Add to queue
      const job = await uploadQueue.add("processImage", {
        uploadId: session.id,
        fileName: session.fileName,
        folderName: session.folderName,
        totalSize: session.totalSize,
      });
      
      session.jobId = job.id!;

      return { success: true, jobId: job.id };
    } catch (error) {
      logger.error(`[ImageController:completeUpload] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Get("/status/:uploadId")
  async getStatus(@Param("uploadId") uploadId: string) {
    try {
      const session = activeUploads[uploadId];
      if (!session) throw new HttpError(404, "Upload session not found");

      if (session.status === "processing" && session.jobId) {
        const job = await uploadQueue.getJob(session.jobId);
        if (job && job.status === "completed") {
          session.status = "completed";
        }
        const progress = job ? job.progress : 0;
        return { ...session, queueProgress: progress };
      }

      return session;
    } catch (error) {
      logger.error(`[ImageController:getStatus] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/pause/:uploadId")
  pauseUpload(@Param("uploadId") uploadId: string) {
    try {
      const session = activeUploads[uploadId];
      if (!session) throw new HttpError(404, "Upload session not found");
      session.status = "paused";
      return { success: true };
    } catch (error) {
      logger.error(`[ImageController:pauseUpload] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/cancel/:uploadId")
  cancelUploadServer(@Param("uploadId") uploadId: string) {
    try {
      const session = activeUploads[uploadId];
      if (session) {
        const safeFolder = session.folderName ? path.basename(session.folderName) : "uploads";
        const targetDir = path.join(__dirname, "../../../media", safeFolder);
        const filePath = path.join(targetDir, `${uploadId}-${session.fileName}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        delete activeUploads[uploadId];
      }
      return { success: true };
    } catch (error) {
      logger.error(`[ImageController:cancelUploadServer] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/resume/:uploadId")
  resumeUpload(@Param("uploadId") uploadId: string) {
    try {
      const session = activeUploads[uploadId];
      if (!session) throw new HttpError(404, "Upload session not found");
      session.status = "uploading";
      return { success: true, uploadedBytes: session.uploadedBytes };
    } catch (error) {
      logger.error(`[ImageController:resumeUpload] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Get("/list")
  async listImages(
    @QueryParam("page") page: number = 1,
    @QueryParam("limit") limit: number = 10,
    @QueryParam("folderId") folderId?: string
  ) {
    try {
      const mediaDB = new QueryBuilder<Media>("media");
      const filter: any = {};
      
      if (folderId) {
         // Ensure valid ObjectId before filtering
         try {
           filter.folderId = new ObjectId(folderId);
         } catch (e) {
           throw new HttpError(400, "Invalid folderId format");
         }
      }

      // Sort by newest first
      const results = await mediaDB.paginate(filter, Number(page), Number(limit), { createdAt: -1 });
      
      return { 
        success: true, 
        ...results,
        data: results.data.map(m => ({ ...m, _id: m._id?.toString(), folderId: m.folderId?.toString() }))
      };
    } catch (error) {
      logger.error(`[ImageController:listImages] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Get("/folders")
  async listFolders() {
    try {
      const folderDB = new QueryBuilder<Folder>("folders");
      const folders = await folderDB.find({}, { sort: { name: 1 } });
      return { 
        success: true, 
        data: folders.map(f => ({ ...f, _id: f._id?.toString() })) 
      };
    } catch (error) {
      logger.error(`[ImageController:listFolders] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/delete/:mediaId")
  async deleteMedia(@Param("mediaId") mediaId: string) {
    try {
      const mediaDB = new QueryBuilder<Media>("media");
      
      let objId: ObjectId;
      try {
        objId = new ObjectId(mediaId);
      } catch (e) {
        throw new HttpError(400, "Invalid mediaId format");
      }

      const media = await mediaDB.findOne({ _id: objId });
      if (!media) {
        throw new HttpError(404, "Media not found");
      }

      // Delete file from disk
      const absolutePath = path.join(__dirname, "../../../", media.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }

      // Delete from DB
      await mediaDB.deleteById(mediaId);

      return { success: true, message: "Image deleted successfully" };
    } catch (error) {
      logger.error(`[ImageController:deleteMedia] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Get("/seo/:mediaId")
  async getSeo(@Param("mediaId") mediaId: string) {
    try {
      const mediaDB = new QueryBuilder<Media>("media");
      
      let objId: ObjectId;
      try {
        objId = new ObjectId(mediaId);
      } catch (e) {
        throw new HttpError(400, "Invalid mediaId format");
      }

      const media = await mediaDB.findOne({ _id: objId });
      if (!media) {
        throw new HttpError(404, "Media not found");
      }

      const payload = { 
        success: true, 
        data: {
          _id: media._id?.toString(),
          title: media.title || "",
          altText: media.altText || "",
          caption: media.caption || "",
          description: media.description || "",
          fileName: media.fileName,
          filePath: media.filePath
        }
      };
      return { data: encrypt(payload) };
    } catch (error) {
      logger.error(`[ImageController:getSeo] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }

  @Post("/update-seo/:mediaId")
  async updateSeo(
    @Param("mediaId") mediaId: string,
    @Body() body: { altText?: string; title?: string; caption?: string; description?: string }
  ) {
    try {
      const mediaDB = new QueryBuilder<Media>("media");
      
      let objId: ObjectId;
      try {
        objId = new ObjectId(mediaId);
      } catch (e) {
        throw new HttpError(400, "Invalid mediaId format");
      }

      const updateFields: any = {};
      if (body.altText !== undefined) updateFields.altText = body.altText;
      if (body.title !== undefined) updateFields.title = body.title;
      if (body.caption !== undefined) updateFields.caption = body.caption;
      if (body.description !== undefined) updateFields.description = body.description;

      const result = await mediaDB.updateOne({ _id: objId }, { $set: updateFields });

      if (result.matchedCount === 0) {
        throw new HttpError(404, "Media not found");
      }

      return { data: encrypt({ success: true, message: "SEO metadata updated successfully" }) };
    } catch (error) {
      logger.error(`[ImageController:updateSeo] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Internal server error");
    }
  }
}
