import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextStep,
  getPreviousStep,
  validateAllAnswers,
  validateQuestionStep,
} from "./steps.js";

const completeAnswers = {
  budgetStatus: "not_defined",
  dailyKm: "24",
  longTripStatus: "has_trip",
  longTripKm: "180",
  passengers: "3",
  spaceNeeds: ["luggage"],
  chargingAccess: "private_home",
};

test("required answers are validated before a step can advance", () => {
  assert.ok(validateQuestionStep("budget", {}).budgetStatus);
  assert.ok(validateQuestionStep("driving", {}).dailyKm);
  assert.ok(validateQuestionStep("space", {}).passengers);
  assert.ok(validateQuestionStep("space", {}).spaceNeeds);
  assert.ok(validateQuestionStep("charging", {}).chargingAccess);
  assert.equal(validateAllAnswers({}).budget?.budgetStatus !== undefined, true);
});

test("a defined budget requires a positive amount and supported currency", () => {
  assert.deepEqual(
    validateQuestionStep("budget", {
      budgetStatus: "defined",
      budgetAmount: "0",
      budgetCurrency: "EUR",
    }),
    {
      budgetAmount: "Ingresá un monto mayor que cero.",
      budgetCurrency: "Elegí dólares o pesos uruguayos.",
    },
  );
});

test("valid answers move through the questionnaire and can return for edits", () => {
  assert.deepEqual(getNextStep("budget", completeAnswers), {
    stepId: "driving",
    errors: {},
  });
  assert.equal(getNextStep("charging", completeAnswers).stepId, "review");
  assert.equal(getPreviousStep("review"), "charging");
  assert.equal(getPreviousStep("charging"), "space");
});

test("invalid answers keep the visitor on the current step", () => {
  const result = getNextStep("charging", {});
  assert.equal(result.stepId, "charging");
  assert.ok(result.errors.chargingAccess);
});
