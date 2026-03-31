"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIngestionController = registerIngestionController;
const ingestion_producer_1 = require("./ingestion.producer");
const ingestionProducer = new ingestion_producer_1.IngestionProducer();
function getIngestionScope(request) {
    const scope = request.ingestionAuth;
    if (!scope?.organizationId || !scope.applicationId) {
        const error = new Error("Unauthorized");
        error.statusCode = 401;
        throw error;
    }
    return scope;
}
function getOptionalString(source, key) {
    if (!source || typeof source !== "object") {
        return undefined;
    }
    const value = source[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
async function registerIngestionController(app) {
    app.post("/logs", { preHandler: [app.authenticateIngestion] }, async (request, reply) => {
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
    });
    app.addHook("onClose", async () => {
        await ingestionProducer.close();
    });
}
