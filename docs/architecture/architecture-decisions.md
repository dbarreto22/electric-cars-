# Technical design and architecture decisions

The repository contains empty `Front` and `Back` directories and no visible application code or stack instructions. This is a proposed MVP direction, not an assertion about an existing implementation. It preserves the journey and constraints in the [MVP brief](../product/mvp-brief.md).

## Application shape

| Option | Benefits | Costs and risks | MVP fit |
|---|---|---|---|
| One Next.js full-stack application in `Front` | One deployable unit, shared types, one local development workflow, and server routes/actions available for results and feedback handling. Few operational moving parts. | Requires the team to choose/learn one full-stack framework; server and UI concerns share a codebase; an eventual independent API or non-web client would need extraction. | **Recommended.** The empty `Back` directory does not imply a service contract. Leave it unused until a separate service has a demonstrated need. |
| Next.js in `Front` plus FastAPI in `Back` | Clear API boundary, Python ecosystem for future data jobs or integrations, and independent service deployment/scaling. | Two runtimes, API schema/versioning, cross-service local setup, CORS/auth/configuration, duplicated validation/types, and separate deployment/monitoring are overhead without a current consumer or data pipeline. | Do not start here. Revisit if independently consumed APIs, Python processing, or service ownership becomes necessary. |

**Decision:** begin with a single Next.js full-stack application in `Front`, subject to confirming the team’s framework and deployment constraints in the first implementation slice. Keep vehicle data and deterministic matching as framework-independent modules. This is a reasoned recommendation, not a final hosting/provider selection.

- **Rationale:** empty folders, a single visitor journey, small manual catalog, no integrations or separate API client, and staging-first development favor fewer moving parts.
- **Alternatives considered:** split Next.js/FastAPI as above; a static client plus separate API would still create an unnecessary service boundary.
- **Confidence:** medium; project structure supports a compact start, but developer skills, hosting constraints, and future operational ownership are unknown.
- **Unresolved:** preferred language/framework, target runtime/host, catalog edit workflow, persistence for feedback, and when to revisit service separation.

## First journey components

1. Responsive questionnaire for budget, driving patterns, passenger/space needs, and charging access. Keep answers ephemeral unless a specific save/return need emerges.
2. Small catalog file with versioned vehicles, fact-level source evidence, checked dates, verification/freshness state, and separate dated price/availability observations.
3. Pure deterministic matching module that accepts normalized answers and verified attributes and returns candidate IDs plus reason codes.
4. Results view for at most three candidates, showing fit reasons, limitations/unknowns, evidence links, applicable version, and last-checked dates; show a no-match/incomplete-data state.
5. Voluntary correction/feedback path. Choose a low-retention submission destination before staging; do not silently store questionnaire answers or add analytics identifiers by default.

No database, authentication, background jobs, search service, or LLM is required to prove this first journey. A version-controlled catalog is enough to start. Feedback persistence and aggregate event measurement need an explicit minimal choice before staging; avoid adding a paid or sensitive-data service until that need is defined.

## Recommendation method and AI boundary

Use hard eligibility checks followed by a transparent score. First filter to verified, current-market BEVs and remove candidates that violate explicit hard constraints (for example, budget ceiling only when price evidence is sufficiently fresh, or minimum seating). Then compare available attributes to expressed preferences: suitable seats/cargo, range against a user-selected typical/long-trip need, charging compatibility/access needs, and budget fit. Treat unknown or stale facts as “unknown,” not as a low or high score; explain them and avoid claiming a confident fit. Use visible reason codes such as “fits your passenger requirement,” “price observation exceeds your limit,” and “range is within your stated trip need using [cycle].” Return no more than three, and support a no-match result.

Make weights and thresholds explicit, deterministic, and testable against hand-authored examples. Do not compare range figures from different cycles without a disclosed normalization policy. Do not infer home charging, real-world range, or stock. This baseline is a proposal to validate, not a market-proven ranking method.

An LLM may later help map optional free text to structured preferences for visitor confirmation, or extract candidate facts from a source into a reviewer queue. It must not write verified catalog facts, decide hidden ranking weights, or supply factual explanations from model memory. Keep matching, factual result fields, and final reason codes deterministic; no LLM is needed for the first slice.

- **Decision:** deterministic, rule-based matching; no LLM dependency in the first journey.
- **Rationale:** reproducibility and source-backed explanations matter more than open-ended interpretation for the defined questions.
- **Alternatives considered:** LLM-ranked candidates, LLM-written fact extraction directly into production data, or manual recommendations. The first two obscure verification; the last does not scale even to a small repeatable catalog.
- **Confidence:** medium for deterministic baseline; low for specific weights/thresholds until tested with user feedback and real catalog coverage.
- **Unresolved:** question units/thresholds, budget and price freshness behavior, range-cycle comparison, score weights, and whether free text materially improves completion.

## Deployment shape and required configuration

Deploy the same single application separately to **staging** and **production**, with distinct URLs and configuration. Staging uses a small review catalog and feedback route; production promotion follows review of data, accessibility, privacy, reliability, and support ownership. Use a provider/runtime that supports the selected Next.js server features. Provider selection is unresolved; no cloud service is chosen here. Keep secrets in the hosting platform’s environment configuration, never in the repository. If later choosing a database or feedback provider, provision separate staging/production instances and add only their required settings.

Potential configuration, only where the selected implementation uses it:

| Variable | Purpose | Secret? |
|---|---|---|
| `APP_ENV` | Distinguish local, staging, and production behavior. | No |
| `NEXT_PUBLIC_SITE_URL` | Public canonical base URL for metadata and absolute links. | No |
| `FEEDBACK_ENDPOINT` | Destination URL for the chosen feedback intake, if external. | Often yes; depends on provider |
| `FEEDBACK_TOKEN` | Authenticate server-side submission to that destination, if required. | Yes |
| `DATABASE_URL` | Connection string only if a persistent store is later selected. | Yes |

For a bundled read-only catalog, no catalog service credentials are needed. Avoid adding variables for unselected vendors. Never expose tokens or database credentials through `NEXT_PUBLIC_*` variables.

- **Decision:** deploy the same app as separate staging and production environments; keep the provider choice open.
- **Rationale:** staging needs realistic review without exposing draft catalog data or feedback handling to public production users, while a single code path keeps promotion simple.
- **Alternatives considered:** one shared environment (mixes drafts and production behavior); separate stacks/providers (adds operational overhead without a demonstrated need).
- **Confidence:** medium for environment separation; low for the eventual host and runtime until framework and team constraints are known.
- **Unresolved:** hosting provider, preview-deployment policy, feedback submission destination, and whether persistence is needed.

## Readiness checks

**Before inviting staging users:** complete a real journey on desktop and mobile; check keyboard and screen-reader basics; verify each displayed field’s version, source, checked date, and stale/unknown behavior; review hard filters, score reasons, no-match cases, and empty data; confirm feedback submission and correction triage owner; verify errors are not leaking submitted answers; check staging/production data and URLs are separate; and confirm no unnecessary personal or precise travel data is collected.

**Before public release:** recheck catalog evidence and dynamic observations; close or disclose unresolved high-impact facts; confirm catalog freshness and correction ownership; test availability, performance, accessibility, error handling, backups/restore if persistence is introduced, and monitoring appropriate to the chosen host; review privacy notice, retention, and vendor settings; verify production configuration and rollback; and document support/contact and issue-response process. Resolve any legal or compliance questions with qualified review rather than inferring conclusions from this technical design.

## Decision summary and open questions

- **Recommended now:** one Next.js full-stack app in `Front`; version-controlled, manually verified catalog; provenance per important fact; separate volatile market observations; deterministic matching; no required LLM or database at the first slice.
- **Open before implementation:** framework confirmation and host/runtime; catalog source/ownership and editing workflow; exact vehicle fields with reliable local evidence; fresh-price/availability policy; matching thresholds; feedback persistence choice and event minimization.
- **Open before production:** operating owner, sustainable verification cadence, privacy/retention details, production host configuration, incident/correction handling, and evidence threshold for launch.
- **Best next implementation slice:** choose a few locally offered versions with source-backed fields, then build one narrow questionnaire-to-results path using the deterministic matcher and visible evidence. This tests the data contract and recommendation explanations together before expanding catalog coverage or adding services.
