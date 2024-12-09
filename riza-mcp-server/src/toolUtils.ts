import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const CREATE_TOOL_TOOL: Tool = {
  name: "create_tool",
  description:
    "Create a new tool. This tool will be used to create new tools. You can use the tools you have created to perform tasks.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The name of the tool you are writing. This is what you will use to call the tool.",
      },
      description: {
        type: "string",
        description:
          "A description of the tool you are writing. This will help you or other agents or people pick the appropriate tool in the future.",
      },
      code: {
        type: "string",
        description:
          "The Typescript code for the tool you are writing. The code should be a valid Typescript function named `execute` that takes one argument called `input`. When called, the `input` provided will match the schema of the `input_schema` of the tool.",
      },
      input_schema: {
        type: "object",
        description:
          "The input schema for the tool. This must be provided as a valid JSON Schema object.",
      },
      language: {
        type: "string",
        description:
          "The language of the tool you are writing. This must be either 'TYPESCRIPT' or 'PYTHON'.",
      },
    },
  },
};

export const SAVE_AGENT_TOOL: Tool = {
  name: "save_agent",
  description: "Save the current set of tools as an agent.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "The name of the agent you are saving. This will be used to identify the agent in the future.",
      },
    },
  },
};
