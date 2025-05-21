import { z } from "zod";

// Define schemas for different message types
// export const TextMessageSchema = z.object({
//   role: z.enum(["user", "assistant"]),
//   content: z.string(),
//   type: z.literal("text"),
// });

// export const ToolUseSchema = z.object({
//   role: z.enum(["user", "assistant"]),
//   type: z.literal("tool_use"),
//   tool: z.object({
//     name: z.string(),
//     input: z.record(z.any()),
//     id: z.string(),
//   }),
// });

// export const ToolResultSchema = z.object({
//   role: z.enum(["user", "assistant"]),
//   type: z.literal("tool_result"),
//   tool_use_id: z.string(),
//   content: z.string(),
// });

// export const MessageSchema = z.union([
//   TextMessageSchema,
//   ToolUseSchema,
//   ToolResultSchema,
// ]);

export const TextMessageContentSchema = z.object({
  text: z.string(),
  type: z.literal("text"),
});

export const ToolUseContentSchema = z.object({
  id: z.string(),
  input: z.record(z.any()),
  name: z.string(),
  type: z.literal("tool_use"),
});

export const ToolResultContentSchema = z.object({
  tool_use_id: z.string(),
  content: z.string(),
  type: z.literal("tool_result"),
});

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    z.string(),
    z.array(
      z.union([
        TextMessageContentSchema,
        ToolUseContentSchema,
        ToolResultContentSchema,
      ])
    ),
  ]),
});

export const ChatRequestSchema = z.object({
  history: z.array(MessageSchema),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
