#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { ToolMap } from "./types.js";
import { Riza } from "@riza-io/api";
import { CREATE_TOOL_TOOL, EDIT_TOOL_TOOL, EXECUTE_CODE_TOOL, FETCH_TOOL_TOOL, SAVE_AGENT_TOOL } from "./toolUtils.js";
import { HTTP_AUTH_CONFIG } from "./credentials.js";
import fs from "fs";
dotenv.config();

const SAVED_AGENTS_DIR = "/Users/david/riza/saved-agents";

const printMessage = (...messages: unknown[]) => {
  // Using error to avoid interfering with MCP communication that happens on stdout
  console.error(...messages);
  console.error("--------------------------------");
};

const riza = new Riza({
  apiKey: process.env.RIZA_API_KEY,
});

class RizaServer {
  private server: Server;
  private disableToolCreation: boolean;

  private tools: ToolMap = {};

  constructor({
    disableToolCreation = false,
    loadedTools = [],
  }: {
    disableToolCreation?: boolean;
    loadedTools?: Riza.Tool[];
  }) {
    this.server = new Server(
      {
        name: "riza-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
      },
    );

    this.disableToolCreation = disableToolCreation;

    this.initBaseTools();

    this.setupHandlers(loadedTools);
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initBaseTools(): void {
    if (!this.disableToolCreation) {
      this.tools[CREATE_TOOL_TOOL.name] = {
        definition: CREATE_TOOL_TOOL,
        execute: this.handleCreateTool.bind(this),
      };
    }

    this.tools[SAVE_AGENT_TOOL.name] = {
      definition: SAVE_AGENT_TOOL,
      execute: this.handleSaveAgent.bind(this),
    };

    this.tools[EXECUTE_CODE_TOOL.name] = {
      definition: EXECUTE_CODE_TOOL,
      execute: this.handleExecuteCode.bind(this),
    };

    this.tools[FETCH_TOOL_TOOL.name] = {
      definition: FETCH_TOOL_TOOL,
      execute: this.handleFetchTool.bind(this),
    };

    this.tools[EDIT_TOOL_TOOL.name] = {
      definition: EDIT_TOOL_TOOL,
      execute: this.handleEditTool.bind(this),
    };
  }

  private async registerRizaTool(tool: Riza.Tool): Promise<void> {
    this.registerRizaTools([tool]);

    printMessage("[Notification] Tools list changed");
    await this.server.notification({
      method: "notifications/tools/list_changed",
    });
  }

  /** Must remain synchronous to register tools before server is initialized */
  private registerRizaTools(
    tools: Riza.Tool[],
  ): void {
    for (const tool of tools) {
      if (this.tools[tool.name]) {
        throw new Error(`Tool ${tool.name} already exists`);
      }
      this.tools[tool.name] = {
        definition: {
          name: tool.name,
          inputSchema: tool.input_schema as Tool["inputSchema"],
          description: tool.description,
        },
        rizaDefinition: tool,
        execute: this.createRizaToolHandler(tool).bind(this),
      };
    }
  }

  private setupHandlers(loadedTools: Riza.Tool[]): void {
    this.registerRizaTools(loadedTools);
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      printMessage("[Requesting tool list]", Object.keys(this.tools));
      return {
        tools: Object.values(this.tools).map((tool) => tool.definition),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      printMessage("[Executing tool]", request.params.name);
      const tool = this.tools[request.params.name];
      if (!tool) {
        throw new Error(`Tool ${request.params.name} not found`);
      }
      const result = await tool.execute(request.params.arguments);
      printMessage("[Tool execution result]", result);
      return result;
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Although this is just an informative message, we must log to stderr,
    // to avoid interfering with MCP communication that happens on stdout
    console.error("Riza MCP server running on stdio");
  }

  async handleCreateTool(input: {
    name: string;
    description: string;
    code: string;
    input_schema: Record<string, unknown>;
    language: "TYPESCRIPT" | "PYTHON";
  }): Promise<CallToolResult> {
    const newRizaTool = await riza.tools.create({
      name: input.name,
      description: input.description,
      code: input.code,
      input_schema: input.input_schema,
      language: input.language,
    });
    await this.registerRizaTool(newRizaTool);
    printMessage("[Created Riza tool]", newRizaTool.name);
    return {
      content: [{ type: "text", text: `Created tool: ${newRizaTool.name}` }],
    };
  }

  async handleFetchTool(input: {
    tool_name: string;
  }): Promise<CallToolResult> {
    const tool = this.tools[input.tool_name]
    if (!tool || !('rizaDefinition' in tool)) {
      throw new Error(`Tool ${input.tool_name} not found`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(tool.rizaDefinition) }],
    };
  }

  async handleEditTool(input: {
    tool_name: string;
    name?: string;
    description?: string;
    code?: string;
    input_schema?: Record<string, unknown>;
    language?: "TYPESCRIPT" | "PYTHON";
  }): Promise<CallToolResult> {
    const tool = this.tools[input.tool_name]
    if (!tool || !('rizaDefinition' in tool)) {
      throw new Error(`Tool ${input.tool_name} not found`);
    }
    const { tool_name, ...rest } = input

    const rizaUpdateParams: Riza.ToolUpdateParams = {
      // RIZ-270: Update fails if input_schema is not provided
      input_schema: tool.rizaDefinition.input_schema,
      ...rest,
    }    
    const updatedTool = await riza.tools.update(tool.rizaDefinition.id, rizaUpdateParams);
    return {
      content: [{ type: "text", text: `Updated tool: ${JSON.stringify(updatedTool)}` }],
    };
  }

  async handleExecuteCode(input: {
    code: string;
    language: "TYPESCRIPT" | "PYTHON";
  }): Promise<CallToolResult> {
    const result = await riza.command.exec({
      code: input.code,
      language: input.language,
      http: HTTP_AUTH_CONFIG,
    })
    return {
      content: [{ type: "text", text: result.exit_code === 0 ? result.stdout || "" : JSON.stringify(result) }],
    };
  }

  async handleSaveAgent(input: {
    name: string;
  }): Promise<CallToolResult> {
    printMessage('[SAVING TOOLS]', this.tools)

    const agent = {
      name: input.name,
      rizaTools: Object.values(this.tools).filter(tool => 'rizaDefinition' in tool).map(tool => tool.rizaDefinition.id),
    }

    fs.writeFileSync(`${SAVED_AGENTS_DIR}/${input.name}.json`, JSON.stringify(agent, null, 2));

    printMessage("[Saved agent]", input.name);
    return {
      content: [{ type: "text", text: `Saved agent: ${input.name}` }],
    };
  }

  createRizaToolHandler(
    tool: Riza.Tool,
  ): (input: unknown) => Promise<CallToolResult> {
    return async (input: unknown): Promise<CallToolResult> => {
      const response = await riza.tools.exec(tool.id, {
        input,
        http: HTTP_AUTH_CONFIG,
      });
      if (response.execution.exit_code !== 0) {
        return {
          isError: true,
          content: [{ type: "text", text: response.execution.stderr }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(response.output) }],
      };
    };
  }
}

// We have to preload the tools before initializing the server due to https://github.com/orgs/modelcontextprotocol/discussions/76
const rizaServerFactory = async () => {
  printMessage('args', process.argv)
  const agentName = process.argv[2]
  if (agentName) {
    printMessage('[Loading agent]', agentName, `${SAVED_AGENTS_DIR}/${agentName}.json`)
    const agent = JSON.parse(fs.readFileSync(`${SAVED_AGENTS_DIR}/${agentName}.json`, 'utf8'));
    const tools = await Promise.all(
      agent.rizaTools.map(async (id: string) => riza.tools.get(id)),
    );
    // For now, disable tool creation when loading an agent, because Claude Desktop doesn't support dynamic tool creation
    return new RizaServer({ loadedTools: tools, disableToolCreation: true });
  }

  return new RizaServer({ loadedTools: [] });
};

const server = await rizaServerFactory();
server.run().catch(console.error);
