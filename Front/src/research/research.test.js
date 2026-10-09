import assert from "node:assert/strict";
import test from "node:test";

import { RESEARCH_CANDIDATE } from "./byd-e2-x.js";
import { researchVehicle } from "./research.js";

const CHECKED_AT = () => new Date("2026-10-08T12:00:00.000Z");
const OFFICIAL_URL = "https://byd.com.uy/autos/byd-new-e2-x/";
const AUTOBLOG_URL = "https://autoblog.com.uy/prueba-byd-e2-x/";

function fact(key, status, overrides = {}) {
  return {
    key,
    status,
    value: status === "found" ? "42" : null,
    unit: status === "found" ? "kWh" : null,
    sourceUrl: status === "found" ? OFFICIAL_URL : null,
    sourceTitle: status === "found" ? "BYD New E2 X" : null,
    publicationDate: null,
    ...overrides,
  };
}

function apiResponse(payload, sources = []) {
  return {
    output_text: JSON.stringify(payload),
    output: [
      {
        type: "web_search_call",
        results: sources.map(({ url, title, snippet }) => ({ url, title, snippet })),
      },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            annotations: sources.map(({ url, title }) => ({
              type: "url_citation",
              url_citation: { url, title },
            })),
          },
        ],
      },
    ],
  };
}

function rawApiResponse(payload, sources = []) {
  return {
    output: [
      {
        type: "web_search_call",
        results: sources.map(({ url, title, snippet }) => ({ url, title, snippet })),
      },
      {
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(payload) }],
      },
    ],
  };
}

function structuredPayload(facts = [], overrides = {}) {
  return {
    facts,
    reviewSummary: null,
    reviewSourceUrl: null,
    reviewSourceTitle: null,
    reviewPublicationDate: null,
    ...overrides,
  };
}

function mockClient(responses) {
  const requests = [];
  return {
    requests,
    client: {
      responses: {
        async create(request) {
          requests.push(request);
          const next = responses.shift();
          if (!next) throw new Error("Unexpected mock request.");
          return next;
        },
      },
    },
  };
}

test("official Uruguay source is preferred and Autoblog is not called when it has the price", async () => {
  const source = {
    url: OFFICIAL_URL,
    title: "BYD New E2 X | BYD Uruguay",
    snippet: "Precio publicado para BYD New E2 X: USD 25,990.",
  };
  const mock = mockClient([
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "USD 25,990",
          unit: "USD",
          publicationDate: null,
        }),
      ]),
      [source],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(mock.requests.length, 1);
  assert.deepEqual(mock.requests[0].tools[0].filters.allowed_domains, ["byd.com.uy"]);
  assert.equal(result.facts[0].sourceType, "official_price");
  assert.match(result.facts[0].evidenceExcerpt, /USD 25,990/);
  assert.equal(result.facts[0].status, "found");
});

test("missing official specification facts fall back to Autoblog Uruguay", async () => {
  const officialSource = {
    url: OFFICIAL_URL,
    title: "BYD New E2 X | BYD Uruguay",
    snippet: "Capacidad de batería: 42 kWh.",
  };
  const autoblogSource = {
    url: AUTOBLOG_URL,
    title: "Prueba: BYD New E2 X",
    snippet: "Autonomía declarada: 350 km WLTP. Autoblog probó el modelo; la suspensión y estabilidad en ruta fueron destacadas.",
  };
  const fields = [
    "local_version_and_model_year",
    "passenger_capacity",
    "cargo_volume",
    "range",
    "battery_capacity",
    "ac_charging_power",
    "dc_charging_power",
    "charging_connector",
  ];
  const officialFacts = fields.map((key) =>
    key === "battery_capacity"
      ? fact(key, "found")
      : fact(key, "unavailable"),
  );
  const autoblogFacts = fields
    .filter((key) => key === "range")
    .map((key) => fact(key, "found", {
      value: "350",
      unit: "km WLTP",
      sourceUrl: AUTOBLOG_URL,
      sourceTitle: autoblogSource.title,
      publicationDate: "2025-03-12",
    }));
  const mock = mockClient([
    apiResponse(structuredPayload(officialFacts), [officialSource]),
    apiResponse(structuredPayload(autoblogFacts), [autoblogSource]),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "specifications",
    now: CHECKED_AT,
  });

  assert.equal(mock.requests.length, 2);
  assert.deepEqual(mock.requests[0].tools[0].filters.allowed_domains, ["byd.com.uy"]);
  assert.deepEqual(mock.requests[1].tools[0].filters.allowed_domains, ["autoblog.com.uy"]);
  assert.match(mock.requests[1].input, /range/);
  const rangeFact = result.facts.find(({ key }) => key === "range");
  const batteryFact = result.facts.find(({ key }) => key === "battery_capacity");
  assert.equal(rangeFact.sourceType, "autoblog_contact_review");
  assert.equal(rangeFact.sourcePublisher, "Autoblog Uruguay");
  assert.equal(rangeFact.sourceUrl, AUTOBLOG_URL);
  assert.match(rangeFact.evidenceExcerpt, /350/);
  assert.equal(batteryFact.sourceType, "official_specification");
  assert.equal(batteryFact.sourcePublisher, "BYD Uruguay");
  assert.equal(batteryFact.sourceUrl, OFFICIAL_URL);
  assert.match(batteryFact.evidenceExcerpt, /42 kWh/);
});

test("Autoblog prices are historical and require the article publication date", async () => {
  const autoblogSource = {
    url: AUTOBLOG_URL,
    title: "Lanzamiento: BYD New E2 X en Uruguay",
    snippet: "Precio del BYD New E2 X: USD 24,990.",
  };
  const mock = mockClient([
    apiResponse(structuredPayload([fact("price", "unavailable")]), []),
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "USD 24,990",
          unit: "USD",
          sourceUrl: AUTOBLOG_URL,
          sourceTitle: autoblogSource.title,
          publicationDate: "2024-11-03",
        }),
      ]),
      [autoblogSource],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(result.facts[0].value, "USD 24,990");
  assert.equal(result.facts[0].sourceType, "autoblog_launch");
  assert.equal(result.facts[0].temporalStatus, "historical");
  assert.equal(result.facts[0].publicationDate, "2024-11-03");
  assert.equal(result.facts[0].retrievedDate, "2026-10-08");
});

test("a historical Autoblog price without a publication date is unavailable", async () => {
  const autoblogSource = {
    url: AUTOBLOG_URL,
    title: "Lanzamiento: BYD New E2 X en Uruguay",
    snippet: "Precio del BYD New E2 X: USD 24,990.",
  };
  const mock = mockClient([
    apiResponse(structuredPayload([fact("price", "unavailable")]), []),
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "USD 24,990",
          unit: "USD",
          sourceUrl: AUTOBLOG_URL,
          sourceTitle: autoblogSource.title,
          publicationDate: null,
        }),
      ]),
      [autoblogSource],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(result.facts[0].status, "unavailable");
  assert.equal(result.facts[0].value, null);
  assert.equal(result.facts[0].sourceType, "autoblog_launch");
  assert.equal(result.facts[0].temporalStatus, "historical");
});

test("missing facts return unavailable instead of generated values", async () => {
  const mock = mockClient([
    apiResponse(
      structuredPayload([
        fact("price", "unavailable"),
      ]),
      [],
    ),
    apiResponse(structuredPayload([fact("price", "unavailable")]), []),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.facts[0].status, "unavailable");
  assert.equal(result.facts[0].value, null);
  assert.deepEqual(result.citations, []);
});

test("source URLs and titles from Responses annotations are preserved", async () => {
  const citation = { url: OFFICIAL_URL, title: "BYD New E2 X · BYD Uruguay" };
  const mock = mockClient([
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "25,990",
          unit: "USD",
          sourceTitle: citation.title,
        }),
      ]),
      [citation],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.deepEqual(result.citations, [citation]);
  assert.equal(result.facts[0].sourceUrl, citation.url);
  assert.equal(result.facts[0].sourceTitle, citation.title);
  assert.equal(result.candidate.matchingEligible, false);
});

test("a fact keeps value and provenance but omits evidence when no supporting excerpt was returned", async () => {
  const source = {
    url: OFFICIAL_URL,
    title: "BYD New E2 X | BYD Uruguay",
    snippet: "The official page has no price text in the returned excerpt.",
  };
  const otherSource = {
    url: "https://byd.com.uy/autos/byd-new-e2-x/ficha-tecnica/",
    title: "BYD New E2 X technical sheet",
    snippet: "Precio publicado: USD 25,990.",
  };
  const mock = mockClient([
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "USD 25,990",
          unit: "USD",
          sourceUrl: source.url,
          sourceTitle: source.title,
        }),
      ]),
      [source, otherSource],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(result.facts[0].status, "found");
  assert.equal(result.facts[0].value, "USD 25,990");
  assert.equal(result.facts[0].sourceUrl, source.url);
  assert.equal(result.facts[0].evidenceExcerpt, null);
});

test("raw Responses API message content is parsed when output_text convenience field is absent", async () => {
  const officialSource = {
    url: OFFICIAL_URL,
    title: "BYD New E2 X technical sheet",
    snippet: "Capacidad de batería: 45,12 kWh.",
  };
  const autoblogSource = {
    url: AUTOBLOG_URL,
    title: "Contacto: BYD New E2 X",
    snippet: "Durante la prueba, el auto destacó por confort en ruta y estabilidad en curvas.",
  };
  const technicalMock = mockClient([
    rawApiResponse(
      structuredPayload([
        ...[
          "local_version_and_model_year",
          "passenger_capacity",
          "cargo_volume",
          "range",
          "ac_charging_power",
          "dc_charging_power",
          "charging_connector",
        ].map((key) => fact(key, "unavailable")),
        fact("battery_capacity", "found", {
          value: "45.12",
          unit: "kWh",
          sourceUrl: officialSource.url,
          sourceTitle: officialSource.title,
          publicationDate: "2026-05",
        }),
      ]),
      [officialSource],
    ),
    rawApiResponse(structuredPayload([]), []),
  ]);

  const technicalResult = await researchVehicle({
    client: technicalMock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "specifications",
    now: CHECKED_AT,
  });

  assert.equal(technicalResult.facts.find(({ key }) => key === "battery_capacity").value, "45.12");
  assert.equal(technicalResult.facts.find(({ key }) => key === "battery_capacity").sourceUrl, officialSource.url);
  assert.equal(technicalResult.facts.find(({ key }) => key === "battery_capacity").sourceTitle, officialSource.title);
  assert.equal(technicalResult.facts.find(({ key }) => key === "battery_capacity").evidenceExcerpt, "Capacidad de batería: 45,12 kWh.");
  assert.equal(technicalResult.candidate.matchingEligible, false);

  const reviewMock = mockClient([
    rawApiResponse(
      structuredPayload([], {
        reviewSummary: "El artículo describe un andar confortable en ciudad y buena estabilidad en ruta.",
        reviewSourceUrl: autoblogSource.url,
        reviewSourceTitle: autoblogSource.title,
        reviewPublicationDate: "2026-06-18",
      }),
      [autoblogSource],
    ),
  ]);

  const reviewResult = await researchVehicle({
    client: reviewMock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "driving_evaluation",
    now: CHECKED_AT,
  });

  assert.equal(reviewResult.reviewSummary.status, "found");
  assert.equal(reviewResult.reviewSummary.source.sourceUrl, autoblogSource.url);
  assert.equal(reviewResult.reviewSummary.source.sourceTitle, autoblogSource.title);
  assert.match(reviewResult.reviewSummary.source.evidenceExcerpt, /confort en ruta y estabilidad/);
  assert.equal(reviewResult.reviewSummary.source.sourceType, "autoblog_contact_review");
});

test("a fact cited to a URL outside the allowlisted source is unavailable", async () => {
  const officialCitation = { url: OFFICIAL_URL, title: "BYD Uruguay" };
  const unrelatedUrl = "https://example.com/vehicle-price";
  const mock = mockClient([
    apiResponse(
      structuredPayload([
        fact("price", "found", {
          value: "USD 1",
          unit: "USD",
          sourceUrl: unrelatedUrl,
          sourceTitle: "Unrelated source",
        }),
      ]),
      [officialCitation],
    ),
    apiResponse(structuredPayload([fact("price", "unavailable")]), []),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "current_price",
    now: CHECKED_AT,
  });

  assert.equal(result.facts[0].status, "unavailable");
  assert.equal(result.facts[0].sourceUrl, null);
  assert.deepEqual(result.citations, [officialCitation]);
});

test("driving evaluations search Autoblog only and return a cited short summary", async () => {
  const autoblogSource = {
    url: AUTOBLOG_URL,
    title: "Prueba: BYD New E2 X",
    snippet: "Autoblog destacó su estabilidad en ruta y confort de marcha.",
  };
  const mock = mockClient([
    apiResponse(
      structuredPayload([], {
        reviewSummary: "La reseña destaca su facilidad de uso urbano y comenta el comportamiento en ruta.",
        reviewSourceUrl: AUTOBLOG_URL,
        reviewSourceTitle: autoblogSource.title,
        reviewPublicationDate: "2025-03-12",
      }),
      [autoblogSource],
    ),
  ]);

  const result = await researchVehicle({
    client: mock.client,
    candidateId: RESEARCH_CANDIDATE.id,
    researchType: "driving_evaluation",
    now: CHECKED_AT,
  });

  assert.deepEqual(mock.requests[0].tools[0].filters.allowed_domains, ["autoblog.com.uy"]);
  assert.equal(result.reviewSummary.status, "found");
  assert.equal(result.reviewSummary.source.sourceType, "autoblog_contact_review");
  assert.equal(result.reviewSummary.source.publicationDate, "2025-03-12");
  assert.match(result.reviewSummary.source.evidenceExcerpt, /estabilidad en ruta/);
});

test("launches and contact pages without returned evaluative evidence cannot become review summaries", async () => {
  const cases = [
    {
      title: "Lanzamiento: BYD New E2 X",
      snippet: "BYD Uruguay presenta el nuevo modelo con mejoras de comodidad y equipamiento.",
    },
    {
      title: "Contacto: BYD New E2 X",
      snippet: "El artículo describe el equipamiento y las dimensiones del vehículo.",
    },
    {
      title: "Contacto: BYD New E2 X",
      snippet: "Incluye frenado automático, alerta de tráfico cruzado y control inteligente de velocidad.",
    },
  ];

  for (const source of cases) {
    const mock = mockClient([
      apiResponse(
        structuredPayload([], {
          reviewSummary: "La reseña afirma que el auto ofrece una marcha confortable y estable.",
          reviewSourceUrl: AUTOBLOG_URL,
          reviewSourceTitle: source.title,
          reviewPublicationDate: "2026-06-18",
        }),
        [{ url: AUTOBLOG_URL, ...source }],
      ),
    ]);

    const result = await researchVehicle({
      client: mock.client,
      candidateId: RESEARCH_CANDIDATE.id,
      researchType: "driving_evaluation",
      now: CHECKED_AT,
    });

    assert.equal(result.reviewSummary.status, "unavailable");
    assert.equal(result.reviewSummary.value, null);
    assert.equal(result.reviewSummary.source, null);
    assert.ok(result.reviewSummary.reason);
  }
});
