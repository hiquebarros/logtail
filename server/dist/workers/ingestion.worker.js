"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const client_1 = require("../prisma/client");
const logs_repository_1 = require("../modules/logs/logs.repository");
const logs_service_1 = require("../modules/logs/logs.service");
const ingestion_queue_1 = require("../modules/ingestion/ingestion.queue");
const logsService = new logs_service_1.LogsService(new logs_repository_1.LogsRepository());
const workerConcurrency = Number(process.env.INGESTION_WORKER_CONCURRENCY || 20);
function assertIngestionJobData(input) {
    const data = input;
    if (!data ||
        typeof data !== "object" ||
        !data.scope?.organizationId ||
        !data.scope?.applicationId) {
        throw new Error("Invalid ingestion job payload");
    }
    return data;
}
async function processIngestionJob(job) {
    const data = assertIngestionJobData(job.data);
    const result = await logsService.createLogsBatch(data.body, {
        organizationId: data.scope.organizationId,
        applicationId: data.scope.applicationId
    });
    console.log(`[ingestion-worker] job=${job.id} insertedCount=${result.insertedCount} applicationId=${data.scope.applicationId}`);
}
async function startWorker() {
    await client_1.prisma.$connect();
    const worker = new bullmq_1.Worker(ingestion_queue_1.INGESTION_QUEUE_NAME, processIngestionJob, {
        connection: (0, ingestion_queue_1.getQueueConnection)(),
        concurrency: Number.isFinite(workerConcurrency) ? workerConcurrency : 20
    });
    worker.on("error", (error) => {
        console.error("[ingestion-worker] worker error", error);
    });
    worker.on("failed", (job, error) => {
        console.error(`[ingestion-worker] job failed id=${job?.id ?? "unknown"}`, error);
    });
    const shutdown = async (signal) => {
        console.log(`[ingestion-worker] ${signal} received, shutting down`);
        await worker.close();
        await client_1.prisma.$disconnect();
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
