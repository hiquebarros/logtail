"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.AuthError = void 0;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const client_2 = require("../../prisma/client");
const hash_1 = require("../../utils/hash");
const email_service_1 = require("./email.service");
class AuthError extends Error {
    constructor(message, statusCode = 401) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AuthError = AuthError;
class AuthService {
    constructor(emailService = new email_service_1.EmailService()) {
        this.emailService = emailService;
    }
    async findUserByEmail(email) {
        return client_2.prisma.user.findUnique({
            where: { email }
        });
    }
    async findUserById(id) {
        return client_2.prisma.user.findUnique({
            where: { id }
        });
    }
    async validatePassword(password, hash) {
        if (!hash) {
            return false;
        }
        return (0, hash_1.comparePassword)(password, hash);
    }
    async createUserSession(request, user, activeOrganizationId) {
        request.session.user = {
            id: user.id,
            activeOrganizationId
        };
        await request.session.save();
    }
    async createUserWithOrganization(input) {
        const email = input.email.trim().toLowerCase();
        const existing = await this.findUserByEmail(email);
        if (existing) {
            throw new AuthError("User already exists", 409);
        }
        const passwordHash = await (0, hash_1.hashPassword)(input.password);
        const orgName = input.organizationName?.trim() ||
            `${(input.name?.trim() || email.split("@")[0]).slice(0, 60)}'s Team`;
        const created = await client_2.prisma.$transaction(async (tx) => {
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
    async findOrCreateUserFromGoogle(identity) {
        const email = identity.email.trim().toLowerCase();
        const result = await client_2.prisma.$transaction(async (tx) => {
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
    async sendVerificationEmail(userId, appBaseUrl) {
        const user = await client_2.prisma.user.findUnique({
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
        await client_2.prisma.user.update({
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
    async resendVerificationByEmail(email, appBaseUrl) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.findUserByEmail(normalizedEmail);
        if (!user || user.emailVerifiedAt) {
            return;
        }
        await this.sendVerificationEmail(user.id, appBaseUrl);
    }
    async verifyEmailToken(token) {
        const tokenHash = this.hashVerificationToken(token);
        const user = await client_2.prisma.user.findFirst({
            where: { emailVerificationTokenHash: tokenHash }
        });
        if (!user) {
            throw new AuthError("Invalid verification link", 400);
        }
        if (!user.emailVerificationTokenExpiresAt ||
            user.emailVerificationTokenExpiresAt.getTime() < Date.now()) {
            await client_2.prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerificationTokenHash: null,
                    emailVerificationTokenExpiresAt: null
                }
            });
            throw new AuthError("Verification link expired. Please request a new one.", 400);
        }
        const updatedUser = await client_2.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationTokenHash: null,
                emailVerificationTokenExpiresAt: null
            }
        });
        return updatedUser;
    }
    createEmailVerificationToken() {
        const token = (0, crypto_1.randomBytes)(32).toString("hex");
        return {
            token,
            tokenHash: this.hashVerificationToken(token),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        };
    }
    hashVerificationToken(token) {
        return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
    }
    async getActiveMembershipForUser(userId, requestedOrganizationId) {
        const memberships = await client_2.prisma.organizationMember.findMany({
            where: {
                userId,
                status: client_1.OrganizationMemberStatus.active
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
        const selected = (requestedOrganizationId
            ? memberships.find((item) => item.organizationId === requestedOrganizationId)
            : undefined) || memberships[0];
        return {
            organizationId: selected.organizationId,
            organizationName: selected.organization.name,
            role: selected.role,
            status: selected.status
        };
    }
    async getUserContext(userId, requestedOrganizationId) {
        const user = await client_2.prisma.user.findUnique({
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
        const memberships = await client_2.prisma.organizationMember.findMany({
            where: {
                userId: user.id,
                status: client_1.OrganizationMemberStatus.active
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
        const activeMembership = (requestedOrganizationId
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
exports.AuthService = AuthService;
