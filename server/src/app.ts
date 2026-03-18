import Fastify, { FastifyInstance } from "fastify";
import { registerLogsController } from "./modules/logs/logs.controller";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? ((error as { statusCode: number }).statusCode as number)
        : 500;

    reply.status(statusCode).send({
      message
    });
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  void registerLogsController(app);

  return app;
}
