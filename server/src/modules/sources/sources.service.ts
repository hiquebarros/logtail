import { ApplicationLanguage, Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { generateBase62Token } from "../../utils/base62";
import { CreateSourceInput, UpdateSourceInput } from "./sources.schemas";

const API_KEY_LENGTH = 28;
const MAX_API_KEY_RETRIES = 5;

type SourceRecord = {
  id: string;
  organizationId: string;
  name: string;
  language: ApplicationLanguage;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

export class SourcesError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class SourcesService {
  async listSources(organizationId: string): Promise<{ data: SourceRecord[] }> {
    const sources = await prisma.application.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });

    return {
      data: sources.map((source) => this.toSourceRecord(source))
    };
  }

  async getSourceById(
    organizationId: string,
    sourceId: string
  ): Promise<{ data: SourceRecord }> {
    const source = await prisma.application.findFirst({
      where: {
        id: sourceId,
        organizationId
      }
    });

    if (!source) {
      throw new SourcesError("Source not found", 404);
    }

    return {
      data: this.toSourceRecord(source)
    };
  }

  async createSource(
    organizationId: string,
    input: CreateSourceInput
  ): Promise<{ data: SourceRecord }> {
    const normalizedName = input.name.trim();

    for (let attempt = 0; attempt < MAX_API_KEY_RETRIES; attempt += 1) {
      try {
        const created = await prisma.application.create({
          data: {
            organizationId,
            name: normalizedName,
            language: input.language,
            apiKey: generateBase62Token(API_KEY_LENGTH)
          }
        });

        return {
          data: this.toSourceRecord(created)
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const target = this.getErrorTarget(error.meta?.target);
          if (this.isNameCollision(target, error.message)) {
            throw new SourcesError("A source with this name already exists", 409);
          }

          if (this.isApiKeyCollision(target, error.message)) {
            continue;
          }
        }

        throw error;
      }
    }

    throw new SourcesError("Could not generate a unique API key", 500);
  }

  async updateSource(
    organizationId: string,
    sourceId: string,
    input: UpdateSourceInput
  ): Promise<{ data: SourceRecord }> {
    const existing = await prisma.application.findFirst({
      where: {
        id: sourceId,
        organizationId
      },
      select: {
        id: true
      }
    });
    if (!existing) {
      throw new SourcesError("Source not found", 404);
    }

    try {
      const updated = await prisma.application.update({
        where: {
          id: sourceId
        },
        data: {
          name: input.name.trim()
        }
      });

      return {
        data: this.toSourceRecord(updated)
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = this.getErrorTarget(error.meta?.target);
        if (this.isNameCollision(target, error.message)) {
          throw new SourcesError("A source with this name already exists", 409);
        }
      }

      throw error;
    }
  }

  private toSourceRecord(source: {
    id: string;
    organizationId: string;
    name: string;
    language: ApplicationLanguage;
    apiKey: string;
    createdAt: Date;
    updatedAt: Date;
  }): SourceRecord {
    return {
      id: source.id,
      organizationId: source.organizationId,
      name: source.name,
      language: source.language,
      apiKey: source.apiKey,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString()
    };
  }

  private getErrorTarget(target: unknown): string[] {
    if (!Array.isArray(target)) {
      return [];
    }

    return target
      .map((item) => (typeof item === "string" ? item : ""))
      .filter((item) => item.length > 0);
  }

  private isNameCollision(target: string[], message: string): boolean {
    const hasOrgNameConstraint =
      (target.includes("organization_id") || target.includes("organizationId")) &&
      target.includes("name");
    return hasOrgNameConstraint || message.includes("organization_id_name");
  }

  private isApiKeyCollision(target: string[], message: string): boolean {
    return (
      target.includes("api_key") ||
      target.includes("apiKey") ||
      message.includes("applications_api_key_key")
    );
  }
}
