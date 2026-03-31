"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIngestionApp = buildIngestionApp;
const fastify_1 = __importDefault(require("fastify"));
const auth_1 = require("./plugins/auth");
const ingestion_controller_1 = require("./modules/ingestion/ingestion.controller");
async function buildIngestionApp() {
    const app = (0, fastify_1.default)({ logger: true });
    app.setErrorHandler((error, _request, reply) => {
        const message = error instanceof Error ? error.message : "Internal server error";
        const statusCode = typeof error.statusCode === "number"
            ? error.statusCode
            : 500;
        reply.status(statusCode).send({
            message
        });
    });
    app.get("/health", async () => {
        return { status: "ok" };
    });
    await (0, auth_1.registerAuthPlugin)(app);
    await (0, ingestion_controller_1.registerIngestionController)(app);
    return app;
}
