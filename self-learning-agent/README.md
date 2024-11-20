# Self-Learning AI Agent

This is a self-learning AI agent that can write its own tools on the fly and execute them (safely, on [Riza](https://riza.io)).

This demo currently supports Stripe out of the box, although purely to keep the authentication setup simple for the demo. It is not prompted specifically for Stripe or any service in particular; as long as you set up the right credentials, it can theoretically support any service it knows about.

## Initial setup

> [!WARNING]
> This agent _actually executes LLM-generated code_ on Riza. While it can't cause damage to your computer, you should only give it access to API keys for development environments.

After cloning the repo, navigate to the `self-learning-agent` directory and run `npm i` to install the dependencies.

You will also need to set up a `.env` file in this directory with three environment variables:

```
ANTHROPIC_API_KEY=<your-anthropic-api-key>
STRIPE_TESTMODE_API_KEY=<your-stripe-testmode-api-key>
RIZA_API_KEY=<your-riza-api-key>
```

You can get an API key for Riza by [signing up and visiting your Dashboard](https://dashboard.riza.io/).

After that, you can run `npm start` to start the agent.

## Getting started with the agent

The agent receives a system prompt when it starts up (which will be printed for you to see). It will then ask you for first prompt.

Since it has access to a Stripe key, you can ask it to operate on your Stripe account. For example, you could ask it to `help me create a new stripe customer`:

```
[Input requested] Enter your input: help me create a new stripe customer
--------------------------------
Me:  help me create a new stripe customer
--------------------------------
[Querying LLM...]
--------------------------------
Assistant:  Certainly! I'd be happy to help you create a new Stripe customer. To do this, we'll need to create a tool that interacts with the Stripe API. First, let's create a tool for this purpose, and then we'll use it to create a new customer.
```

The agent will then create a Riza tool to help with this task, prompt you for input, then execute that tool on Riza!

Since the Stripe API is well-known to the LLM, you can ask it to do more complex things, even things that require multiple API calls. For example, you could ask it to `list all stripe charges for the customer with the email david@riza.io`:

```
[Input requested] Enter your input: can you list all stripe charges for the customer with the email david@riza.io?
--------------------------------
Me:  can you list all stripe charges for the customer with the email david@riza.io?
--------------------------------
[Querying LLM...]
--------------------------------
Assistant:  Certainly! To list all Stripe charges for a specific customer, we'll need to create a new tool that interacts with the Stripe API to fetch this information. Let's create this tool and then use it to retrieve the charges for the customer with the email david@riza.io.

First, let's create the tool:
```

The LLM will write a new tool that takes a single input (an email), and the tool will query customers by email, then query for charges using the found customer ID.

```
--------------------------------
Me:  [Tool result] Created tool list_stripe_charges_by_email (ID: toolu_01VV4pkCz9xgGfRJtzhZH673)
--------------------------------
[Querying LLM...]
--------------------------------
Assistant:  Great! Now that we have created the tool to list Stripe charges by email, let's use it to retrieve the charges for the customer with the email david@riza.io.
--------------------------------
--------------------------------
Assistant:  [Tool use] list_stripe_charges_by_email (ID: toolu_01NvCYWjMUmN8YM9KCxGCnVm)
--------------------------------
[Calling tool]:  list_stripe_charges_by_email {
  email: "david@riza.io",
}
--------------------------------
[LLM will then show the result of the tool execution]
```

Every tool that the agent creates is saved to Riza using our [Tools API](https://docs.riza.io/api-reference/tool/create-tool). You can view these tools in the [Riza Dashboard](https://dashboard.riza.io/) in the project that your Riza API key belongs to.

### Prompting tips

Since the agent is not specifically prompted for any particular service, it helps to mention Stripe directly in your first prompts (e.g. "list all my Stripe customers" instead of just "list all my customers").