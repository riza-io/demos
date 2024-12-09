import Anthropic from "@anthropic-ai/sdk";
import Riza from "@riza-io/api";

export const SYSTEM_PROMPT = `You are an autonomous agent that can create tools to perform tasks. You can write Typescript code to create tools. You can also use the tools you have created to perform tasks. Do not execute tools unless a user asks you to perform a task that requires one. Do not execute tools for example purposes.

You should use the \`create_tool\` tool to create new tools. All tools must have a unique name, including from the available tools.

Each tool should be written in Typescript code, as a function named \`execute\` that takes one argument called \`input\`. For example:

\`\`\`typescript
function execute(input: unknown) {
  // ...
}
\`\`\`

You must also write the \`input_schema\` for the tool, which must be a valid JSON Schema object.

The \`input\` argument passed to the \`execute\` function will match the schema of the \`input_schema\` of the tool.

If you write a tool that uses an external API, you must make plain HTTP requests to the API, using only the node fetch library. You can assume that any authentication is handled outside of the tool via an http proxy, so you do not need to add authentication headers or parameters to the request.

Your tools may require making multiple HTTP requests to different APIs, for example if you need to query an API to get an ID first.

When possible, your tools should return JSON objects rather than formatted strings.

When executing tools, you should use the \`request_user_input\` tool to request user input if you need to.`;

export const CREATE_TOOL_TOOL: Anthropic.Messages.Tool = {
  name: "create_tool",
  description:
    "Create a new tool. This tool will be used to create new tools. You can use the tools you have created to perform tasks.",
  input_schema: {
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
    },
    required: ["name", "description", "code", "input_schema"],
  },
};

export const REQUEST_USER_INPUT_TOOL: Anthropic.Messages.Tool = {
  name: "request_user_input",
  description: "Request user input. The tool will respond with the user input.",
  input_schema: {
    type: "object",
    properties: {},
  },
};

export const SHOW_OPTIONS_TOOL: Anthropic.Messages.Tool = {
  name: "show_options",
  description:
    "Show the user a list of options to choose from as a numbered list starting from 0, corresponding to the index of the option in the list. Returns the user's choice, which will be the index of the option they choose.",
  input_schema: {
    type: "object",
    required: ["options"],
    properties: {
      options: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export const formatRizaToolForClaude = (
  tool: Riza.Tool,
): Anthropic.Messages.Tool => {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Anthropic.Messages.Tool.InputSchema,
  };
};

export const renderContent = (
  content: Anthropic.Messages.MessageParam["content"],
): string[] => {
  if (typeof content === "string") {
    return [content];
  }
  const renderedContent: string[] = [];
  for (const block of content) {
    if (block.type === "tool_use") {
      renderedContent.push(
        `[Tool use] ${block.name}(${JSON.stringify(block.input, null, 2)}) (Tool use ID: ${block.id})`,
      );
    } else if (block.type === "text") {
      renderedContent.push(block.text);
    } else if (block.type === "tool_result") {
      renderedContent.push(
        `[Tool result] ${JSON.stringify(block.content, null, 2)} (Tool useID: ${block.tool_use_id})`,
      );
    } else {
      continue; // image blocks not supported in this demo
    }
  }
  return renderedContent;
};
