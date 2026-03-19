import { FastifyRequest } from "fastify";
import { User } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { comparePassword } from "../../utils/hash";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthService {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email },
      orderBy: { createdAt: "asc" }
    });
  }

  async findUserByEmailInOrganization(
    organizationId: string,
    email: string
  ): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email
        }
      }
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  async validatePassword(password: string, hash: string | null): Promise<boolean> {
    if (!hash) {
      return false;
    }

    return comparePassword(password, hash);
  }

  async createUserSession(request: FastifyRequest, user: User): Promise<void> {
    request.session.user = {
      id: user.id
    };

    await request.session.save();
  }
}
