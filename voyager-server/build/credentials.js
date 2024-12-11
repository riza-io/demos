export const HTTP_AUTH_CONFIG = {
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
            host: "api.openai.com",
            auth: { bearer: { token: process.env.OPENAI_API_KEY } },
        },
        {
            host: "api.airtable.com",
            auth: { bearer: { token: process.env.AIRTABLE_API_KEY } },
        },
    ],
};
