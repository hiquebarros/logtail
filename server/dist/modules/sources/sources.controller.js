"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSourcesController = registerSourcesController;
const zod_1 = require("zod");
const sources_schemas_1 = require("./sources.schemas");
const sources_service_1 = require("./sources.service");
const sourceParamsSchema = zod_1.z.object({
    sourceId: zod_1.z.string().trim().min(1).max(255)
});
const sourcesService = new sources_service_1.SourcesService();
function getActiveOrganizationId(request) {
    const organizationId = request.session.user?.activeOrganizationId;
    if (!organizationId) {
        throw new sources_service_1.SourcesError("Unauthorized", 401);
    }
    return organizationId;
}
async function registerSourcesController(app) {
    app.get("/sources", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const result = await sourcesService.listSources(organizationId);
        reply.send(result);
    });
    app.post("/sources", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const parsedBody = sources_schemas_1.createSourceSchema.safeParse(request.body);
        if (!parsedBody.success) {
            reply.code(400).send({
                message: "Invalid request body",
                issues: parsedBody.error.flatten()
            });
            return;
        }
        const result = await sourcesService.createSource(organizationId, parsedBody.data);
        reply.code(201).send(result);
    });
    app.get("/sources/:sourceId", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const parsedParams = sourceParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            reply.code(400).send({
                message: "Invalid sourceId"
            });
            return;
        }
        const result = await sourcesService.getSourceById(organizationId, parsedParams.data.sourceId);
        reply.send(result);
    });
    app.patch("/sources/:sourceId", { preHandler: [app.authenticate] }, async (request, reply) => {
        const organizationId = getActiveOrganizationId(request);
        const parsedParams = sourceParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            reply.code(400).send({
                message: "Invalid sourceId"
            });
            return;
        }
        const parsedBody = sources_schemas_1.updateSourceSchema.safeParse(request.body);
        if (!parsedBody.success) {
            reply.code(400).send({
                message: "Invalid request body",
                issues: parsedBody.error.flatten()
            });
            return;
        }
        const result = await sourcesService.updateSource(organizationId, parsedParams.data.sourceId, parsedBody.data);
        reply.send(result);
    });
}
