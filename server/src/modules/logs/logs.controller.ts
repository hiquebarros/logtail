import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LogsRepository } from "./logs.repository";
import { LogsService } from "./logs.service";

const logsService = new LogsService(new LogsRepository());

export async function registerLogsController(app: FastifyInstance): Promise<void> {
  app.get(
    "/logs",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const result = await logsService.getLogs(request.query);
      reply.send(result);
    }
  );

  app.get(
    "/metrics",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const result = await logsService.getMetrics(request.query);
      reply.send(result);
    }
  );

  app.post(
    "/logs",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const result = await logsService.createLogsBatch(request.body);
      reply.code(201).send(result);
    }
  );

  app.get(
    "/logs/stream",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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

      const writeEvent = (event: string, data: unknown): void => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent("connected", { status: "ok" });

      const poll = async (): Promise<void> => {
        if (polling) {
          return;
        }

        polling = true;

        try {
          const result = await logsService.getNewLogsForStream(
            streamFilters,
            lastCursor
          );
          lastCursor = result.lastCursor;

          for (const log of result.logs) {
            writeEvent("log", log);
          }

          writeEvent("heartbeat", { timestamp: new Date().toISOString() });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "stream polling failed";
          writeEvent("error", { message });
        } finally {
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
    }
  );
}
