import "server-only";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

// Small REST adapter keeps the key in a server-only closure and is injectable in tests.
export function createResponsesClient(apiKey, fetchImpl = fetch) {
  return {
    responses: {
      async create(payload) {
        const response = await fetchImpl(RESPONSES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        if (!response.ok) {
          // Do not include upstream response bodies or request headers in errors/logs.
          throw new Error(`OpenAI Responses API request failed (${response.status}).`);
        }

        return response.json();
      },
    },
  };
}
