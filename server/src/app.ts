import Fastify, { FastifyInstance } from "fastify";
import { registerAuthPlugin } from "./plugins/auth";
import { registerSessionPlugin } from "./plugins/session";
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { registerLogsController } from "./modules/logs/logs.controller";

export async function buildApp(): Promise<FastifyInstance> {
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

  await registerSessionPlugin(app);
  await registerAuthPlugin(app);
  await registerAuthRoutes(app);
  await registerLogsController(app);

  return app;
}
