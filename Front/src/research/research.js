import {
  PRICE_FIELDS,
  RESEARCH_CANDIDATE,
  RESEARCH_TYPES,
  SOURCE_DOMAINS,
  SPECIFICATION_FIELDS,
} from "./byd-e2-x.js";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          status: { type: "string", enum: ["found", "unavailable"] },
          value: { type: ["string", "null"] },
          unit: { type: ["string", "null"] },
          sourceUrl: { type: ["string", "null"] },
          sourceTitle: { type: ["string", "null"] },
          publicationDate: { type: ["string", "null"] },
        },
        required: [
          "key",
          "status",
          "value",
          "unit",
          "sourceUrl",
          "sourceTitle",
          "publicationDate",
        ],
      },
    },
    reviewSummary: { type: ["string", "null"] },
    reviewSourceUrl: { type: ["string", "null"] },
    reviewSourceTitle: { type: ["string", "null"] },
    reviewPublicationDate: { type: ["string", "null"] },
  },
  required: [
    "facts",
    "reviewSummary",
    "reviewSourceUrl",
    "reviewSourceTitle",
    "reviewPublicationDate",
  ],
};

const FIELD_LABELS = {
  local_version_and_model_year: "exact local version and model year",
  passenger_capacity: "passenger capacity",
  cargo_volume: "cargo or luggage volume",
  range: "electric range and its named test cycle",
  battery_capacity: "battery capacity, including gross/usable wording if shown",
  ac_charging_power: "maximum AC charging power",
  dc_charging_power: "maximum DC charging power",
  charging_connector: "AC and DC charging connector types",
  price: "new-car price, currency, and any stated validity/effective date",
};

const OFFICIAL_ONLY_RULES = `
Search only the allowed official Uruguay manufacturer/importer domain. Extract facts only when the source explicitly states them for BYD New E2 X in Uruguay. Do not use global/other-market pages, infer values, transfer facts from another version, or fill gaps from memory. For every fact return its exact source URL and title as present in the search results/citations. Return null for unavailable values and dates. For price, only report a price visibly presented as a current Uruguay offer; include the currency and any stated validity/effective date, and do not assume an undated price is guaranteed current. Publication date is null unless the page explicitly provides one. Keep values short and literal.
`;

const AUTOBLOG_FALLBACK_RULES = `
Search only autoblog.com.uy. Use Autoblog Uruguay strictly as a secondary source for requested facts missing from the official Uruguay source. Extract only facts explicitly stated for BYD New E2 X; do not infer, use other sites, or transfer facts from another trim/market. Cite the exact Autoblog article URL and title. Return the article publication date only if explicitly available; otherwise return null. Any price from Autoblog is historical: return it only with its explicit article publication date, and never call it current. If that date is absent, mark the price unavailable. Keep each fact short and literal.
`;

const REVIEW_RULES = `
Search only autoblog.com.uy for an Autoblog Uruguay driving test or review of BYD New E2 X. A "Contacto" or "Prueba" article qualifies only when returned source content includes explicit driving impressions. Never treat a "Lanzamiento" article as an independent evaluation. Return a short paraphrase (at most 60 words), not quotations. Include the exact contact/test article URL, title, and publication date if explicitly shown. Do not infer impressions from a title, announcement, or specifications. If no suitable article content is returned, use a null summary and null source fields.
`;

function isPlainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeUrl(url, allowedDomain) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const domain = allowedDomain.toLowerCase();
    if (
      parsed.protocol !== "https:" ||
      !(host === domain || host.endsWith(`.${domain}`))
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function citationFrom(value, allowedDomain) {
  const url = normalizeUrl(value?.url, allowedDomain);
  if (!url) return null;
  const title = typeof value?.title === "string" ? value.title.trim() : "";
  const evidenceText = typeof value?.snippet === "string" ? value.snippet.trim() : "";
  return { url, title: title || url, evidenceText: evidenceText || null };
}

export function extractCitations(response, allowedDomain) {
  const citations = new Map();
  const add = (value) => {
    const citation = citationFrom(value, allowedDomain);
    if (!citation) return;
    const existing = citations.get(citation.url);
    if (!existing || (!existing.evidenceText && citation.evidenceText)) {
      citations.set(citation.url, citation);
    }
  };

  for (const item of response?.output ?? []) {
    if (item?.type === "web_search_call") {
      for (const result of item.results ?? []) add(result);
      for (const result of item.action?.sources ?? []) add(result);
    }
    for (const content of item?.content ?? []) {
      for (const annotation of content?.annotations ?? []) {
        if (annotation?.type !== "url_citation") continue;
        add(annotation.url_citation ?? annotation);
      }
    }
  }

  return [...citations.values()];
}

function parseOutput(response) {
  const texts = [
    response?.output_text,
    ...(response?.output ?? [])
      .filter((item) => item?.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((content) => content?.type === "output_text")
      .map((content) => content.text),
  ];

  for (const text of texts) {
    if (typeof text !== "string") continue;
    try {
      const parsed = JSON.parse(text);
      if (isPlainRecord(parsed)) return parsed;
    } catch {
      // Try the next supported text location in the Responses API envelope.
    }
  }

  return null;
}

function responseFormat() {
  return {
    format: {
      type: "json_schema",
      name: "vehicle_source_research",
      strict: true,
      schema: RESPONSE_SCHEMA,
    },
  };
}

function buildPrompt({ researchType, fieldKeys, sourceRules, fallback = false }) {
  if (researchType === "driving_evaluation") {
    return [
      REVIEW_RULES,
      "Return only the JSON structure requested. Include an empty facts array.",
    ].join("\n");
  }

  const listedFields = fieldKeys
    .map((key) => `- ${key}: ${FIELD_LABELS[key]}`)
    .join("\n");

  return [
    fallback ? AUTOBLOG_FALLBACK_RULES : OFFICIAL_ONLY_RULES,
    sourceRules,
    `Research type: ${researchType}. Requested fields:\n${listedFields}`,
    "Return one object in facts for each requested key. Use status found only when you can cite an exact allowed-domain page that explicitly supports the value; otherwise use unavailable and set value, unit, sourceUrl, sourceTitle, and publicationDate to null. Do not add extra keys or facts.",
    "For a current_price fallback, keep an Autoblog price unavailable unless an explicit publication date is available. For driving_evaluation, put only a brief paraphrased summary in reviewSummary and cite its article in reviewSourceUrl/reviewSourceTitle/reviewPublicationDate.",
  ].join("\n");
}

async function search({ client, domain, prompt }) {
  const response = await client.responses.create({
    model: "gpt-5.5",
    tools: [
      {
        type: "web_search",
        filters: { allowed_domains: [domain] },
      },
    ],
    tool_choice: "required",
    include: ["web_search_call.results"],
    text: responseFormat(),
    input: prompt,
  });

  return {
    parsed: parseOutput(response),
    citations: extractCitations(response, domain),
  };
}

function unavailableFact(key, retrievedDate) {
  return {
    key,
    status: "unavailable",
    value: null,
    unit: null,
    sourceType: null,
    sourcePublisher: null,
    sourceUrl: null,
    sourceTitle: null,
    evidenceExcerpt: null,
    publicationDate: null,
    retrievedDate,
  };
}

function sourceTypeFor(citation, sourceGroup, key) {
  if (sourceGroup === "official") {
    return key === "price" ? "official_price" : "official_specification";
  }
  const title = citation.title.toLowerCase();
  if (/\blanzamiento\b/.test(title)) return "autoblog_launch";
  if (/\b(contacto|probamos|prueba|test(?:\s+drive)?|review)\b/.test(title)) {
    return "autoblog_contact_review";
  }
  return "other";
}

function cleanEvidenceText(text) {
  return text
    .replace(/cite[^]*/g, " ")
    .replace(/\[wordlim\s+\d+\]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clippedEvidence(text, matchIndex, maxWords = 25) {
  const clean = cleanEvidenceText(text);
  const words = [...clean.matchAll(/\S+/g)];
  if (words.length <= maxWords) return clean || null;

  const matchWord = Math.max(0, words.findIndex((word) =>
    word.index <= matchIndex && matchIndex < word.index + word[0].length,
  ));
  const before = Math.floor(maxWords * 0.4);
  const start = Math.min(Math.max(0, matchWord - before), words.length - maxWords);
  const chosen = words.slice(start, start + maxWords);
  if (!chosen.length) return null;
  return clean.slice(chosen[0].index, chosen.at(-1).index + chosen.at(-1)[0].length);
}

function valuePattern(value) {
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Vehicle sources commonly use a decimal comma while the model may normalize it to a dot.
  return new RegExp(
    `(?<![\\p{L}\\d])${escaped.replace(/\\\./g, "[.,]")}(?![\\p{L}\\d])`,
    "iu",
  );
}

function factEvidenceExcerpt(citation, fact) {
  if (!citation?.evidenceText || typeof fact?.value !== "string" || !fact.value.trim()) return null;
  const text = cleanEvidenceText(citation.evidenceText);
  const match = valuePattern(fact.value).exec(text);
  if (!match) return null;
  return clippedEvidence(text, match.index);
}

// Require phrases that read as driving impressions. Generic terms such as
// "frenado", "dirección", "manejo", or "comodidad" also occur in equipment
// descriptions and must not be treated as review evidence on their own.
const EVALUATION_EVIDENCE_PATTERN = /(?:confort (?:de marcha|en (?:ruta|ciudad))|estabilidad en (?:ruta|curvas)|estable en (?:la )?ruta|inclin\w+ (?:bastante|mucho)|curvas? exigidas|filtr\w+ (?:bien|las irregularidades|empedrados)|ruido de rodadura|insonoriz\w+[^.]{0,40}(?:bien|correct)|se siente (?:más |muy )?(?:estable|confortable|ágil)|se comporta en (?:ruta|curvas)|comportamiento dinámico)/iu;

function reviewEvidenceExcerpt(citation) {
  if (!citation?.evidenceText || sourceTypeFor(citation, "autoblog") !== "autoblog_contact_review") {
    return null;
  }
  const text = cleanEvidenceText(citation.evidenceText);
  const match = EVALUATION_EVIDENCE_PATTERN.exec(text);
  return match ? clippedEvidence(text, match.index) : null;
}

function mapFact(fact, key, { citations, sourceGroup, publisher, retrievedDate }) {
  if (!fact || fact.status !== "found" || typeof fact.value !== "string") {
    return unavailableFact(key, retrievedDate);
  }

  const citedUrl = normalizeUrl(fact.sourceUrl, sourceGroup === "official"
    ? SOURCE_DOMAINS.official
    : SOURCE_DOMAINS.autoblog);
  const citation = citations.find((item) => item.url === citedUrl);
  if (!citation) return unavailableFact(key, retrievedDate);
  const sourceType = sourceTypeFor(citation, sourceGroup, key);
  const evidenceExcerpt = factEvidenceExcerpt(citation, fact);

  const publicationDate =
    typeof fact.publicationDate === "string" && fact.publicationDate.trim()
      ? fact.publicationDate.trim()
      : null;
  const isHistoricalPrice = key === "price" && sourceGroup === "autoblog";
  if (isHistoricalPrice && !publicationDate) {
    return {
      ...unavailableFact(key, retrievedDate),
      sourceType,
      sourcePublisher: "Autoblog Uruguay",
      sourceUrl: citation.url,
      sourceTitle: citation.title,
      evidenceExcerpt,
      temporalStatus: "historical",
      note: "The article publication date was unavailable, so its historical price is not reported.",
    };
  }

  return {
    key,
    status: "found",
    value: fact.value.trim(),
    unit: typeof fact.unit === "string" && fact.unit.trim() ? fact.unit.trim() : null,
    sourceType,
    sourcePublisher: publisher,
    sourceUrl: citation.url,
    sourceTitle: citation.title,
    evidenceExcerpt,
    publicationDate,
    retrievedDate,
    ...(isHistoricalPrice ? { temporalStatus: "historical" } : {}),
    ...(key === "price" && sourceGroup === "official"
      ? { temporalStatus: "listed_at_retrieval" }
      : {}),
  };
}

function factMap(parsed) {
  const result = new Map();
  for (const fact of parsed?.facts ?? []) {
    if (typeof fact?.key === "string" && !result.has(fact.key)) {
      result.set(fact.key, fact);
    }
  }
  return result;
}

function isAvailableFact(fact) {
  return fact?.status === "found" && typeof fact.value === "string";
}

function mapReviewSummary(parsed, citations, retrievedDate) {
  const text = typeof parsed?.reviewSummary === "string"
    ? parsed.reviewSummary.trim()
    : "";
  const url = normalizeUrl(parsed?.reviewSourceUrl, SOURCE_DOMAINS.autoblog);
  const citation = citations.find((item) => item.url === url);
  const evidenceExcerpt = reviewEvidenceExcerpt(citation);
  if (!citation) {
    return { status: "unavailable", value: null, source: null, reason: "No cited Autoblog article was returned." };
  }
  if (sourceTypeFor(citation, "autoblog") !== "autoblog_contact_review") {
    return { status: "unavailable", value: null, source: null, reason: "The cited source is not a contact or test-drive review." };
  }
  if (!evidenceExcerpt) {
    return { status: "unavailable", value: null, source: null, reason: "The returned article excerpt did not contain evaluative driving evidence." };
  }
  if (!text) {
    return { status: "unavailable", value: null, source: null, reason: "The model did not return a review summary." };
  }
  if (text.split(/\s+/).length > 60) {
    return { status: "unavailable", value: null, source: null, reason: "The returned review summary exceeded the 60-word limit." };
  }

  return {
    status: "found",
    value: text,
    source: {
      sourceType: "autoblog_contact_review",
      sourcePublisher: "Autoblog Uruguay",
      sourceUrl: citation.url,
      sourceTitle: citation.title,
      evidenceExcerpt,
      publicationDate:
        typeof parsed.reviewPublicationDate === "string" && parsed.reviewPublicationDate.trim()
          ? parsed.reviewPublicationDate.trim()
          : null,
      retrievedDate,
    },
  };
}

function deduplicateCitations(citations) {
  const seen = new Set();
  return citations.filter((citation) => {
    if (!citation?.url || seen.has(citation.url)) return false;
    seen.add(citation.url);
    return true;
  }).map(({ url, title }) => ({ url, title }));
}

export async function researchVehicle({
  client,
  candidateId,
  researchType,
  now = () => new Date(),
}) {
  if (!client?.responses?.create) throw new TypeError("A Responses API client is required.");
  if (candidateId !== RESEARCH_CANDIDATE.id) throw new RangeError("Unknown research candidate.");
  if (!RESEARCH_TYPES.includes(researchType)) throw new RangeError("Unknown research type.");

  const retrievedDate = now().toISOString().slice(0, 10);
  const responseBase = {
    candidate: {
      id: RESEARCH_CANDIDATE.id,
      make: RESEARCH_CANDIDATE.make,
      model: RESEARCH_CANDIDATE.model,
      matchingEligible: false,
    },
    researchType,
    retrievedDate,
  };

  if (researchType === "driving_evaluation") {
    const autoblog = await search({
      client,
      domain: SOURCE_DOMAINS.autoblog,
      prompt: buildPrompt({ researchType, sourceRules: REVIEW_RULES }),
    });
    const reviewSummary = mapReviewSummary(autoblog.parsed, autoblog.citations, retrievedDate);
    return {
      ...responseBase,
      status: reviewSummary.status,
      facts: [],
      reviewSummary,
      citations: deduplicateCitations(autoblog.citations),
    };
  }

  const requestedFields = researchType === "current_price" ? PRICE_FIELDS : SPECIFICATION_FIELDS;
  const official = await search({
    client,
    domain: SOURCE_DOMAINS.official,
    prompt: buildPrompt({
      researchType,
      fieldKeys: requestedFields,
      sourceRules: OFFICIAL_ONLY_RULES,
    }),
  });
  const officialFacts = factMap(official.parsed);
  const finalRawFacts = new Map();
  const factSources = new Map();
  for (const key of requestedFields) {
    const fact = officialFacts.get(key);
    const mapped = mapFact(fact, key, {
      citations: official.citations,
      sourceGroup: "official",
      publisher: RESEARCH_CANDIDATE.officialPublisher,
      retrievedDate,
    });
    finalRawFacts.set(key, isAvailableFact(fact) && mapped.status === "found" ? fact : null);
    factSources.set(key, mapped.status === "found" ? "official" : null);
  }

  const missingFields = requestedFields.filter((key) => !finalRawFacts.get(key));
  let autoblog = { parsed: null, citations: [] };
  if (missingFields.length > 0) {
    autoblog = await search({
      client,
      domain: SOURCE_DOMAINS.autoblog,
      prompt: buildPrompt({
        researchType,
        fieldKeys: missingFields,
        sourceRules: AUTOBLOG_FALLBACK_RULES,
        fallback: true,
      }),
    });
    const secondaryFacts = factMap(autoblog.parsed);
    for (const key of missingFields) {
      const fact = secondaryFacts.get(key);
      const mapped = mapFact(fact, key, {
        citations: autoblog.citations,
        sourceGroup: "autoblog",
        publisher: "Autoblog Uruguay",
        retrievedDate,
      });
      if (mapped.status === "found") {
        finalRawFacts.set(key, fact);
        factSources.set(key, "autoblog");
      } else if (fact?.status === "found" && fact.sourceUrl) {
        // Keep a dated-price limitation attached to its cited article.
        finalRawFacts.set(key, { ...fact, _unavailableMappedFact: mapped });
        factSources.set(key, "autoblog");
      }
    }
  }

  const allCitations = deduplicateCitations([...official.citations, ...autoblog.citations]);
  const facts = requestedFields.map((key) => {
    const raw = finalRawFacts.get(key);
    if (raw?._unavailableMappedFact) return raw._unavailableMappedFact;
    const sourceType = factSources.get(key);
    if (!raw || !sourceType) return unavailableFact(key, retrievedDate);
    return mapFact(raw, key, {
      citations: sourceType === "official" ? official.citations : autoblog.citations,
      sourceGroup: sourceType,
      publisher: sourceType === "official" ? RESEARCH_CANDIDATE.officialPublisher : "Autoblog Uruguay",
      retrievedDate,
    });
  });

  return {
    ...responseBase,
    status: facts.some((fact) => fact.status === "found") ? "partial" : "unavailable",
    facts,
    reviewSummary: { status: "unavailable", value: null, source: null },
    citations: allCitations,
  };
}

export const __researchInternals = Object.freeze({
  RESPONSE_SCHEMA,
  buildPrompt,
  extractCitations,
  mapFact,
  normalizeUrl,
});
