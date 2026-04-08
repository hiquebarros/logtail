import { FastifyRequest } from "fastify";
import { OrganizationMemberStatus, User } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { prisma } from "../../prisma/client";
import { comparePassword, hashPassword } from "../../utils/hash";
import { EmailService } from "./email.service";
import type { GoogleIdentity } from "../../strategies/google.strategy";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class AuthService {
  constructor(private readonly emailService = new EmailService()) {}

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

  async findOrCreateUserFromGoogle(identity: GoogleIdentity): Promise<User> {
    const email = identity.email.trim().toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const byProvider = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: identity.providerAccountId
          }
        },
        include: { user: true }
      });

      if (byProvider?.user) {
        if (!byProvider.email && email) {
          await tx.oAuthAccount.update({
            where: { id: byProvider.id },
            data: { email }
          });
        }
        return byProvider.user;
      }

      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        await tx.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: "google",
            providerAccountId: identity.providerAccountId,
            email
          }
        });

        if (!existingUser.emailVerifiedAt && identity.emailVerified) {
          return await tx.user.update({
            where: { id: existingUser.id },
            data: { emailVerifiedAt: new Date() }
          });
        }

        return existingUser;
      }

      const created = await tx.organization.create({
        data: {
          name: `${(identity.name?.trim() || email.split("@")[0]).slice(0, 60)}'s Team`
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: null,
          name: identity.name?.trim() || null,
          organizationId: created.id,
          emailVerifiedAt: identity.emailVerified ? new Date() : null
        }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId: user.id,
          role: "owner",
          status: "active"
        }
      });

      await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: "google",
          providerAccountId: identity.providerAccountId,
          email
        }
      });

      return user;
    });

    return result;
  }

  async sendVerificationEmail(userId: string, appBaseUrl: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true
      }
    });
    if (!user) {
      throw new AuthError("User not found", 404);
    }
    if (user.emailVerifiedAt) {
      return;
    }

    const { token, tokenHash, expiresAt } = this.createEmailVerificationToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationTokenExpiresAt: expiresAt
      }
    });

    const verificationUrl = `${appBaseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
    await this.emailService.sendVerificationEmail({
      toEmail: user.email,
      toName: user.name,
      verificationUrl
    });
  }

  async resendVerificationByEmail(email: string, appBaseUrl: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(normalizedEmail);
    if (!user || user.emailVerifiedAt) {
      return;
    }

    await this.sendVerificationEmail(user.id, appBaseUrl);
  }

  async verifyEmailToken(token: string): Promise<User> {
    const tokenHash = this.hashVerificationToken(token);
    const user = await prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash }
    });

    if (!user) {
      throw new AuthError("Invalid verification link", 400);
    }

    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt.getTime() < Date.now()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationTokenHash: null,
          emailVerificationTokenExpiresAt: null
        }
      });
      throw new AuthError("Verification link expired. Please request a new one.", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null
      }
    });

    return updatedUser;
  }

  private createEmailVerificationToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString("hex");
    return {
      token,
      tokenHash: this.hashVerificationToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    };
  }

  private hashVerificationToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
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
