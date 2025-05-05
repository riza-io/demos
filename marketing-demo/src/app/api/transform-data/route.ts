import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import Riza from "@riza-io/api";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const riza = new Riza({
  apiKey: process.env.RIZA_API_KEY,
});

async function executeCode(code: string, input: unknown) {
  const result = await riza.command.execFunc({
    code,
    input,
    language: "typescript",
  });
  return result;
}

const TransformDataSchema = z.object({
  data: z.array(z.record(z.any())).min(1),
  schema: z.array(z.string()),
});

type TransformDataSchema = z.infer<typeof TransformDataSchema>;

function getCORSHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://riza.io, https://bernal.rodeo",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, schema } = TransformDataSchema.parse(body);

    // Sample 2 random items from the data array
    const sampleSize = Math.min(2, data.length);
    const samples = Array.from({ length: sampleSize }, () => {
      const randomIndex = Math.floor(Math.random() * data.length);
      return data[randomIndex];
    });

    // Construct the prompt for Claude
    const prompt = `Given these example data items:
${samples
  .map((sample) => `<example>${JSON.stringify(sample, null, 2)}</example>`)
  .join("\n")}

Generate a TypeScript function that transforms an array of similar objects to an object with the following properties: ${schema.join(
      ", "
    )}

There may not be a 1:1 mapping between the example data and the schema, so you may need to combine or rename some properties.

The function should:
1. Take an array of objects as input
2. Transform each object to only include the specified columns
3. Return the transformed array

Requirements:
- Function name must be 'execute'
- Function must have a single parameter 'input', which is the array of objects to transform
- Must handle all rows, not just the examples
- Must be pure TypeScript (no external dependencies)
- Must handle missing or null values gracefully

Return ONLY the code, no explanation needed.`;

    // Call Claude API with the prompt
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
      system:
        "You are a TypeScript expert. Provide only the requested code with no additional explanation or markdown.",
    });

    // Extract the code from Claude's response
    const generatedCode =
      response.content[0].type === "text"
        ? response.content[0].text
        : "invalid response";

    // Execute the generated code with the full data array
    const rizaResponse = await executeCode(generatedCode, data);

    return NextResponse.json(
      {
        code: generatedCode,
        result: rizaResponse.output,
      },
      {
        headers: getCORSHeaders(),
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      {
        status: 400,
        headers: getCORSHeaders(),
      }
    );
  }
}
