# Data and source strategy

## MVP data model

Keep the starter catalog small and version controlled. Store each value separately from its evidence so a result can show where a fact came from.

| Record | Minimum fields |
|---|---|
| Model | Stable internal ID, make, marketed model name, body/space category where verified, lifecycle state, Uruguay-market status, and model-level source references. |
| Version | Stable ID, model ID, exact version/trim name, model year or applicable period, powertrain (`BEV` only for MVP), seats, cargo volume where published, dimensions only if used in matching, battery capacity with gross/usable distinction if known, range value **and test cycle**, AC/DC charging limits if used, and version status. Unknown values stay unknown; do not fill gaps from another version. |
| Fact evidence | Fact/field key, source ID and URL, date checked, applicable make/model/version/year/market, verification status (`verified`, `needs_review`, `disputed`, `retired`), and a short note about the claim or discrepancy. |
| Source | Publisher, source type (manufacturer/importer, public body, dataset), URL or stable identifier, access format, date checked, and known access/reuse caveat. |
| Market observation | Version ID, price and currency if published, whether it is a list/reference price or promotion, availability wording, observed date, optional validity dates, and evidence. Never present an old observation as a current quote. |

The displayed “last checked” date should be the newest verified evidence supporting the displayed facts, and dynamic market observations need their own observed date. Clearly label the range test cycle (for example, WLTP or NEDC) rather than comparing unlike values as if equivalent.

### Stable versus changing data

- **Relatively stable:** version identity, dimensions, seats, battery and charging specifications, and published test-cycle range. These can still change between model years or market versions; evidence must match the exact applicability.
- **Changing:** local price, stock/availability, delivery estimates, and promotions. Record as dated observations, never as timeless model attributes. If no fresh evidence exists, show “not recently checked” or omit the claim.

### Freshness and corrections

Use an explicit status instead of silently serving old values. Proposed initial review windows are 180 days for specification evidence and 30 days for price/availability observations; these are operational defaults to validate, not source guarantees. On expiry mark evidence `stale` (or derive that display status from `checked_at`), exclude stale dynamic claims, and queue specification facts for review. A reported correction moves the affected fact to `needs_review`; a reviewer records the competing source, decides to verify/update or retain with a note, and preserves the prior value and evidence in history. `disputed` facts are hidden from matching and prominent display until resolved. Assign a catalog owner before staging.

## Source investigation

Pages below were opened or returned in direct search on 2026-10-06. This verifies that the cited pages were reachable and what they appeared to contain at that time; it does not verify every individual specification or establish reuse rights.

| Source | What it can support | Observed constraints and limits |
|---|---|---|
| [BYD Auto Uruguay models](https://byd.com.uy/autos/) | Local product names, some advertised ranges and price points, named test cycles on the page, and local sales/contact information. Useful as a lead and source for its listed versions. | Mixed BEV and plug-in hybrid products appear together; page says content may not be correct after product changes. “Desde” prices and promotional conditions require dated rechecking. The page does not by itself establish stock or exact trim applicability. |
| [Renault Uruguay E-Tech electric](https://www.renault.com.uy/e-tech/e-tech-electric.html) | Manufacturer market page with EV model names and ranges by model; it distinguishes values by model/version and refers to WLTP. | Marketing page, not a complete Uruguay offer or version-level specification sheet; figures may refer to other markets/versions and need local importer corroboration. No bulk feed or reuse terms were established. |
| [MIEM: import a new electric vehicle](https://www.gub.uy/ministerio-industria-energia-mineria/politicas-y-gestion/tramite-para-importar-vehiculo-electrico) | Public context that locally represented makes/models and individual import routes are distinct; useful when defining what “offered in Uruguay” means. | Published 2023; procedural context, not a current inventory, spec source, or legal advice for the product. |
| [MIEM: electric mobility statistics](https://www.gub.uy/ministerio-industria-energia-mineria/politicas-y-gestion/estadisticas-movilidad-electrica) | Periodic market context and charts; page attributes some sales figures to Autodata. | Aggregate and period-bound, not a current model/version catalog. Underlying Autodata access/reuse and update cadence were not established. |
| [MIEM: vehicle fleet](https://www.gub.uy/ministerio-industria-energia-mineria/datos-y-estadisticas/estadisticas/parque-automotor) | Published fleet series for 2017–2025, based on SUCIVE, with downloadable attachments. Potential contextual validation for fleet trends. | Fleet counts are not new-car retail availability or technical specs. The page says an update is in process; inspect attached files and their metadata before relying on them. |
| [Uruguay open data catalog](https://catalogodatos.gub.uy/) | Discovery point for public datasets and their metadata. | No specific currently maintained model/version catalog or suitable open vehicle feed was verified in this review. Check each dataset's format, update date, and license before use. |

Importer/manufacturer product pages should be the first evidence for local versions and advertised local price/availability. Prefer exact local technical sheets or written confirmation for technical facts when a marketing page is ambiguous. MIEM, SUCIVE-derived publications, ACAU, or Autodata can give market context if the relevant dataset, period, access, and reuse terms are verified; aggregate sales are not evidence that a specific vehicle is currently available. Official importers and public bodies are likely source classes to investigate, not a claim that each publishes a usable feed. No API availability was verified.

## Initial collection and update method

Start with a manually curated, version-controlled CSV or JSON catalog plus a source/evidence record for every displayed or matched field. A reviewer checks manufacturer/importer pages and technical sheets, captures the applicable URL/version and date, and records unresolved discrepancies. Recheck expiring price/availability observations before showing them; review spec facts at the proposed interval or after a model-year change/report. Do not scrape at scale for MVP. A spreadsheet can be the editorial working copy if useful, but its owner, export path, change history, and review process must be agreed before it becomes the serving source.

## Decision record

- **Decision:** use small manual curation with per-fact provenance; separate dated commercial observations from specifications.
- **Rationale:** this meets explainability and freshness needs without depending on unverified feeds or broad crawling.
- **Alternatives considered:** automated crawling/importer feeds (no API or terms verified); third-party catalog (coverage, accuracy, and reuse unresolved); market statistics as catalog (wrong granularity).
- **Confidence:** medium for the workflow; low for the proposed freshness intervals until real maintenance effort and source changes are observed.
- **Unresolved:** exact starter models and local trims; field-level primary sources; publisher reuse permissions; catalog owner; acceptable review cadence; whether a spreadsheet or repository file is the editing interface; whether official local price/stock observations can be maintained.
