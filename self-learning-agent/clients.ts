import { Anthropic } from "@anthropic-ai/sdk";
import { Riza } from "@riza-io/api";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const riza = new Riza({
  apiKey: process.env.RIZA_API_KEY,
});
