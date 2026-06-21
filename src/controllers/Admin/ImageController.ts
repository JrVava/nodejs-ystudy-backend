import { JsonController, Post, Get, Body, Param, UploadedFile, HttpError } from "routing-controllers";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadQueue } from "../../queue/uploadQueue";

const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// We use memory storage to capture the chunk buffer and write it manually
const storage = multer.memoryStorage();
const uploadOptions = { storage };

interface UploadSession {
  id: string;
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  status: "uploading" | "paused" | "completed" | "processing";
  jobId?: string;
}

const activeUploads: Record<string, UploadSession> = {};

@JsonController("/upload")
export class ImageController {
  @Post("/init")
  initUpload(@Body() body: { fileName: string; totalSize: number }) {
    const uploadId = uuidv4();
    activeUploads[uploadId] = {
      id: uploadId,
      fileName: body.fileName,
      totalSize: body.totalSize,
      uploadedBytes: 0,
      status: "uploading",
    };
    return { uploadId };
  }

  @Post("/chunk/:uploadId")
  async uploadChunk(
    @Param("uploadId") uploadId: string,
    @UploadedFile("chunk", { options: uploadOptions }) file: any,
    @Body() body: any
  ) {
    const session = activeUploads[uploadId];
    if (!session) throw new HttpError(404, "Upload session not found");
    if (session.status === "paused") throw new HttpError(400, "Upload is paused");

    const filePath = path.join(uploadDir, `${uploadId}-${session.fileName}`);
    
    // Simulate network delay so the user can visibly see the ETA and progress bar
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Append buffer to file
    if (file && file.buffer) {
       fs.appendFileSync(filePath, file.buffer);
       session.uploadedBytes += file.buffer.length;
    }

    return { success: true, uploadedBytes: session.uploadedBytes };
  }

  @Post("/complete/:uploadId")
  async completeUpload(@Param("uploadId") uploadId: string) {
    const session = activeUploads[uploadId];
    if (!session) throw new HttpError(404, "Upload session not found");

    session.status = "processing";
    
    // Add to queue
    const job = await uploadQueue.add("processImage", {
      uploadId: session.id,
      fileName: session.fileName,
    });
    
    session.jobId = job.id!;

    return { success: true, jobId: job.id };
  }

  @Get("/status/:uploadId")
  async getStatus(@Param("uploadId") uploadId: string) {
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
  }

  @Post("/pause/:uploadId")
  pauseUpload(@Param("uploadId") uploadId: string) {
    const session = activeUploads[uploadId];
    if (!session) throw new HttpError(404, "Upload session not found");
    session.status = "paused";
    return { success: true };
  }

  @Post("/cancel/:uploadId")
  cancelUploadServer(@Param("uploadId") uploadId: string) {
    const session = activeUploads[uploadId];
    if (session) {
      const filePath = path.join(uploadDir, `${uploadId}-${session.fileName}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      delete activeUploads[uploadId];
    }
    return { success: true };
  }

  @Post("/resume/:uploadId")
  resumeUpload(@Param("uploadId") uploadId: string) {
    const session = activeUploads[uploadId];
    if (!session) throw new HttpError(404, "Upload session not found");
    session.status = "uploading";
    return { success: true, uploadedBytes: session.uploadedBytes };
  }
}
