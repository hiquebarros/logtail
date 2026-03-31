"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingestion_app_1 = require("./ingestion.app");
const client_1 = require("./prisma/client");
async function startIngestionServer() {
    const app = await (0, ingestion_app_1.buildIngestionApp)();
    const port = Number(process.env.INGESTION_PORT || process.env.PORT_INGESTION || 3002);
    try {
        await client_1.prisma.$connect();
        await app.listen({ host: "0.0.0.0", port });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}
process.on("SIGINT", async () => {
    await client_1.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await client_1.prisma.$disconnect();
    process.exit(0);
});
void startIngestionServer();
