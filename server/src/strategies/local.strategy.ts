import { User } from "@prisma/client";
import { AuthError, AuthService } from "../modules/auth/auth.service";

export type LocalStrategyInput = {
  email: string;
  password: string;
};

export interface AuthStrategy<TInput, TResult> {
  authenticate(input: TInput): Promise<TResult>;
}

export class LocalStrategy implements AuthStrategy<LocalStrategyInput, User> {
  constructor(private readonly authService: AuthService) {}

  async authenticate(input: LocalStrategyInput): Promise<User> {
    const user = await this.authService.findUserByEmail(input.email);
    if (!user) {
      throw new AuthError("Invalid credentials");
    }

    const isValid = await this.authService.validatePassword(input.password, user.password);
    if (!isValid) {
      throw new AuthError("Invalid credentials");
    }

    return user;
  }
}
