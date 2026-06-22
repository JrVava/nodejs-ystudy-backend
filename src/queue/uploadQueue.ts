import EventEmitter from "events";
import logger from "../utils/logger";

class UploadQueue extends EventEmitter {
  private queue: any[] = [];
  private processing: boolean = false;
  private jobs: Record<string, any> = {};

  async add(name: string, data: any) {
    try {
      const job = {
        id: Math.random().toString(36).substring(7),
        name,
        data,
        progress: 0,
        status: "pending",
      };
      this.jobs[job.id] = job;
      this.queue.push(job);
      this.processNext();
      return job;
    } catch (error) {
      logger.error(`[UploadQueue:add] Error occurred:`, error);
      throw error;
    }
  }

  getJob(id: string) {
    try {
      return this.jobs[id] || null;
    } catch (error) {
      logger.error(`[UploadQueue:getJob] Error occurred:`, error);
      return null;
    }
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    try {
      logger.info(`Processing job ${job.name} (ID: ${job.id})`);
      job.status = "processing";

      for (let i = 0; i <= 100; i += 20) {
        job.progress = i;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      logger.info(`Finished job ${job.name} (ID: ${job.id})`);
      job.status = "completed";
      this.emit("completed", job);
    } catch (error: any) {
      logger.error(`[UploadQueue:processNext] Error occurred:`, error);
      job.status = "failed";
      this.emit("failed", job, error);
    } finally {
      this.processing = false;
      this.processNext();
    }
  }
}

export const uploadQueue = new UploadQueue();
