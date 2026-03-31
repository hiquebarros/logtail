import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IngestionProducer } from "./ingestion.producer";

const ingestionProducer = new IngestionProducer();

function getIngestionScope(request: FastifyRequest): {
  organizationId: string;
  applicationId: string;
} {
  const scope = request.ingestionAuth;
  if (!scope?.organizationId || !scope.applicationId) {
    const error = new Error("Unauthorized") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  return scope;
}

function getOptionalString(source: unknown, key: string): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export async function registerIngestionController(app: FastifyInstance): Promise<void> {
  app.post(
    "/logs",
    { preHandler: [app.authenticateIngestion] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { organizationId, applicationId } = getIngestionScope(request);
      const requestedApplicationId = getOptionalString(request.body, "applicationId");
      if (requestedApplicationId && requestedApplicationId !== applicationId) {
        reply
          .code(403)
          .send({ message: "applicationId does not match bearer token scope" });
        return;
      }

      const { jobId } = await ingestionProducer.enqueueBatch({
        scope: { organizationId, applicationId },
        body: request.body,
        receivedAt: new Date().toISOString()
      });
      reply.code(202).send({ accepted: true, jobId });
    }
  );

  app.addHook("onClose", async () => {
    await ingestionProducer.close();
  });
}
