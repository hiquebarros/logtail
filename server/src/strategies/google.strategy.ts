import type { AuthStrategy } from "./local.strategy";

export type GoogleStrategyInput = {
  code: string;
};

export class GoogleStrategy
  implements AuthStrategy<GoogleStrategyInput, never>
{
  async authenticate(_input: GoogleStrategyInput): Promise<never> {
    throw new Error("Google OAuth strategy is not implemented yet");
  }
}
