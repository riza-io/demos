### "Voyager" Agent MCP Server

https://github.com/user-attachments/assets/f906ecba-0e5f-404d-9a95-2eda2f2fbdbc

This implements an [MCP Server](https://modelcontextprotocol.io) that uses Riza's Code Interpreter (specifically the [Tools API](https://riza.io/blog/introducing-tools-api)) to allow an LLM to write and execute its own tools in a sandboxed environment.

You can learn more about Riza's Code Interpreter in our [docs](https://docs.riza.io/introduction).

## Setup

This MCP server should work with any MCP client. We've tested this with Claude Desktop. If you're using Claude Desktop, update your Claude Desktop config, typically found at `~/Library/Application\ Support/Claude/claude_desktop_config.json` (for macOS), and update the config as follows:

```json
{
  "mcpServers": {
    "self-writing-agent-server": {
      "command": "npx",
      "args": ["@riza-io/voyager-server"],
      "env": {
        "RIZA_API_KEY": "YOUR_RIZA_API_KEY",
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY",
        "STRIPE_TESTMODE_API_KEY": "YOUR_STRIPE_TESTMODE_API_KEY",
        "SLACK_API_KEY": "YOUR_SLACK_API_KEY",
        "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY",
        "AIRTABLE_API_KEY": "YOUR_AIRTABLE_API_KEY"
      }
    }
  }
}
```

This demo _requires_ a Riza API key, which you can get from your [Riza Dashboard](https://dashboard.riza.io), and an Anthropic API key, which you can get from your [Anthropic Dashboard](https://console.anthropic.com/settings/keys).

The other keys are optional. You only need to provide them if you want to prompt the Voyager agent to make calls to those APIs (e.g. "list my stripe charges" will call the Stripe API, and will require a Stripe API key).

> [!NOTE]
> All LLM-generated code is executed securely and remotely on Riza's servers using our Code Interpreter, not on your local machine. However, this code can make real API calls, so we recommend using keys for non-production environments (such as Stripe testmode keys).

Currently, additional credentials require code changes, so you'll need to clone the repo and run the build locally:

```
git clone git@github.com:riza-io/demos.git
cd demos/voyager-server
npm run watch
```

Also update your Claude Desktop config's `command` to `node` and `args` to `PATH-TO-YOUR-DEMOS-REPO/voyager-server/build/index.js`.

Then you can modify the `credentials.ts` file in the source directory. (Make sure you run `npm run build` or `npm run watch` if you make changes to that file.)

Come chat with us on [Discord](https://discord.gg/4P6PUeJFW5) if you have any questions or feedback!

## Usage

To be written.
