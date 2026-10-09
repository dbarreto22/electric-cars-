# Frontend

## Vehicle research spike

This is a server-only, manual technical spike for **BYD New E2 X**, a research candidate named in `../docs/data/starter-catalog.md`. It is not catalog approval, matching, or a recommendation. Its API route is disabled when `NODE_ENV=production` and it is not connected to the UI.

### Required environment

Set `OPENAI_API_KEY` in the server process environment. Do not prefix it with `NEXT_PUBLIC_`, put it in browser code, or commit the value. The spike uses the OpenAI Responses API with its `web_search` tool, one allowlisted domain per search, structured output, and returned source/citation metadata.

### Run manually

From this `Front` directory:

```sh
export OPENAI_API_KEY="your-key"
npm run dev
```

In another terminal, request one research mode:

```sh
curl -sS http://localhost:3000/api/research \
  -H 'Content-Type: application/json' \
  -d '{"candidateId":"byd-new-e2-x","researchType":"specifications"}'
```

`researchType` may be `specifications`, `current_price`, or `driving_evaluation`. Specifications and current prices search BYD Uruguay first and fall back to Autoblog Uruguay for unavailable facts only. Driving evaluations search Autoblog Uruguay only. Autoblog prices are labeled historical and are withheld if the article publication date is unavailable. Every request is limited to a fixed candidate; returned records remain marked `matchingEligible: false`.

Tests use a mocked `responses.create` client and need neither an API key nor network access:

```sh
npm test
```
