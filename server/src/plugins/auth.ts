import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    ingestionAuth?: {
      organizationId: string;
      applicationId: string;
    };
  }
  interface Session {
    user?: {
      id: string;
      activeOrganizationId: string;
    };
    oauth?: {
      google?: {
        state: string;
        codeVerifier: string;
        redirectTo?: string;
      };
    };
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateIngestion: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.session.user?.id || !request.session.user?.activeOrganizationId) {
        reply.code(401).send({ message: "Unauthorized" });
        return;
      }
    }
  );

  app.decorate(
    "authenticateIngestion",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const authorization = request.headers.authorization;
      if (!authorization) {
        reply.code(401).send({ message: "Unauthorized" });
        return;
      }

      const [scheme, rawToken] = authorization.split(" ");
      const token = rawToken?.trim();
      if (scheme?.toLowerCase() !== "bearer" || !token) {
        reply.code(401).send({ message: "Unauthorized" });
        return;
      }

      const application = await prisma.application.findUnique({
        where: { apiKey: token },
        select: {
          id: true,
          organizationId: true
        }
      });

      if (!application) {
        reply.code(401).send({ message: "Unauthorized" });
        return;
      }

      request.ingestionAuth = {
        organizationId: application.organizationId,
        applicationId: application.id
      };
    }
  );
}
