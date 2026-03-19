"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.AuthError = void 0;
const client_1 = require("../../prisma/client");
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
        return client_1.prisma.user.findFirst({
            where: { email },
            orderBy: { createdAt: "asc" }
        });
    }
    async findUserByEmailInOrganization(organizationId, email) {
        return client_1.prisma.user.findUnique({
            where: {
                organizationId_email: {
                    organizationId,
                    email
                }
            }
        });
    }
    async findUserById(id) {
        return client_1.prisma.user.findUnique({
            where: { id }
        });
    }
    async validatePassword(password, hash) {
        if (!hash) {
            return false;
        }
        return (0, hash_1.comparePassword)(password, hash);
    }
    async createUserSession(request, user) {
        request.session.user = {
            id: user.id
        };
        await request.session.save();
    }
}
exports.AuthService = AuthService;
