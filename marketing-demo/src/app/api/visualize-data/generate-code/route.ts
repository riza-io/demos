import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCORSHeaders } from "@/cors";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VisualizeDataSchema = z.object({
  data: z.string(),
});

type VisualizeDataSchema = z.infer<typeof VisualizeDataSchema>;

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(request),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = VisualizeDataSchema.parse(body);

    // Sample 50 random lines from the data
    const lines = data.split("\n");
    const sampleSize = Math.min(50, lines.length);
    const samples = Array.from({ length: sampleSize }, () => {
      const randomIndex = Math.floor(Math.random() * lines.length);
      return lines[randomIndex];
    });

    const header = lines[0];

    // Construct the prompt for Claude
    const prompt1 = `You are doing data analysis on a set of data. There are ${
      lines.length
    } data points in this data set. The header of the data is:
    ${header}

Here are the ${sampleSize} random entries from the data:
<examples>
${samples.join("\n")}
</examples>

Come up with a written analysis of the data, based on the samples. Say what you think the data is about, and come up with a plan on how to visualize it using some sort of graph or chart.`;

    const analysisStream = anthropic.messages.stream({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: "user", content: prompt1 }],
    });

    const prompt2 = `Now, write Python code to create a visualization of the data.

The function should generate a chart and return the chart as a base64-encoded PNG image.

The function signature is:

\`\`\`
def execute(input):
\`\`\`

\`input\` is a Python object. The full dataset is available as text at \`input["data"]\`. The data is in CSV format.

Here are the rules for writing code:
- The function should return an object that has 1 field: "image". The "image" data should be the chart as a base64-encoded PNG image.
- Use only the Python standard library and the following libraries: \`pandas\`, \`matplotlib\`, and \`seaborn\`.
- For columns that appear to be numbers, make sure to cast them first.
- Where appropriate, the output may contain multiple charts.

Provide only the requested code with no additional explanation or markdown.`;

    // We want to inject our prompt and the first response (the analysis) into the stream so the client can see it
    const combinedStream = new ReadableStream({
      async start(controller) {
        // First, send the prompts as JSON
        controller.enqueue(
          JSON.stringify({
            type: "prompt",
            prompt: prompt1,
          }) + "\n"
        );

        controller.enqueue(
          JSON.stringify({
            type: "prompt",
            prompt: prompt2,
          }) + "\n"
        );

        // Process the analysis stream first and collect the full analysis
        const analysisReader = analysisStream.toReadableStream().getReader();
        let accumulatedAnalysis = "";
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await analysisReader.read();
          if (done) break;

          // pass through the stream
          controller.enqueue(value);

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsedLine = JSON.parse(line);
                if (parsedLine?.type === "content_block_delta") {
                  accumulatedAnalysis += parsedLine.delta?.text || "";
                }
              } catch (e) {
                console.warn("Failed to parse line:", line);
              }
            }
          }
        }

        // Now create the second stream with the analysis included in the messages
        const generateCodeStream = anthropic.messages.stream({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 1000,
          temperature: 0,
          messages: [
            { role: "user", content: prompt1 },
            { role: "assistant", content: accumulatedAnalysis },
            { role: "user", content: prompt2 },
          ],
        });

        // Then process the code generation stream
        const codeReader = generateCodeStream.toReadableStream().getReader();
        let codeComplete = false;

        while (!codeComplete) {
          const { done, value } = await codeReader.read();
          if (done) {
            codeComplete = true;
          } else {
            controller.enqueue(value);
          }
        }

        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: {
        ...getCORSHeaders(request),
        "Content-Type": "text/plain; charset=utf-8",
      },
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
