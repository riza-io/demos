# Self-Learning AI Agent

This is a self-learning AI agent that can write its own tools on the fly and execute them (safely, on [Riza](https://riza.io)).

This demo currently supports Stripe out of the box, although purely to keep authentication setup simple and safe (please use a [Stripe test key](https://docs.stripe.com/test-mode)!). It is not prompted specifically for Stripe or any service in particular; as long as you set up the right credentials, it can theoretically support any service it knows about.

## Initial setup

> [!WARNING]
> This agent _actually executes LLM-generated code_ on Riza. While it can't cause damage to your computer, you should only give it access to API keys for test/development environments. Please use a [Stripe test key](https://docs.stripe.com/test-mode) to run this demo.

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

### "list all stripe charges for the customer with the email hello@riza.io"

Since the Stripe API is well-known to the LLM, you can ask it to do more complex things, even things that require multiple API calls. For example, you could ask it to `list all stripe charges for the customer with the email david@riza.io`, which actaully requires two Stripe API calls: one to query a customer ID by email, and another to list charges for that customer.

```
[Input requested] Enter your input: list all stripe charges for the customer with the email david@riza.io
Me: list all stripe charges for the customer with the email david@riza.io
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: To accomplish this task, we'll need to create a tool that interacts with the Stripe API to list charges for a specific customer. First, let's create the tool, and then we'll use it to fetch the charges for the customer with the email david@riza.io.

Let's create a tool called "list_stripe_charges_by_email":
--------------------------------
Assistant: [Tool use] create_tool {
  name: "list_stripe_charges_by_email",
  description: "List all Stripe charges for a customer with a given email address",
  input_schema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "The email address of the customer",
      },
    },
    required: [ "email" ],
  },
  code: "async function execute(input: { email: string }): Promise<any> {\n  const { email } = input;\n  \n  // First, we need to find the customer ID using the email\n  const customerResponse = await fetch('https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email), {\n    method: 'GET'\n  });\n  \n  if (!customerResponse.ok) {\n    throw new Error(`Failed to fetch customer: ${customerResponse.statusText}`);\n  }\n  \n  const customerData = await customerResponse.json();\n  \n  if (customerData.data.length === 0) {\n    throw new Error(`No customer found with email: ${email}`);\n  }\n  \n  const customerId = customerData.data[0].id;\n  \n  // Now, fetch the charges for this customer\n  const chargesResponse = await fetch(`https://api.stripe.com/v1/charges?customer=${customerId}`, {\n    method: 'GET'\n  });\n  \n  if (!chargesResponse.ok) {\n    throw new Error(`Failed to fetch charges: ${chargesResponse.statusText}`);\n  }\n  \n  const chargesData = await chargesResponse.json();\n  \n  return chargesData.data;\n}",
}
--------------------------------
[Created Riza tool]:  list_stripe_charges_by_email
--------------------------------
[Meta] Self-written tools: [ "list_stripe_charges_by_email" ]
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: Great! Now that we have created the tool to list Stripe charges for a customer by email, let's use it to fetch the charges for the customer with the email david@riza.io.
--------------------------------
Assistant: [Tool use] list_stripe_charges_by_email {
  email: "david@riza.io",
}
--------------------------------
Me: [Tool result] <omitted for brevity>
--------------------------------
[Querying LLM...]
--------------------------------
Assistant: I have successfully retrieved the Stripe charges for the customer with the email david@riza.io. Here's a summary of the charges:

1. Charge ID: ch_3QMzpKFSuVk36MVy1o8KPQFr
   - Amount: $25.00
   - Description: "my second payment"
   - Status: succeeded (but refunded)
   - Created: March 19, 2024 (timestamp: 1732054998)
   - Payment method: Visa card ending in 4242

2. Charge ID: ch_3QMzp3FSuVk36MVy01tAj8cP
   - Amount: $15.00
   - Description: "my first payment"
   - Status: succeeded (but refunded)
   - Created: March 19, 2024 (timestamp: 1732054982)
   - Payment method: Visa card ending in 4242

Both charges were made to the same customer (cus_RFSb5bMYLIijjp) and were subsequently refunded. The charges were processed in test mode (livemode: false), which is typical for development and testing environments.

Is there any specific information about these charges you'd like me to focus on or any additional questions you have?
```

Every tool that the agent creates is saved to Riza using our [Tools API](https://docs.riza.io/api-reference/tool/create-tool). You can view these tools in the [Riza Dashboard](https://dashboard.riza.io/) in the project that your Riza API key belongs to.

## Prompting tips

Since the agent is not specifically prompted for any particular service, it helps to mention Stripe directly in your first prompts (e.g. "list all my Stripe customers" instead of just "list all my customers").
