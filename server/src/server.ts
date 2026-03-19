import { buildApp } from "./app";
import { prisma } from "./prisma/client";

async function startServer(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3000);

  try {
    await prisma.$connect();
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

void startServer();
