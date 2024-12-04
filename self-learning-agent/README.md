# Self-Learning AI Agent

This is a self-learning AI agent that can write its own tools on the fly and execute them (safely, on [Riza](https://riza.io)).

This demo currently supports Stripe out of the box, although purely to keep authentication setup simple and safe (please use a [Stripe test key](https://docs.stripe.com/test-mode)!). It is not prompted specifically for Stripe or any service in particular; as long as you set up the right credentials, it can theoretically support any service it knows about.

## Initial setup

> [!WARNING]
> This agent _actually executes LLM-generated code_ on Riza. While it can't cause damage to your computer, you should only give it access to API keys for test/development environments. Please use a [Stripe test key](https://docs.stripe.com/test-mode) to run this demo.

After cloning the repo, navigate to the `self-learning-agent` directory and run `npm i` to install the dependencies.

You will also need to set up a `.env` file in this directory with several environment variables. `ANTHROPIC_API_KEY` and `RIZA_API_KEY` are required. By default, we support Stripe and Slack; if you would your agent to use those APIs, you'll need to include API keys for those services.

You can customize which services an agent can use by editing the `HTTP_AUTH_CONFIG` array in `credentials.ts`.

```
ANTHROPIC_API_KEY=<your-anthropic-api-key>
RIZA_API_KEY=<your-riza-api-key>
STRIPE_TESTMODE_API_KEY=<your-stripe-testmode-api-key>
SLACK_API_KEY=<your-slack-api-key>
```

You can get an API key for Riza by [signing up and visiting your Dashboard](https://dashboard.riza.io/).

After that, you can run `npm start` to start the agent.

## Getting started with the agent

> [!NOTE]
> As with any LLM-generated responses, there is variation between runs, and the agent may occasionally produce invalid code. Even if you use the same prompts, the output you receive may not be identical to the examples below.

The agent receives a system prompt when it starts up (which will be printed for you to see). It will then ask you for first prompt.

### "help me create a new stripe customer"
Since it has access to a Stripe key, you can ask it to operate on your Stripe account. For example, you could ask it to `help me create a new stripe customer`:

```
[Input requested] Enter your input: help me create a new stripe customer
Me: help me create a new stripe customer
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Certainly! I'll create a tool to help create a new Stripe customer. First, let's create the tool using the `create_tool` function. This tool will use the Stripe API to create a new customer.
```

The agent will then create that tool by writing a TypeScript function and input schema:

```
Assistant: [Tool use] create_tool {
  name: "create_stripe_customer",
  description: "Creates a new Stripe customer using the provided email and name.",
  input_schema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "The customer's email address",
      },
      name: {
        type: "string",
        description: "The customer's full name",
      },
    },
    required: [ "email", "name" ],
  },
  code: "async function execute(input: { email: string; name: string }) {\n  const apiUrl = 'https://api.stripe.com/v1/customers';\n  const params = new URLSearchParams();\n  params.append('email', input.email);\n  params.append('name', input.name);\n\n  try {\n    const response = await fetch(apiUrl, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/x-www-form-urlencoded',\n      },\n      body: params,\n    });\n\n    if (!response.ok) {\n      throw new Error(`HTTP error! status: ${response.status}`);\n    }\n\n    const data = await response.json();\n    return {\n      success: true,\n      customerId: data.id,\n      message: `Stripe customer created successfully with ID: ${data.id}`,\n    };\n  } catch (error) {\n    return {\n      success: false,\n      message: `Failed to create Stripe customer: ${error.message}`,\n    };\n  }\n}",
}
--------------------------------
[Created Riza tool]:  create_stripe_customer
--------------------------------
[Meta] Self-written tools: [ "create_stripe_customer" ]
```

The agent now has the ability to use the tool it wrote. It will prompt you for some information about the new customer, and then use the tool to create the customer, which we will execute on Riza.

```
Assistant: Great! I've created a new tool called `create_stripe_customer` that can create a new Stripe customer using the provided email and name. Now, let's use this tool to create a new Stripe customer for you.

To create a new Stripe customer, we need two pieces of information: the customer's email address and full name. I'll use the `request_user_input` tool to ask for this information.
--------------------------------
Assistant: [Tool use] request_user_input {}
--------------------------------
[Input requested] Enter your input: David Lee, david+demo@riza.io
[Querying LLM...]
--------------------------------
Assistant: Thank you for providing the information. I'll now use the `create_stripe_customer` tool to create a new customer with the provided details.
--------------------------------
Assistant: [Tool use] create_stripe_customer {
  email: "david+demo@riza.io",
  name: "David Lee",
}
--------------------------------
Me: [Tool result] {
  success: true,
  customerId: "cus_RKqjkSKo13eGRp",
  message: "Stripe customer created successfully with ID: cus_RKqjkSKo13eGRp",
}
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Great news! The Stripe customer has been created successfully. Here's a summary of the result:

- Success: Yes
- Customer ID: cus_RKqjkSKo13eGRp
- Message: Stripe customer created successfully with ID: cus_RKqjkSKo13eGRp

The new Stripe customer account has been created for David Lee with the email address david+demo@riza.io. The unique customer ID assigned by Stripe is cus_RKqjkSKo13eGRp. This ID can be used for future operations related to this customer, such as creating charges, subscriptions, or updating customer information.

Is there anything else you would like to do with the newly created Stripe customer or any other Stripe-related tasks I can help you with?
```

### "charge the stripe customer with the email noah.brown@example.com $25 USD, and send a slack dm to david@riza.io with a link to the receipt"

Here's a more complex example that incorporates both Stripe and Slack.

We'll ask our agent to create a charge for a Stripe customer, and send a Slack DM with a link to the receipt.

Under the hood, the tools that the agent writes makes multiple API requests to multiple API endpoints. The tool it creates for charging a Stripe customer makes two requests: one to get the customer ID, and one to create the charge. The tool it creates for sending a Slack DM also makes two requests: one to get the user ID, and one to send the DM.

```
[Input requested] Enter your input: charge the stripe customer with the email noah.brown@example.com $25 USD, and send a slack dm to david@riza.io with a link to the receipt
Me: charge the stripe customer with the email noah.brown@example.com $25 USD, and send a slack dm to david@riza.io with a link to the receipt
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: To accomplish this task, we'll need to create two tools: one for charging a Stripe customer and another for sending a Slack DM. Then, we'll use these tools to perform the requested actions. Let's start by creating the necessary tools.

1. First, let's create a tool for charging a Stripe customer:
--------------------------------
Assistant: [Tool use] create_tool({
  "name": "charge_stripe_customer",
  "description": "Charge a Stripe customer using their email address and specified amount in USD.",
  "input_schema": {
    "type": "object",
    "properties": {
      "email": {
        "type": "string",
        "format": "email"
      },
      "amount": {
        "type": "number",
        "minimum": 0
      }
    },
    "required": [
      "email",
      "amount"
    ]
  },
  "code": "async function execute(input: { email: string; amount: number }) {\n  const { email, amount } = input;\n  \n  // First, we need to get the customer ID using the email\n  const customerResponse = await fetch('https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email), {\n    method: 'GET'\n  });\n  \n  if (!customerResponse.ok) {\n    throw new Error('Failed to fetch customer');\n  }\n  \n  const customerData = await customerResponse.json();\n  \n  if (customerData.data.length === 0) {\n    throw new Error('Customer not found');\n  }\n  \n  const customerId = customerData.data[0].id;\n  \n  // Now, let's create a charge for the customer\n  const chargeResponse = await fetch('https://api.stripe.com/v1/charges', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/x-www-form-urlencoded'\n    },\n    body: new URLSearchParams({\n      amount: (amount * 100).toString(), // Stripe expects amount in cents\n      currency: 'usd',\n      customer: customerId\n    })\n  });\n  \n  if (!chargeResponse.ok) {\n    throw new Error('Failed to create charge');\n  }\n  \n  const chargeData = await chargeResponse.json();\n  \n  return {\n    success: true,\n    receiptUrl: chargeData.receipt_url\n  };\n}"
}) (ID: toolu_01PKGun1nEY1W8t1uu2GsAxN)
--------------------------------
[Created Riza tool]:  charge_stripe_customer
--------------------------------
[Meta] Self-written tools: [ "charge_stripe_customer" ]
--------------------------------
Me: [Tool result] "Created tool charge_stripe_customer" (ID: toolu_01PKGun1nEY1W8t1uu2GsAxN)
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Great, we've created the tool for charging a Stripe customer. Now, let's create a tool for sending a Slack DM:
--------------------------------
Assistant: [Tool use] create_tool({
  "name": "send_slack_dm",
  "description": "Send a direct message to a Slack user using their email address.",
  "input_schema": {
    "type": "object",
    "properties": {
      "email": {
        "type": "string",
        "format": "email"
      },
      "message": {
        "type": "string"
      }
    },
    "required": [
      "email",
      "message"
    ]
  },
  "code": "async function execute(input: { email: string; message: string }) {\n  const { email, message } = input;\n  \n  // First, we need to get the user ID using the email\n  const userResponse = await fetch('https://slack.com/api/users.lookupByEmail?email=' + encodeURIComponent(email), {\n    method: 'GET'\n  });\n  \n  if (!userResponse.ok) {\n    throw new Error('Failed to fetch user');\n  }\n  \n  const userData = await userResponse.json();\n  \n  if (!userData.ok) {\n    throw new Error('User not found');\n  }\n  \n  const userId = userData.user.id;\n  \n  // Now, let's send a direct message to the user\n  const dmResponse = await fetch('https://slack.com/api/chat.postMessage', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json'\n    },\n    body: JSON.stringify({\n      channel: userId,\n      text: message\n    })\n  });\n  \n  if (!dmResponse.ok) {\n    throw new Error('Failed to send message');\n  }\n  \n  const dmData = await dmResponse.json();\n  \n  return {\n    success: dmData.ok,\n    timestamp: dmData.ts\n  };\n}"
}) (ID: toolu_01KuJ2Dzj7PSySbedVjQHqyw)
--------------------------------
[Created Riza tool]:  send_slack_dm
--------------------------------
[Meta] Self-written tools: [ "charge_stripe_customer", "send_slack_dm" ]
--------------------------------
Me: [Tool result] "Created tool send_slack_dm" (ID: toolu_01KuJ2Dzj7PSySbedVjQHqyw)
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Excellent, we've created both tools we need. Now, let's use these tools to perform the requested actions.

First, we'll charge the Stripe customer:
--------------------------------
Assistant: [Tool use] charge_stripe_customer({
  "email": "noah.brown@example.com",
  "amount": 25
}) (ID: toolu_017VUKBpSnPwP7jBMGzSgj5f)
--------------------------------
Me: [Tool result] "{\"success\":true,\"receiptUrl\":\"https://pay.stripe.com/receipts/payment/[REDACTED]\"}" (ID: toolu_017VUKBpSnPwP7jBMGzSgj5f)
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Great! The charge was successful, and we received a receipt URL. Now, let's send a Slack DM to david@riza.io with the receipt link:
--------------------------------
Assistant: [Tool use] send_slack_dm({
  "email": "david@riza.io",
  "message": "Hello, a charge of $25 USD has been processed for noah.brown@example.com. You can view the receipt here: https://pay.stripe.com/receipts/payment/[REDACTED]"
}) (ID: toolu_018pmEf9pu3h639XfQbU2Fhb)
--------------------------------
Me: [Tool result] "{\"success\":true,\"timestamp\":\"1733339812.322369\"}" (ID: toolu_018pmEf9pu3h639XfQbU2Fhb)
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Great! Both actions have been completed successfully. To summarize:

1. We charged the Stripe customer with the email noah.brown@example.com for $25 USD.
2. We sent a Slack DM to david@riza.io with a link to the receipt.

Is there anything else you would like me to do?
```

Every tool that the agent creates is saved to Riza using our [Tools API](https://docs.riza.io/api-reference/tool/create-tool). You can view these tools in the [Riza Dashboard](https://dashboard.riza.io/) in the project that your Riza API key belongs to.

## Prompting tips

Since the agent is not specifically prompted for any particular service, it helps to mention Stripe directly in your first prompts (e.g. "list all my Stripe customers" instead of just "list all my customers").
