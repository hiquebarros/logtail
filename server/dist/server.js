"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const prisma_1 = require("./db/prisma");
async function startServer() {
    const app = (0, app_1.buildApp)();
    const port = Number(process.env.PORT || 3000);
    try {
        await prisma_1.prisma.$connect();
        await app.listen({ host: "0.0.0.0", port });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}
process.on("SIGINT", async () => {
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
void startServer();
