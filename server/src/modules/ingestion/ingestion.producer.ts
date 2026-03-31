import { JobsOptions, Queue } from "bullmq";
import {
  getQueueConnection,
  INGESTION_JOB_NAME,
  INGESTION_QUEUE_NAME
} from "./ingestion.queue";
import { IngestionJobData } from "./ingestion.types";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  removeOnComplete: 1000,
  removeOnFail: 1000,
  backoff: {
    type: "exponential",
    delay: 1000
  }
};

export class IngestionProducer {
  private readonly queue = new Queue<IngestionJobData>(INGESTION_QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });

  async enqueueBatch(data: IngestionJobData): Promise<{ jobId: string }> {
    const job = await this.queue.add(INGESTION_JOB_NAME, data);
    const jobId = job.id ? String(job.id) : "";
    return { jobId };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
