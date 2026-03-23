"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogsController = registerLogsController;
const logs_repository_1 = require("./logs.repository");
const logs_service_1 = require("./logs.service");
const logsService = new logs_service_1.LogsService(new logs_repository_1.LogsRepository());
function getActiveOrganizationId(request) {
    const organizationId = request.session.user?.activeOrganizationId;
    if (!organizationId) {
        const error = new Error("Unauthorized");
        error.statusCode = 401;
        throw error;
    }
    return organizationId;
}
function getOptionalString(source, key) {
    if (!source || typeof source !== "object") {
        return undefined;
    }
    const value = source[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
async function registerLogsController(app) {
    app.get("/logs", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.query, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const scopedQuery = {
            ...request.query,
            organizationId,
            applicationId
        };
        const result = await logsService.getLogs(scopedQuery);
        reply.send(result);
    });
    app.get("/logs/histogram", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.query, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const scopedQuery = {
            ...request.query,
            organizationId,
            applicationId
        };
        const result = await logsService.getHistogram(scopedQuery);
        reply.send(result);
    });
    app.get("/metrics", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.query, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const scopedQuery = {
            ...request.query,
            organizationId,
            applicationId
        };
        const result = await logsService.getMetrics(scopedQuery);
        reply.send(result);
    });
    app.post("/logs", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.body, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const scopedBody = {
            ...request.body,
            organizationId,
            applicationId
        };
        const result = await logsService.createLogsBatch(scopedBody);
        reply.code(201).send(result);
    });
    app.get("/logs/stream", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.query, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const streamFilters = logsService.parseStreamFilters({
            ...request.query,
            organizationId,
            applicationId
        });
        let lastCursor = {
            timestamp: new Date(),
            id: "00000000-0000-0000-0000-000000000000"
        };
        let polling = false;
        reply.hijack();
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
        });
        const writeEvent = (event, data) => {
            reply.raw.write(`event: ${event}\n`);
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        writeEvent("connected", { status: "ok" });
        const poll = async () => {
            if (polling) {
                return;
            }
            polling = true;
            try {
                const result = await logsService.getNewLogsForStream(streamFilters, lastCursor);
                lastCursor = result.lastCursor;
                for (const log of result.logs) {
                    writeEvent("log", log);
                }
                writeEvent("heartbeat", { timestamp: new Date().toISOString() });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "stream polling failed";
                writeEvent("error", { message });
            }
            finally {
                polling = false;
            }
        };
        const interval = setInterval(() => {
            void poll();
        }, 2000);
        void poll();
        request.raw.on("close", () => {
            clearInterval(interval);
        });
    });
}
