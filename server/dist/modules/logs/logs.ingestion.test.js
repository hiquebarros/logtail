"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const fastify_1 = __importDefault(require("fastify"));
const auth_1 = require("../../plugins/auth");
const logs_controller_1 = require("./logs.controller");
const logs_service_1 = require("./logs.service");
const client_1 = require("../../prisma/client");
async function buildTestApp() {
    const app = (0, fastify_1.default)();
    await (0, auth_1.registerAuthPlugin)(app);
    await (0, logs_controller_1.registerLogsController)(app);
    return app;
}
(0, node_test_1.default)("POST /logs returns 401 without bearer token", async () => {
    const originalFindUnique = client_1.prisma.application.findUnique;
    client_1.prisma.application.findUnique = (async () => null);
    const app = await buildTestApp();
    try {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
            }
        });
        strict_1.default.equal(response.statusCode, 401);
    }
    finally {
        client_1.prisma.application.findUnique = originalFindUnique;
        await app.close();
    }
});
(0, node_test_1.default)("POST /logs returns 201 with valid bearer token", async () => {
    const originalFindUnique = client_1.prisma.application.findUnique;
    const originalCreateLogsBatch = logs_service_1.LogsService.prototype.createLogsBatch;
    client_1.prisma.application.findUnique = (async () => ({
        id: "20000000-0000-4000-8000-000000000001",
        organizationId: "10000000-0000-4000-8000-000000000001"
    }));
    logs_service_1.LogsService.prototype.createLogsBatch = (async () => ({
        insertedCount: 1
    }));
    const app = await buildTestApp();
    try {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            headers: {
                authorization: "Bearer valid-api-key"
            },
            payload: {
                applicationId: "20000000-0000-4000-8000-000000000001",
                logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
            }
        });
        strict_1.default.equal(response.statusCode, 201);
        strict_1.default.deepEqual(response.json(), { insertedCount: 1 });
    }
    finally {
        client_1.prisma.application.findUnique = originalFindUnique;
        logs_service_1.LogsService.prototype.createLogsBatch = originalCreateLogsBatch;
        await app.close();
    }
});
(0, node_test_1.default)("POST /logs returns 403 when body applicationId mismatches token scope", async () => {
    const originalFindUnique = client_1.prisma.application.findUnique;
    client_1.prisma.application.findUnique = (async () => ({
        id: "20000000-0000-4000-8000-000000000001",
        organizationId: "10000000-0000-4000-8000-000000000001"
    }));
    const app = await buildTestApp();
    try {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            headers: {
                authorization: "Bearer valid-api-key"
            },
            payload: {
                applicationId: "20000000-0000-4000-8000-000000000099",
                logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
            }
        });
        strict_1.default.equal(response.statusCode, 403);
    }
    finally {
        client_1.prisma.application.findUnique = originalFindUnique;
        await app.close();
    }
});
