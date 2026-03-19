import type { AuthStrategy } from "./local.strategy";

export type GithubStrategyInput = {
  code: string;
};

export class GithubStrategy
  implements AuthStrategy<GithubStrategyInput, never>
{
  async authenticate(_input: GithubStrategyInput): Promise<never> {
    throw new Error("GitHub OAuth strategy is not implemented yet");
  }
}
