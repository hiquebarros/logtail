"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INGESTION_JOB_NAME = exports.INGESTION_QUEUE_NAME = void 0;
exports.getQueueConnection = getQueueConnection;
exports.INGESTION_QUEUE_NAME = "logs-ingestion";
exports.INGESTION_JOB_NAME = "persist-batch";
function getQueueConnection() {
    return {
        url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
        maxRetriesPerRequest: null,
        enableReadyCheck: true
    };
}
