import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const LOG_LEVELS = ["info", "warn", "error"] as const;
const SERVICES = [
  "api",
  "worker",
  "auth",
  "billing",
  "notifications",
  "ingestion"
] as const;
const ENVS = ["prod", "staging"] as const;
const ACTIONS = [
  "payment processed",
  "payment failed",
  "token refreshed",
  "request completed",
  "request timeout",
  "webhook received",
  "webhook retry",
  "job started",
  "job finished",
  "user authenticated",
  "user session expired",
  "database reconnect"
] as const;

const ORGANIZATIONS = [
  { id: "10000000-0000-0000-0000-000000000001", name: "Acme Corp" },
  { id: "10000000-0000-0000-0000-000000000002", name: "Globex" },
  { id: "10000000-0000-0000-0000-000000000003", name: "Initech" }
];

const APPLICATIONS = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    organizationId: "10000000-0000-0000-0000-000000000001",
    name: "Checkout API",
    apiKey: "seed-acme-checkout-api"
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    organizationId: "10000000-0000-0000-0000-000000000001",
    name: "Backoffice",
    apiKey: "seed-acme-backoffice"
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    organizationId: "10000000-0000-0000-0000-000000000001",
    name: "Webhook Worker",
    apiKey: "seed-acme-webhook-worker"
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    organizationId: "10000000-0000-0000-0000-000000000002",
    name: "Checkout API",
    apiKey: "seed-globex-checkout-api"
  },
  {
    id: "20000000-0000-0000-0000-000000000005",
    organizationId: "10000000-0000-0000-0000-000000000002",
    name: "Backoffice",
    apiKey: "seed-globex-backoffice"
  },
  {
    id: "20000000-0000-0000-0000-000000000006",
    organizationId: "10000000-0000-0000-0000-000000000002",
    name: "Webhook Worker",
    apiKey: "seed-globex-webhook-worker"
  },
  {
    id: "20000000-0000-0000-0000-000000000007",
    organizationId: "10000000-0000-0000-0000-000000000003",
    name: "Checkout API",
    apiKey: "seed-initech-checkout-api"
  },
  {
    id: "20000000-0000-0000-0000-000000000008",
    organizationId: "10000000-0000-0000-0000-000000000003",
    name: "Backoffice",
    apiKey: "seed-initech-backoffice"
  },
  {
    id: "20000000-0000-0000-0000-000000000009",
    organizationId: "10000000-0000-0000-0000-000000000003",
    name: "Webhook Worker",
    apiKey: "seed-initech-webhook-worker"
  }
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function generateLevel(): (typeof LOG_LEVELS)[number] {
  const roll = Math.random();
  if (roll < 0.75) {
    return "info";
  }
  if (roll < 0.93) {
    return "warn";
  }
  return "error";
}

function generateTimestamp(baseDate: Date): Date {
  const daysBack = randomInt(0, 2);
  const minutesBack = randomInt(0, 24 * 60 - 1);
  const secondsBack = randomInt(0, 59);
  const timestamp = new Date(baseDate);
  timestamp.setUTCDate(timestamp.getUTCDate() - daysBack);
  timestamp.setUTCMinutes(timestamp.getUTCMinutes() - minutesBack);
  timestamp.setUTCSeconds(timestamp.getUTCSeconds() - secondsBack);
  return timestamp;
}

function generateMessage(level: string, service: string): string {
  const action = randomItem(ACTIONS);
  if (level === "error") {
    return `${service} ${action}: downstream dependency error`;
  }
  if (level === "warn") {
    return `${service} ${action}: retry scheduled`;
  }
  return `${service} ${action}`;
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function seedOrganizationsAndApplications(): Promise<void> {
  for (const org of ORGANIZATIONS) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: { name: org.name },
      create: {
        id: org.id,
        name: org.name
      }
    });
  }

  for (const app of APPLICATIONS) {
    await prisma.application.upsert({
      where: { id: app.id },
      update: {
        name: app.name,
        apiKey: app.apiKey,
        organizationId: app.organizationId
      },
      create: {
        id: app.id,
        name: app.name,
        apiKey: app.apiKey,
        organizationId: app.organizationId
      }
    });
  }
}

async function seedLogs(): Promise<void> {
  const logsPerApplication = 1200;
  const now = new Date();
  const allLogs: Prisma.LogCreateManyInput[] = [];

  // Keep seed idempotent: regenerate logs for seeded applications each run.
  await prisma.log.deleteMany({
    where: {
      applicationId: {
        in: APPLICATIONS.map((app) => app.id)
      }
    }
  });

  for (const app of APPLICATIONS) {
    for (let i = 0; i < logsPerApplication; i += 1) {
      const level = generateLevel();
      const service = randomItem(SERVICES);
      const timestamp = generateTimestamp(now);
      const message = generateMessage(level, service);
      const durationMs = randomInt(5, 3500);

      allLogs.push({
        organizationId: app.organizationId,
        applicationId: app.id,
        timestamp,
        level,
        message,
        metadata: {
          service,
          env: randomItem(ENVS),
          region: randomItem(["us-east-1", "eu-west-1", "sa-east-1"]),
          requestId: `req-${app.id.slice(-4)}-${i}`,
          durationMs,
          statusCode:
            level === "error"
              ? randomItem([500, 502, 503, 504])
              : level === "warn"
                ? randomItem([408, 429])
                : randomItem([200, 201, 202])
        } as Prisma.InputJsonValue
      });
    }
  }

  for (const logsBatch of chunk(allLogs, 1000)) {
    await prisma.log.createMany({
      data: logsBatch
    });
  }

  console.log(`Seeded ${ORGANIZATIONS.length} organizations.`);
  console.log(`Seeded ${APPLICATIONS.length} applications.`);
  console.log(`Seeded ${allLogs.length} logs.`);
}

async function seedAuthUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);
  const orgOne = ORGANIZATIONS[0].id;
  const orgTwo = ORGANIZATIONS[1].id;

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@logtail.dev"
    },
    update: {
      password: passwordHash,
      organizationId: orgOne
    },
    create: {
      organizationId: orgOne,
      email: "admin@logtail.dev",
      password: passwordHash,
      name: "Admin User"
    }
  });

  const operator = await prisma.user.upsert({
    where: {
      email: "ops@logtail.dev"
    },
    update: {
      password: passwordHash,
      organizationId: orgOne
    },
    create: {
      organizationId: orgOne,
      email: "ops@logtail.dev",
      password: passwordHash,
      name: "Ops User"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgOne,
        userId: admin.id
      }
    },
    update: {
      role: "owner",
      status: "active"
    },
    create: {
      organizationId: orgOne,
      userId: admin.id,
      role: "owner",
      status: "active"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgOne,
        userId: operator.id
      }
    },
    update: {
      role: "admin",
      status: "active"
    },
    create: {
      organizationId: orgOne,
      userId: operator.id,
      role: "admin",
      status: "active"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: orgTwo,
        userId: operator.id
      }
    },
    update: {
      role: "member",
      status: "active"
    },
    create: {
      organizationId: orgTwo,
      userId: operator.id,
      role: "member",
      status: "active"
    }
  });

  console.log("Seeded auth users admin@logtail.dev and ops@logtail.dev.");
}

async function main(): Promise<void> {
  await seedOrganizationsAndApplications();
  await seedAuthUsers();
  await seedLogs();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
