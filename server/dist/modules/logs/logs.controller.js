"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogsController = registerLogsController;
const logs_repository_1 = require("./logs.repository");
const logs_service_1 = require("./logs.service");
const logs_live_token_1 = require("./logs.live-token");
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
    app.get("/logs/ws-token", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const requestedApplicationId = getOptionalString(request.query, "applicationId");
        const applicationId = await logsService.resolveAccessibleApplicationId(organizationId, requestedApplicationId);
        const token = (0, logs_live_token_1.issueLiveTailToken)({
            organizationId,
            applicationId
        });
        reply.send({ token });
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
    app.get("/logs/ws", { websocket: true }, (socket, request) => {
        const token = getOptionalString(request.query, "token");
        const tokenPayload = token ? (0, logs_live_token_1.verifyLiveTailToken)(token) : null;
        if (!tokenPayload) {
            socket.send(JSON.stringify({
                type: "error",
                message: "Unauthorized"
            }));
            socket.close(1008, "Unauthorized");
            return;
        }
        const streamFilters = logsService.parseStreamFilters({
            organizationId: tokenPayload.organizationId,
            applicationId: tokenPayload.applicationId
        });
        let lastCursor = {
            timestamp: new Date(),
            id: "00000000-0000-0000-0000-000000000000"
        };
        let polling = false;
        const sendMessage = (payload) => {
            if (socket.readyState === 1) {
                socket.send(JSON.stringify(payload));
            }
        };
        sendMessage({ type: "connected" });
        const poll = async () => {
            if (polling || socket.readyState !== 1) {
                return;
            }
            polling = true;
            try {
                const result = await logsService.getNewLogsForStream(streamFilters, lastCursor);
                lastCursor = result.lastCursor;
                for (const log of result.logs) {
                    const metadata = log.metadata ?? {};
                    const env = metadata.env;
                    sendMessage({
                        type: "log",
                        data: {
                            id: log.id,
                            timestamp: log.timestamp,
                            level: log.level,
                            message: log.message,
                            service: typeof metadata.service === "string" ? metadata.service : "unknown",
                            environment: env === "staging" || env === "dev" || env === "prod" ? env : "prod",
                            metadata
                        }
                    });
                }
                sendMessage({ type: "heartbeat", timestamp: new Date().toISOString() });
            }
            catch (error) {
                sendMessage({
                    type: "error",
                    message: error instanceof Error ? error.message : "ws polling failed"
                });
            }
            finally {
                polling = false;
            }
        };
        const interval = setInterval(() => {
            void poll();
        }, 2000);
        void poll();
        socket.on("close", () => {
            clearInterval(interval);
        });
    });
}
