import {
  CallToolResult,
  Tool as MCPTool,
} from "@modelcontextprotocol/sdk/types.js";
import type Riza from "@riza-io/api";

export type BaseTool = {
  execute: (input: any) => Promise<CallToolResult>;
  definition: MCPTool;
};

export type RizaTool = {
  execute: (input: any) => Promise<CallToolResult>;
  definition: MCPTool;
  rizaDefinition: Riza.Tool;
};

export type Tool = BaseTool | RizaTool;

export type ToolMap = {
  [name: string]: Tool;
};
