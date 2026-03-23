"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStrategy = void 0;
const auth_service_1 = require("../modules/auth/auth.service");
class LocalStrategy {
    constructor(authService) {
        this.authService = authService;
    }
    async authenticate(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const user = await this.authService.findUserByEmail(normalizedEmail);
        if (!user) {
            throw new auth_service_1.AuthError("Invalid credentials");
        }
        const isValid = await this.authService.validatePassword(input.password, user.password);
        if (!isValid) {
            throw new auth_service_1.AuthError("Invalid credentials");
        }
        return user;
    }
}
exports.LocalStrategy = LocalStrategy;
