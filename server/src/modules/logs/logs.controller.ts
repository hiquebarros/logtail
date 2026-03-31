import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LogsRepository } from "./logs.repository";
import { LogsService } from "./logs.service";
import { issueLiveTailToken, verifyLiveTailToken } from "./logs.live-token";

const logsService = new LogsService(new LogsRepository());

function getActiveOrganizationId(request: FastifyRequest): string {
  const organizationId = request.session.user?.activeOrganizationId;
  if (!organizationId) {
    const error = new Error("Unauthorized") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  return organizationId;
}

function getOptionalString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export async function registerLogsController(app: FastifyInstance): Promise<void> {
  app.get(
    "/logs",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const organizationId = getActiveOrganizationId(request);
      const requestedApplicationId = getOptionalString(request.query, "applicationId");
      const applicationId = await logsService.resolveAccessibleApplicationId(
        organizationId,
        requestedApplicationId
      );
      const scopedQuery = {
        ...(request.query as Record<string, unknown>),
        organizationId,
        applicationId
      };
      const result = await logsService.getLogs(scopedQuery);
      reply.send(result);
    }
  );

  app.get(
    "/logs/ws-token",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const organizationId = getActiveOrganizationId(request);
      const requestedApplicationId = getOptionalString(request.query, "applicationId");
      const applicationId = await logsService.resolveAccessibleApplicationId(
        organizationId,
        requestedApplicationId
      );
      const token = issueLiveTailToken({
        organizationId,
        applicationId
      });
      reply.send({ token });
    }
  );

  app.get(
    "/logs/histogram",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const organizationId = getActiveOrganizationId(request);
      const requestedApplicationId = getOptionalString(request.query, "applicationId");
      const applicationId = await logsService.resolveAccessibleApplicationId(
        organizationId,
        requestedApplicationId
      );
      const scopedQuery = {
        ...(request.query as Record<string, unknown>),
        organizationId,
        applicationId
      };
      const result = await logsService.getHistogram(scopedQuery);
      reply.send(result);
    }
  );

  app.get(
    "/metrics",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const organizationId = getActiveOrganizationId(request);
      const requestedApplicationId = getOptionalString(request.query, "applicationId");
      const applicationId = await logsService.resolveAccessibleApplicationId(
        organizationId,
        requestedApplicationId
      );
      const scopedQuery = {
        ...(request.query as Record<string, unknown>),
        organizationId,
        applicationId
      };
      const result = await logsService.getMetrics(scopedQuery);
      reply.send(result);
    }
  );

  app.get(
    "/logs/ws",
    { websocket: true },
    (socket, request): void => {
      const token = getOptionalString(request.query, "token");
      const tokenPayload = token ? verifyLiveTailToken(token) : null;
      if (!tokenPayload) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Unauthorized"
          })
        );
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

      const sendMessage = (payload: Record<string, unknown>): void => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(payload));
        }
      };

      sendMessage({ type: "connected" });

      const poll = async (): Promise<void> => {
        if (polling || socket.readyState !== 1) {
          return;
        }

        polling = true;
        try {
          const result = await logsService.getNewLogsForStream(streamFilters, lastCursor);
          lastCursor = result.lastCursor;

          for (const log of result.logs) {
            const metadata = (log.metadata as Record<string, unknown> | null) ?? {};
            const env = metadata.env;
            sendMessage({
              type: "log",
              data: {
                id: log.id,
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
                service: typeof metadata.service === "string" ? metadata.service : "unknown",
                environment:
                  env === "staging" || env === "dev" || env === "prod" ? env : "prod",
                metadata
              }
            });
          }

          sendMessage({ type: "heartbeat", timestamp: new Date().toISOString() });
        } catch (error) {
          sendMessage({
            type: "error",
            message: error instanceof Error ? error.message : "ws polling failed"
          });
        } finally {
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
    }
  );
}
