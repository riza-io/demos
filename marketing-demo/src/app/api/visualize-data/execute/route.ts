import { NextResponse } from "next/server";
import { z } from "zod";
import Riza from "@riza-io/api";
import { getCORSHeaders } from "@/cors";

const riza = new Riza({
  apiKey: process.env.RIZA_API_KEY,
});

// The runtime revision ID for a Riza custom runtime that contains pandas, matplotlib, and seaborn. Must be in the same project as the Riza API key provided.
const RIZA_PYTHON_RUNTIME_REVISION_ID =
  process.env.RIZA_PYTHON_RUNTIME_REVISION_ID;

async function executeCode(code: string, input: string) {
  const result = await riza.command.execFunc({
    code,
    input: { data: input },
    language: "python",
    runtime_revision_id: RIZA_PYTHON_RUNTIME_REVISION_ID,
  });
  return result;
}

const ExecuteCodeSchema = z.object({
  data: z.string(),
  code: z.string(),
});

type ExecuteCodeSchema = z.infer<typeof ExecuteCodeSchema>;

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(request),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, code } = ExecuteCodeSchema.parse(body);

    // Execute the generated code with the full data array
    const rizaResponse = await executeCode(code, data);

    return NextResponse.json(rizaResponse, {
      headers: getCORSHeaders(request),
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      {
        status: 400,
        headers: getCORSHeaders(request),
      }
    );
  }
}
