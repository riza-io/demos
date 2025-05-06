This is a demo of using LLM-generated code to transform data, using [Riza](https://riza.io) to execute the code.

To run this, you will need to set up a `.env.local` file with the following:

```
RIZA_API_KEY=your_riza_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

You can get these keys from the [Riza Dashboard](https://dashboard.riza.io) and [Anthropic Console](https://console.anthropic.com).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000/transform](http://localhost:3000/transform) for a frontend UI for the demo.
