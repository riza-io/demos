import { Anthropic } from "@anthropic-ai/sdk";
import { Riza } from "@riza-io/api";
import { anthropic, riza } from "./clients";
import * as readline from "readline";
import {
  CREATE_TOOL_TOOL,
  formatRizaToolForClaude,
  renderContent,
  REQUEST_USER_INPUT_TOOL,
  SHOW_OPTIONS_TOOL,
} from "./toolUtils";
import { SYSTEM_PROMPT } from "./toolUtils";
import {
  getGoogleServiceAccountAccessToken,
  HTTP_AUTH_CONFIG,
} from "./credentials";
import fs from "fs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const printMessage = (...messages: unknown[]) => {
  console.log(...messages);
  console.log("--------------------------------");
};

type RizaToolDefinition = {
  execute: (input: any) => Promise<any>;
  claudeDefinition: Anthropic.Messages.Tool;
  rizaToolDefinition: Riza.Tool;
};

type HardCodedToolDefinition = {
  execute: (input: any) => Promise<any>;
  claudeDefinition: Anthropic.Messages.Tool;
};

type ToolDefinition = RizaToolDefinition | HardCodedToolDefinition;

export class SelfLearningAgent {
  messages: Anthropic.Messages.MessageParam[] = [];
  requiresUserPrompt = true;
  tools: Record<string, ToolDefinition> = {};
  authConfig: Riza.Tools.ToolExecParams.HTTP = HTTP_AUTH_CONFIG;

  constructor() {
    this.messages = [
      {
        role: "user",
        content: SYSTEM_PROMPT,
      },
    ];
    console.log("System prompt:", SYSTEM_PROMPT);

    // We only provide a few tools out of the box. The agent will write the rest!
    this.tools = {
      [CREATE_TOOL_TOOL.name]: {
        execute: this.handleCreateTool.bind(this),
        claudeDefinition: CREATE_TOOL_TOOL,
      },
      [REQUEST_USER_INPUT_TOOL.name]: {
        execute: this.handleRequestUserInput.bind(this),
        claudeDefinition: REQUEST_USER_INPUT_TOOL,
      },
      [SHOW_OPTIONS_TOOL.name]: {
        execute: this.handleShowOptions.bind(this),
        claudeDefinition: SHOW_OPTIONS_TOOL,
      },
    };
  }

  registerRizaTool(tool: Riza.Tool) {
    if (this.tools[tool.name]) {
      throw new Error(`Tool ${tool.name} already exists`);
    }

    this.tools[tool.name] = {
      execute: this.createRizaToolExecuteFn(tool).bind(this),
      claudeDefinition: formatRizaToolForClaude(tool),
      rizaToolDefinition: tool,
    };
  }

  async load(path: string) {
    console.log("[Loading agent...]");
    const data = fs.readFileSync(path, "utf8");
    const parsed = JSON.parse(data);
    const toolIds = parsed.tools as string[];
    const prompt = parsed.prompt as string | undefined;

    if (prompt) {
      this.messages.push({
        role: "user",
        content: prompt,
      });
    }

    const tools = await Promise.all(
      toolIds.map(async (id: string) => riza.tools.get(id)),
    );

    for (const tool of tools) {
      this.registerRizaTool(tool);
    }
  }

  getToolsForClaude(): Anthropic.Messages.Tool[] {
    return Object.values(this.tools).map((tool) => tool.claudeDefinition);
  }

  /**
   * Uses the Riza API to execute a tool.
   * https://docs.riza.io/api-reference/tool/execute-tool
   */
  createRizaToolExecuteFn(rizaToolDefinition: Riza.Tool) {
    return async (input: unknown) => {
      const response = await riza.tools.exec(rizaToolDefinition.id, {
        input,
        http: this.authConfig,
      });
      if (response.execution.exit_code !== 0) {
        return {
          error: response.execution.stderr,
        };
      }
      return response.output;
    };
  }

  getRizaTools(): RizaToolDefinition[] {
    return Object.values(this.tools).filter(
      (tool): tool is RizaToolDefinition => "rizaToolDefinition" in tool,
    );
  }

  /**
   * Creates a new tool using the Riza API.
   * https://docs.riza.io/api-reference/tool/create-tool
   */
  async handleCreateTool(input: {
    name: string;
    description: string;
    code: string;
    input_schema: Record<string, unknown>;
  }) {
    const newRizaTool = await riza.tools.create({
      name: input.name,
      description: input.description,
      code: input.code,
      input_schema: input.input_schema,
      language: "TYPESCRIPT",
    });
    this.registerRizaTool(newRizaTool);
    printMessage("[Created Riza tool]: ", newRizaTool.name);
    printMessage(
      "[Meta] Self-written tools:",
      this.getRizaTools().map((tool) => tool.rizaToolDefinition.name),
    );
    return `Created tool: ${newRizaTool.name} (Tool ID: ${newRizaTool.id})`;
  }

  /**
   * Requests user input from the console.
   */
  async handleRequestUserInput() {
    return new Promise<string>((resolve) => {
      rl.question("[Input requested] Enter your input: ", (input) => {
        if (input === "save") {
          this.save();
          process.exit(0);
        }
        resolve(input);
      });
    });
  }

  /**
   * Shows a list of options to the user and returns the index of the selected option.
   */
  async handleShowOptions(input: { options: string[] }) {
    printMessage("Choose one of the following options:");
    const options = input.options;
    for (let i = 0; i < options.length; i++) {
      printMessage(`${i}: ${options[i]}`);
    }
    const response = await this.handleRequestUserInput();
    return parseInt(response);
  }

  async handleToolResponse(response: Anthropic.Messages.ToolUseBlock) {
    const tool = this.tools[response.name];
    if (!tool) {
      throw new Error(`Tool ${response.name} not found`);
    }

    const output = await tool.execute(response.input);

    this.pushMessage({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: response.id,
          content: JSON.stringify(output),
        },
      ],
    });
  }

  async handleResponse(responses: Anthropic.Messages.ContentBlock[]) {
    this.pushMessage({
      role: "assistant",
      content: responses,
    });
    this.requiresUserPrompt = true;

    for (const response of responses) {
      if (response.type === "tool_use") {
        await this.handleToolResponse(response);
      }
    }
  }

  pushMessage(...messages: Anthropic.Messages.MessageParam[]) {
    this.messages.push(...messages);

    for (const message of messages) {
      const renderedContent = renderContent(message.content);
      for (const line of renderedContent) {
        if (message.role === "user") {
          printMessage("Me:", line);
        } else {
          printMessage("Assistant:", line);
        }
      }
    }

    if (messages.some((message) => message.role === "user")) {
      this.requiresUserPrompt = false;
    }
  }

  async callLLM() {
    printMessage("[Querying LLM...]");
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: this.messages,
      tools: this.getToolsForClaude(),
    });
    await this.handleResponse(response.content);
    return response.content;
  }

  async requestDirectUserPrompt() {
    const input = await this.handleRequestUserInput();
    this.pushMessage({
      role: "user",
      content: [
        {
          type: "text",
          text: input,
        },
      ],
    });
  }

  async tryGetGoogleAccessToken() {
    try {
      const token = await getGoogleServiceAccountAccessToken();
      if (token) {
        this.authConfig.allow?.push({
          host: "*.googleapis.com",
          auth: { bearer: { token: token } },
        });
        console.log("Successfully configured Google access token", token);
      }
    } catch (e) {
      console.log("No Google access token configured");
    }
  }

  async loop() {
    printMessage("Starting loop");

    await this.tryGetGoogleAccessToken();

    while (true) {
      if (this.requiresUserPrompt) {
        await this.requestDirectUserPrompt();
      }
      await this.callLLM();
    }
  }

  save() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const savePath = `./saved-agents/${timestamp}.json`;

    printMessage("[Saving agent...]", savePath);
    printMessage(`To use this agent again, run "npm start ${timestamp}"`);

    fs.writeFileSync(
      savePath,
      JSON.stringify(
        {
          tools: this.getRizaTools().map((tool) => tool.rizaToolDefinition.id),
        },
        null,
        2,
      ),
    );
  }
}
