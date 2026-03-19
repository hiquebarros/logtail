"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const client_1 = require("./prisma/client");
async function startServer() {
    const app = await (0, app_1.buildApp)();
    const port = Number(process.env.PORT || 3000);
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
void startServer();
