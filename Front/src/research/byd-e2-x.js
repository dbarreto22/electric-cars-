export const RESEARCH_CANDIDATE = Object.freeze({
  id: "byd-new-e2-x",
  make: "BYD",
  model: "New E2 X",
  officialDomain: "byd.com.uy",
  officialPublisher: "BYD Uruguay",
  matchingEligible: false,
});

export const RESEARCH_TYPES = Object.freeze([
  "specifications",
  "current_price",
  "driving_evaluation",
]);

export const SPECIFICATION_FIELDS = Object.freeze([
  "local_version_and_model_year",
  "passenger_capacity",
  "cargo_volume",
  "range",
  "battery_capacity",
  "ac_charging_power",
  "dc_charging_power",
  "charging_connector",
]);

export const PRICE_FIELDS = Object.freeze(["price"]);

export const SOURCE_DOMAINS = Object.freeze({
  official: RESEARCH_CANDIDATE.officialDomain,
  autoblog: "autoblog.com.uy",
});
