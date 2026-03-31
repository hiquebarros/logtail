import Fastify, { FastifyInstance } from "fastify";
import { registerAuthPlugin } from "./plugins/auth";
import { registerIngestionController } from "./modules/ingestion/ingestion.controller";

export async function buildIngestionApp(): Promise<FastifyInstance> {
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

  await registerAuthPlugin(app);
  await registerIngestionController(app);

  return app;
}
