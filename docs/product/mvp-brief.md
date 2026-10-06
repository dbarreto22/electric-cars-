# MVP brief

## Problem to explore

People considering an electric car may need to compare unfamiliar models against practical constraints such as budget, daily driving, passenger and cargo needs, and charging access. We do not yet know which parts of this decision are hardest for people in Uruguay; this MVP is intended to make that problem testable.

## Initial target (assumption)

People in Uruguay considering buying a new, fully electric car within the next 12 months. Validate this audience through product usage and staging feedback; it is not an established market finding.

## Proposed journey

1. A visitor answers a short set of questions about budget, driving patterns, passenger/space needs, and access to charging.
2. The product shows up to three potentially suitable models, explains the factors behind each match, and identifies the sources and last-checked dates for vehicle information.
3. The visitor reviews the trade-offs and can report unclear guidance, missing information, or incorrect data.

AI may help interpret answers or phrase explanations. It must not create vehicle facts, and every recommendation needs an understandable reason grounded in available information.

## MVP scope

- A focused questionnaire covering the needs above.
- A small, manually verified starter catalog of new, fully electric models relevant to Uruguay.
- A transparent comparison or recommendation of up to three candidates, including fit explanations, data sources, and last-checked dates.
- A clear way to say that no available model appears to fit, or that information is incomplete.
- A lightweight staging feedback path, including reports of incorrect data.

Catalog coverage, question wording, fit logic, and whether AI adds value are hypotheses to learn about, not settled requirements for later releases.

## Out of scope for MVP

- Exhaustive or automatically synchronized vehicle listings.
- Used cars, hybrids, financing, insurance, trade-in, or purchase transactions.
- Claims about charging availability beyond verified information in the catalog.
- Unexplained rankings or recommendations, and AI-generated vehicle specifications or prices.
- A commitment to any final technical architecture or AI provider.

## Initial success signals

Look for visitors completing the questions, reviewing results, understanding why candidates were suggested, and reporting useful corrections or missing details. Track whether results are unavailable or poorly matched. Set baselines and targets only after observing the staging experience; early signals do not establish commercial demand.

## Next-phase implementation sequence

1. **Technical design:** inspect the existing Front/Back setup and agree on data boundaries, source records, update ownership, and deployment approach before choosing architecture.
2. **First working user journey:** implement the questionnaire through to explainable results, initially with clearly marked sample or catalog-backed data as appropriate.
3. **Verified starter catalog:** select a manageable set of relevant models and record source, verification date, and uncertainty for each fact.
4. **Testing:** check questionnaire paths, recommendation explanations, empty or incomplete data cases, accessibility, and reported data corrections.
5. **Staging feedback:** release to a small, reachable audience; observe the signals and collect voluntary feedback without scheduled interviews as a prerequisite.
6. **Production readiness:** review data freshness and maintenance ownership, privacy, reliability, accessibility, support and correction handling, and decide whether evidence supports launch.
