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

In Claude Desktop, we recommend creating a new project and adding a system prompt (called "project instructions"). We've provided a basic [system prompt](system-prompt.txt) in this repo that you can paste in here:

<img width="1217" alt="Screenshot 2024-12-11 at 1 51 54 PM" src="https://github.com/user-attachments/assets/c9e42ebb-f687-44be-8e0d-df3f0def5934" />

Verify that your MCP server is connected by looking for the hammer icon:

<img width="653" alt="Screenshot 2024-12-11 at 1 53 28 PM" src="https://github.com/user-attachments/assets/88e5a2eb-498c-4be3-9620-9e8b40436214" />

You can MCP server logs by running `tail -n 20 -f ~/Library/Logs/Claude/mcp*.log` in your Terminal to look for any issues.

Once you've verified the MCP server is connected and you've selected your project, you can start prompting the agent to write tools. You can either ask it to perform a task, for which it will usually write a tool for, or to explicitly write tools.

> list my five most recent stripe charges

> write a tool to 1. refund a stripe charge, 2. send a message to #refunds channel on slack with refund details

The MCP server also provides an "edit tool" function that lets the LLM edit tools it has written; this is useful if you wish to make tweaks to a tool, or for your LLM to correct incorrect code is has written.

The Riza execution environment for TypeScript does not currently support custom packages, so this agent is prompted to use REST API calls rather than SDK clients. However, we're working on adding custom package support for TypeScript, so stay tuned! (We do have [limited package support](https://docs.riza.io/reference/packages) for Python.)

## Saving and loading agents

If you've had a particularly successful prompting session with the Voyager agent, and are happy with the tools it has written, you can ask it to "save agent", which will spit out a JSON file to `~/riza/saved-agents` on your machine.

To load this agent for reuse, edit the `claude_desktop_config.json` file again and add a second argument with the name of the agent (without the `.json` file extension). For example, if you have an agent saved at `~/riza/saved-agents/stripe_refund_agent.json`, you would update your Claude Desktop config like so:

```json

{
  "mcpServers": {
    "self-writing-agent-server": {
      "command": "npx",
      "args": ["@riza-io/voyager-server", "stripe_refund_agent"],
    ...
}
```

Simply remove (or leave as an empty string) the second argument to revert to a blank slate agent.

## Viewing and editing tools in browser

The tools your agent writes are saved to Riza using our Tools API. The Riza Dashboard offers a web UI to view, edit, and execute these tools!

<img width="1117" alt="Screenshot 2024-12-11 at 2 03 33 PM" src="https://github.com/user-attachments/assets/a6e29c0c-e3f5-4e9d-a57f-a445ad04569a" />
