import { FastifyRequest } from "fastify";
import { OrganizationMemberStatus, User } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { comparePassword, hashPassword } from "../../utils/hash";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthService {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
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

  async createUserSession(
    request: FastifyRequest,
    user: User,
    activeOrganizationId: string
  ): Promise<void> {
    request.session.user = {
      id: user.id,
      activeOrganizationId
    };

    await request.session.save();
  }

  async createUserWithOrganization(input: {
    email: string;
    password: string;
    name?: string;
    organizationName?: string;
  }): Promise<{ user: User; organizationId: string }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new AuthError("User already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const orgName =
      input.organizationName?.trim() ||
      `${(input.name?.trim() || email.split("@")[0]).slice(0, 60)}'s Team`;

    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: orgName
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name: input.name?.trim() || null,
          organizationId: organization.id
        }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
          status: "active"
        }
      });

      return { user, organizationId: organization.id };
    });

    return created;
  }

  async getActiveMembershipForUser(
    userId: string,
    requestedOrganizationId?: string
  ): Promise<{
    organizationId: string;
    organizationName: string;
    role: string;
    status: string;
  } | null> {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId,
        status: OrganizationMemberStatus.active
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (memberships.length === 0) {
      return null;
    }

    const selected =
      (requestedOrganizationId
        ? memberships.find((item) => item.organizationId === requestedOrganizationId)
        : undefined) || memberships[0];

    return {
      organizationId: selected.organizationId,
      organizationName: selected.organization.name,
      role: selected.role,
      status: selected.status
    };
  }

  async getUserContext(userId: string, requestedOrganizationId?: string): Promise<{
    user: { id: string; email: string; name: string | null; createdAt: Date };
    activeOrganization: { id: string; name: string; role: string; status: string };
    memberships: Array<{
      organization: { id: string; name: string };
      role: string;
      status: string;
    }>;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });
    if (!user) {
      return null;
    }

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        status: OrganizationMemberStatus.active
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (memberships.length === 0) {
      return null;
    }

    const activeMembership =
      (requestedOrganizationId
        ? memberships.find((item) => item.organizationId === requestedOrganizationId)
        : undefined) || memberships[0];

    return {
      user,
      activeOrganization: {
        id: activeMembership.organization.id,
        name: activeMembership.organization.name,
        role: activeMembership.role,
        status: activeMembership.status
      },
      memberships: memberships.map((item) => ({
        organization: item.organization,
        role: item.role,
        status: item.status
      }))
    };
  }
}
