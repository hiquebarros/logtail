"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthPlugin = registerAuthPlugin;
async function registerAuthPlugin(app) {
    app.decorate("authenticate", async (request, reply) => {
        if (!request.session.user?.id || !request.session.user?.activeOrganizationId) {
            reply.code(401).send({ message: "Unauthorized" });
            return;
        }
    });
}
