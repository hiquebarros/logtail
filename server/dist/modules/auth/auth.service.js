"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.AuthError = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const hash_1 = require("../../utils/hash");
class AuthError extends Error {
    constructor(message, statusCode = 401) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AuthError = AuthError;
class AuthService {
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
