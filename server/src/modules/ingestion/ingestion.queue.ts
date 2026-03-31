import { ConnectionOptions } from "bullmq";

export const INGESTION_QUEUE_NAME = "logs-ingestion";
export const INGESTION_JOB_NAME = "persist-batch";

export function getQueueConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  };
}
