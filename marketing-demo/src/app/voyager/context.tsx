"use client";

import Anthropic from "@anthropic-ai/sdk";
import { createContext } from "react";

export const ToolUseContext = createContext<{
  toolUse: {
    id: string;
    toolName?: string;
    toolInput?: unknown;
  } | null;
  setToolUse: (id: string, toolName?: string, toolInput?: unknown) => void;
  clearToolUse: () => void;
}>({
  toolUse: null,
  setToolUse: () => {},
  clearToolUse: () => {},
});
