export interface UploadSession {
  id: string;
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  status: "uploading" | "paused" | "completed" | "processing";
  jobId?: string;
  folderName?: string;
}
