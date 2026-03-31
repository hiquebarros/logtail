import { buildIngestionApp } from "./ingestion.app";
import { prisma } from "./prisma/client";

async function startIngestionServer(): Promise<void> {
  const app = await buildIngestionApp();
  const port = Number(
    process.env.INGESTION_PORT || process.env.PORT_INGESTION || 3002
  );

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

void startIngestionServer();
