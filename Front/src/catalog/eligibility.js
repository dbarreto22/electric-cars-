// Keep this status aligned with docs/data/verified-pilot-catalog.md.
// This slice includes no vehicle facts; blocked records cannot enter a match pool.
export const PILOT_CATALOG_ELIGIBILITY = Object.freeze([
  Object.freeze({ id: "peugeot-new-e-2008-gt-2025", status: "blocked" }),
  Object.freeze({ id: "peugeot-new-e-3008-gt-awd-2026", status: "blocked" }),
]);

export function getEligibleMatchingCandidates(records) {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => record?.status === "approved_for_matching");
}
