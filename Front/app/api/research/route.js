import { createResponsesClient } from "../../../src/research/responses-client.js";
import { researchVehicle } from "../../../src/research/research.js";
import { RESEARCH_CANDIDATE, RESEARCH_TYPES } from "../../../src/research/byd-e2-x.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  // This manual spike must not become a public production research endpoint.
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Research spike is disabled in production." }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    body?.candidateId !== RESEARCH_CANDIDATE.id ||
    !RESEARCH_TYPES.includes(body?.researchType)
  ) {
    return Response.json(
      {
        error: "Use candidateId byd-new-e2-x and researchType specifications, current_price, or driving_evaluation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await researchVehicle({
      client: createResponsesClient(apiKey),
      candidateId: body.candidateId,
      researchType: body.researchType,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Never log the key, request headers, raw OpenAI response, or upstream error body.
    return Response.json({ error: "Vehicle research could not be completed." }, { status: 502 });
  }
}
