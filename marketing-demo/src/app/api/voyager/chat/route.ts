import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCORSHeaders } from "@/cors";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages.mjs";
import { ChatRequest, ChatRequestSchema } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `
You are an autonomous agent that can write code to perform user tasks.

You should use the \`execute_function\` tool to write and execute functions.

Each function should be written in TypeScript code, as a function named \`execute\` that takes one argument called \`input\`. For example:

\`\`\`typescript
function execute(input: unknown) {
  // ...
}
\`\`\`

The \`input\` argument passed to the \`execute_function\` tool will be the input to the function.

If you write code that uses an external API, you must make plain HTTP requests to the API, using only the fetch library. Assume fetch is available without any imports.

Do not use any external libraries or imports.

You have access to the following API keys as environment variables:

- STRIPE_API_KEY
- SLACK_API_KEY

There may not be a single API endpoint that serves the needs of your code. Your code may require chaining multiple HTTP requests to different API endpoints, for example: querying an API to get the ID of a resource before using it in another request; querying an API to get the schema of a resource before using it in another request.

GET requests cannot have request bodies. You should use URL query parameters to pass request data in GET requests.

Your code should return JSON objects rather than strings.
`;

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(request),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { history } = ChatRequestSchema.parse(body);

    // Convert our internal message format to Anthropic's format
    const messages: MessageParam[] = [];

    // Process history to create the proper message sequence
    for (let i = 0; i < history.length; i++) {
      const msg = history[i];

      console.log("msg", msg);

      if (msg.type === "text") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      } else if (msg.type === "tool_use") {
        const toolUseContent: Anthropic.ToolUseBlockParam = {
          type: "tool_use",
          id: msg.tool.id,
          input: msg.tool.input,
          name: msg.tool.name,
        };
        const toolUseMessage: MessageParam = {
          role: msg.role,
          content: [toolUseContent],
        };

        messages.push(toolUseMessage);
      } else if (msg.type === "tool_result") {
        // Tool responses need to be formatted according to Anthropic's API
        const toolResultContent: Anthropic.ToolResultBlockParam = {
          type: "tool_result",
          tool_use_id: msg.tool.id,
          content: msg.tool.output,
        };
        messages.push({
          role: "assistant",
          content: [toolResultContent],
        });
      }
    }

    // Create a streaming response from Anthropic
    const stream = anthropic.messages.stream({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 10000,
      messages,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "execute_function",
          description:
            "Execute a TypeScript function with the given input. The function name must be 'execute'.",
          input_schema: {
            type: "object",
            properties: {
              code: { type: "string" },
              input: { type: "object" },
            },
          },
        },
      ],
    });

    // Return the stream directly to the client
    return new Response(stream.toReadableStream(), {
      headers: {
        ...getCORSHeaders(request),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      {
        status: 400,
        headers: getCORSHeaders(request),
      }
    );
  }
}
