import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TransformDataSchema = z.object({
  data: z.array(z.record(z.any())).min(1),
  schema: z.array(z.string()),
});

type TransformDataSchema = z.infer<typeof TransformDataSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, schema } = TransformDataSchema.parse(body);

    // For now, we'll just return an empty array as specified
    return NextResponse.json({ result: [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 400 }
    );
  }
}
