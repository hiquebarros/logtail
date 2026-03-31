import { Job, Worker } from "bullmq";
import { prisma } from "../prisma/client";
import { LogsRepository } from "../modules/logs/logs.repository";
import { LogsService } from "../modules/logs/logs.service";
import { getQueueConnection, INGESTION_QUEUE_NAME } from "../modules/ingestion/ingestion.queue";
import { IngestionJobData } from "../modules/ingestion/ingestion.types";

const logsService = new LogsService(new LogsRepository());
const workerConcurrency = Number(process.env.INGESTION_WORKER_CONCURRENCY || 20);

function assertIngestionJobData(input: unknown): IngestionJobData {
  const data = input as IngestionJobData;
  if (
    !data ||
    typeof data !== "object" ||
    !data.scope?.organizationId ||
    !data.scope?.applicationId
  ) {
    throw new Error("Invalid ingestion job payload");
  }

  return data;
}

async function processIngestionJob(job: Job<IngestionJobData>): Promise<void> {
  const data = assertIngestionJobData(job.data);
  const result = await logsService.createLogsBatch(data.body, {
    organizationId: data.scope.organizationId,
    applicationId: data.scope.applicationId
  });

  console.log(
    `[ingestion-worker] job=${job.id} insertedCount=${result.insertedCount} applicationId=${data.scope.applicationId}`
  );
}

async function startWorker(): Promise<void> {
  await prisma.$connect();

  const worker = new Worker<IngestionJobData>(
    INGESTION_QUEUE_NAME,
    processIngestionJob,
    {
      connection: getQueueConnection(),
      concurrency: Number.isFinite(workerConcurrency) ? workerConcurrency : 20
    }
  );

  worker.on("error", (error) => {
    console.error("[ingestion-worker] worker error", error);
  });

  worker.on("failed", (job, error) => {
    console.error(`[ingestion-worker] job failed id=${job?.id ?? "unknown"}`, error);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[ingestion-worker] ${signal} received, shutting down`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void startWorker();
