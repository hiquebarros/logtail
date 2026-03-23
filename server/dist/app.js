"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const auth_1 = require("./plugins/auth");
const session_1 = require("./plugins/session");
const auth_routes_1 = require("./modules/auth/auth.routes");
const logs_controller_1 = require("./modules/logs/logs.controller");
const sources_controller_1 = require("./modules/sources/sources.controller");
async function buildApp() {
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
    await (0, session_1.registerSessionPlugin)(app);
    await (0, auth_1.registerAuthPlugin)(app);
    await (0, auth_routes_1.registerAuthRoutes)(app);
    await (0, logs_controller_1.registerLogsController)(app);
    await (0, sources_controller_1.registerSourcesController)(app);
    return app;
}
