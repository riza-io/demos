import { NextResponse } from "next/server";
import { z } from "zod";
import Riza from "@riza-io/api";
import { getCORSHeaders } from "@/cors";

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

const ExecuteCodeSchema = z.object({
  data: z.array(z.record(z.any())).min(1),
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
