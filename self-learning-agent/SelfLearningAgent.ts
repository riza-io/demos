import { Anthropic } from '@anthropic-ai/sdk'
import { Riza } from '@riza-io/api'
import { anthropic, riza } from './clients'
import * as readline from 'readline'
import {
  CREATE_TOOL_TOOL,
  formatRizaToolForClaude,
  renderContent,
  REQUEST_USER_INPUT_TOOL,
  SHOW_OPTIONS_TOOL,
} from './toolUtils'
import { SYSTEM_PROMPT } from './toolUtils'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

/**
 * The Riza API allows you to securely authenticate API requests, so your agent does not have access to your secrets.
 * See the docs for more info: https://docs.riza.io/reference/http
 */
const HTTP_AUTH_CONFIG: Riza.ToolExecParams.HTTP = {
  allow: [
    {
      host: 'api.stripe.com',
      auth: { bearer: { token: process.env.STRIPE_TESTMODE_API_KEY } },
    },
  ],
}

const printMessage = (...messages: unknown[]) => {
  console.log(...messages)
  console.log('--------------------------------')
}

export class SelfLearningAgent {
  messages: Anthropic.Messages.MessageParam[] = []
  rizaTools: Record<
    string,
    { rizaDefinition: Riza.Tool; claudeDefinition: Anthropic.Messages.Tool }
  > = {}
  requiresUserPrompt = true

  constructor() {
    this.messages = [
      {
        role: 'user',
        content: SYSTEM_PROMPT,
      },
    ]
    console.log('System prompt:', SYSTEM_PROMPT)
  }

  getToolsForClaude(): Anthropic.Messages.Tool[] {
    // We only provide three tools out of the box. The agent will write the rest!
    return [
      CREATE_TOOL_TOOL,
      REQUEST_USER_INPUT_TOOL,
      SHOW_OPTIONS_TOOL,
      ...Object.values(this.rizaTools).map((tool) => tool.claudeDefinition),
    ]
  }

  /**
   * Uses the Riza API to execute a tool.
   * https://docs.riza.io/api-reference/tool/execute-tool
   */
  async executeRizaTool(name: string, input: unknown) {
    const rizaTool = this.rizaTools[name].rizaDefinition
    const response = await riza.tools.exec(rizaTool.id, {
      input,
      http: HTTP_AUTH_CONFIG,
    })
    printMessage('Me: [Tool result]', response.output)
    return response.output
  }

  /**
   * Creates a new tool using the Riza API.
   * https://docs.riza.io/api-reference/tool/create-tool
   */
  async createTool(tool: Anthropic.Messages.ToolUseBlock) {
    const input = tool.input as {
      name: string
      description: string
      code: string
      input_schema: Record<string, unknown>
    }
    const newRizaTool = await riza.tools.create({
      name: input.name,
      description: input.description,
      code: input.code,
      input_schema: input.input_schema,
      language: 'TYPESCRIPT',
    })
    this.rizaTools[newRizaTool.name] = {
      rizaDefinition: newRizaTool,
      claudeDefinition: formatRizaToolForClaude(newRizaTool),
    }
    printMessage('[Created Riza tool]: ', newRizaTool.name)
    printMessage('[Meta] Self-written tools:', Object.keys(this.rizaTools))
    return newRizaTool
  }

  /**
   * Requests user input from the console.
   */
  async requestUserInput() {
    return new Promise<string>((resolve) => {
      rl.question('[Input requested] Enter your input: ', (input) => {
        resolve(input)
      })
    })
  }

  /**
   * Shows a list of options to the user and returns the index of the selected option.
   */
  async showOptions(tool: Anthropic.Messages.ToolUseBlock) {
    printMessage('Choose one of the following options:')
    const options = (tool.input as { options: string[] }).options
    for (let i = 0; i < options.length; i++) {
      printMessage(`${i}: ${options[i]}`)
    }
    const response = await this.requestUserInput()
    return parseInt(response)
  }

  async handleToolResponse(response: Anthropic.Messages.ToolUseBlock) {
    printMessage('Assistant: [Tool use]', response.name, response.input)

    // We have three hardcoded tools. The rest are written by the agent and executed on Riza.
    if (response.name === CREATE_TOOL_TOOL.name) {
      const tool = await this.createTool(response)
      this.pushMessage({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: response.id,
            content: `Created tool ${tool.name}`,
          },
        ],
      })
    } else if (response.name === REQUEST_USER_INPUT_TOOL.name) {
      const userInput = await this.requestUserInput()
      this.pushMessage({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: response.id,
            content: userInput,
          },
        ],
      })
    } else if (response.name === SHOW_OPTIONS_TOOL.name) {
      const index = await this.showOptions(response)
      this.pushMessage({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: response.id,
            content: `${index}`,
          },
        ],
      })
    } else {
      const output = await this.executeRizaTool(response.name, response.input)
      this.pushMessage({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: response.id,
            content: JSON.stringify(output),
          },
        ],
      })
    }
  }

  async handleResponse(responses: Anthropic.Messages.ContentBlock[]) {
    this.pushMessage({
      role: 'assistant',
      content: responses,
    })
    this.requiresUserPrompt = true

    for (const response of responses) {
      if (response.type === 'tool_use') {
        await this.handleToolResponse(response)
      }
    }
  }

  pushMessage(...messages: Anthropic.Messages.MessageParam[]) {
    this.messages.push(...messages)

    for (const message of messages) {
      const renderedContent = renderContent(message.content)
      for (const line of renderedContent) {
        if (message.role === 'user') {
          printMessage('Me:', line)
        } else {
          printMessage('Assistant:', line)
        }
      }
    }

    if (messages.some((message) => message.role === 'user')) {
      this.requiresUserPrompt = false
    }
  }

  async callLLM() {
    printMessage('[Querying LLM...]')
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: this.messages,
      tools: this.getToolsForClaude(),
    })
    await this.handleResponse(response.content)
    return response.content
  }

  async requestDirectUserPrompt() {
    const input = await this.requestUserInput()
    this.pushMessage({
      role: 'user',
      content: [
        {
          type: 'text',
          text: input,
        },
      ],
    })
  }

  async loop() {
    printMessage('Starting loop')

    while (true) {
      if (this.requiresUserPrompt) {
        await this.requestDirectUserPrompt()
      }
      await this.callLLM()
    }
  }
}
