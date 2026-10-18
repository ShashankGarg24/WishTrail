const Config = require("../models/Config");
const { text, safeUrl } = require("./adminCampaignService");

const emptyPromotion = {
  enabled: false,
  title: "",
  subtitle: "",
  ctaLabel: "Learn more",
  ctaUrl: "/premium",
  offerCopy: "",
  startAt: "",
  endAt: "",
  audience: "all",
  surface: "announcement_card",
};
function validatePromotion(input) {
  if (!input || typeof input.enabled !== "boolean")
    throw Object.assign(new Error("Enabled must be a boolean"), {
      statusCode: 400,
    });
  const result = {
    enabled: input.enabled,
    title: text(input.title, 120, input.enabled),
    subtitle: text(input.subtitle, 240),
    ctaLabel: text(input.ctaLabel, 80, input.enabled),
    ctaUrl: safeUrl(input.ctaUrl || "/premium"),
    offerCopy: text(input.offerCopy, 120),
    audience: input.audience,
    surface: input.surface,
  };
  if (
    !["all", "free", "premium"].includes(result.audience) ||
    result.surface !== "announcement_card"
  )
    throw Object.assign(new Error("Unsupported audience or surface"), {
      statusCode: 400,
    });
  for (const key of ["startAt", "endAt"]) {
    if (
      input[key] &&
      (typeof input[key] !== "string" ||
        !Number.isFinite(Date.parse(input[key])))
    )
      throw Object.assign(new Error("Invalid promotion date"), {
        statusCode: 400,
      });
    result[key] = input[key] ? new Date(input[key]).toISOString() : "";
  }
  if (result.startAt && result.endAt && result.startAt >= result.endAt)
    throw Object.assign(new Error("End must follow start"), {
      statusCode: 400,
    });
  return result;
}
async function get() {
  const [maintenance, promotion] = await Promise.all([
    Config.findOne({ key: "maintenance_mode" }).lean(),
    Config.getValue("promotion", null),
  ]);
  return {
    maintenance: {
      enabled: Boolean(maintenance?.value),
      message: maintenance?.description || "",
    },
    promotion: { ...emptyPromotion, ...(promotion || {}) },
    promotionPlacementLive: true,
    deploymentRequired: [
      "Premium limits",
      "Feature switches without runtime consumers",
      "Minimum/latest app version and force update",
      "Rollout controls",
      "Navigation, components and styling",
      "API URLs and authentication",
    ],
  };
}
async function setMaintenance(input) {
  if (typeof input.enabled !== "boolean")
    throw Object.assign(new Error("Enabled must be a boolean"), {
      statusCode: 400,
    });
  const message = text(input.message, 500);
  await Config.setValue(
    "maintenance_mode",
    input.enabled,
    null,
    message || "System maintenance in progress",
  );
  return get();
}
async function setPromotion(input) {
  await Config.setValue(
    "promotion",
    validatePromotion(input),
    null,
    "Predefined Home Overview announcement card",
  );
  return get();
}
module.exports = { get, setMaintenance, setPromotion, validatePromotion };
