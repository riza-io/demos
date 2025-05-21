export type MessageRole = "user" | "assistant" | "tool";

export type MessageType = "text" | "tool_use" | "tool_result";

export interface TextMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: "text";
  variant: "code" | "text";
}

export interface ToolUseMessage {
  id: string;
  role: MessageRole;
  type: "tool_use";
  tool: {
    id: string;
    name: string;
    input: Record<string, any>;
  };
}

export interface ToolResultMessage {
  id: string;
  role: MessageRole;
  type: "tool_result";
  tool: {
    name: string;
    output: string;
  };
}

export type ChatMessage = TextMessage | ToolUseMessage | ToolResultMessage;
