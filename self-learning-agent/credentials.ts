import Riza from "@riza-io/api";

/**
 * The Riza API allows you to securely authenticate API requests, so your agent does not have access to your secrets.
 * Create a `.env` file in this directory to set credentials for the services you want your agent to access.
 * See the docs for more info: https://docs.riza.io/reference/http
 */
export const HTTP_AUTH_CONFIG: Riza.ToolExecParams.HTTP = {
  allow: [
    {
      host: "api.stripe.com",
      auth: { bearer: { token: process.env.STRIPE_TESTMODE_API_KEY } },
    },
    {
      host: "slack.com",
      auth: { bearer: { token: process.env.SLACK_API_KEY } },
    },
    {
      host: "*.googleapis.com",
      auth: { query: { key: "key", value: process.env.GOOGLE_API_KEY } },
    },
    {
      host: "api.openai.com",
      auth: { bearer: { token: process.env.OPENAI_API_KEY } },
    },
  ],
};
