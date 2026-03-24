"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthPlugin = registerAuthPlugin;
const client_1 = require("../prisma/client");
async function registerAuthPlugin(app) {
    app.decorate("authenticate", async (request, reply) => {
        if (!request.session.user?.id || !request.session.user?.activeOrganizationId) {
            reply.code(401).send({ message: "Unauthorized" });
            return;
        }
    });
    app.decorate("authenticateIngestion", async (request, reply) => {
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
        const application = await client_1.prisma.application.findUnique({
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
    });
}
