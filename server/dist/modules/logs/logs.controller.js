"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogsController = registerLogsController;
const logs_repository_1 = require("./logs.repository");
const logs_service_1 = require("./logs.service");
const logsService = new logs_service_1.LogsService(new logs_repository_1.LogsRepository());
async function registerLogsController(app) {
    app.get("/logs", async (request, reply) => {
        const result = await logsService.getLogs(request.query);
        reply.send(result);
    });
    app.get("/metrics", async (request, reply) => {
        const result = await logsService.getMetrics(request.query);
        reply.send(result);
    });
    app.post("/logs", async (request, reply) => {
        const result = await logsService.createLogsBatch(request.body);
        reply.code(201).send(result);
    });
    app.get("/logs/stream", async (request, reply) => {
        const streamFilters = logsService.parseStreamFilters(request.query);
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
