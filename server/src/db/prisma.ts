import { PrismaClient } from "@prisma/client";
import { getDbConfig } from "./config";

const dbConfig = getDbConfig();

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbConfig.url
    }
  }
});
