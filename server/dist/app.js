"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const logs_controller_1 = require("./modules/logs/logs.controller");
function buildApp() {
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
    void (0, logs_controller_1.registerLogsController)(app);
    return app;
}
