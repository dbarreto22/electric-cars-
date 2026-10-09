import assert from "node:assert/strict";
import test from "node:test";

import {
  getEligibleMatchingCandidates,
  PILOT_CATALOG_ELIGIBILITY,
} from "./eligibility.js";

test("blocked pilot candidates never enter the matching candidate pool", () => {
  const eligible = getEligibleMatchingCandidates(PILOT_CATALOG_ELIGIBILITY);
  assert.deepEqual(eligible, []);

  const blockedIds = new Set(PILOT_CATALOG_ELIGIBILITY.map(({ id }) => id));
  assert.equal(eligible.some(({ id }) => blockedIds.has(id)), false);
});

test("only records explicitly approved for matching pass the eligibility gate", () => {
  const candidates = [
    { id: "blocked", status: "blocked" },
    { id: "unknown", status: "needs_review" },
    { id: "approved", status: "approved_for_matching" },
  ];

  assert.deepEqual(getEligibleMatchingCandidates(candidates), [candidates[2]]);
});
