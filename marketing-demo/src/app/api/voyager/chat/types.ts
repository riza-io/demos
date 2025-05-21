import { z } from "zod";

// Define schemas for different message types
export const TextMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  type: z.literal("text"),
});

export const ToolUseSchema = z.object({
  role: z.enum(["user", "assistant"]),
  type: z.literal("tool_use"),
  tool: z.object({
    name: z.string(),
    input: z.record(z.any()),
    id: z.string(),
  }),
});

export const ToolResultSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  type: z.literal("tool_result"),
  tool: z.object({
    id: z.string(),
    name: z.string(),
    output: z.string(),
  }),
});

export const MessageSchema = z.union([
  TextMessageSchema,
  ToolUseSchema,
  ToolResultSchema,
]);

export const ChatRequestSchema = z.object({
  history: z.array(MessageSchema),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
