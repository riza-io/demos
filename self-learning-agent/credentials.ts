import Riza from "@riza-io/api";
import { google } from "googleapis";

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
    // {
    //   host: "*.googleapis.com",
    //   auth: { query: { key: "key", value: process.env.GOOGLE_API_KEY } },
    // },
    {
      host: "api.openai.com",
      auth: { bearer: { token: process.env.OPENAI_API_KEY } },
    },
    {
      host: "*.google.com",
    },
  ],
};

const GOOGLE_SERVICE_ACCOUNT_KEY_PATH = "./keys/google-service-account.json";

export const getGoogleServiceAccountAccessToken = async () => {
  // Initialize GoogleAuth with the service account key and desired scope
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  // Get an authenticated client
  const client = await auth.getClient();

  // Get the access token
  const token = await client.getAccessToken();

  return token.token;
};
