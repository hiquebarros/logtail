"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionProducer = void 0;
const bullmq_1 = require("bullmq");
const ingestion_queue_1 = require("./ingestion.queue");
const DEFAULT_JOB_OPTIONS = {
    attempts: 5,
    removeOnComplete: 1000,
    removeOnFail: 1000,
    backoff: {
        type: "exponential",
        delay: 1000
    }
};
class IngestionProducer {
    constructor() {
        this.queue = new bullmq_1.Queue(ingestion_queue_1.INGESTION_QUEUE_NAME, {
            connection: (0, ingestion_queue_1.getQueueConnection)(),
            defaultJobOptions: DEFAULT_JOB_OPTIONS
        });
    }
    async enqueueBatch(data) {
        const job = await this.queue.add(ingestion_queue_1.INGESTION_JOB_NAME, data);
        const jobId = job.id ? String(job.id) : "";
        return { jobId };
    }
    async close() {
        await this.queue.close();
    }
}
exports.IngestionProducer = IngestionProducer;
