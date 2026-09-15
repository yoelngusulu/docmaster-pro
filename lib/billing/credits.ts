export type YajuPlanId =
  | "FREE"
  | "DAILY"
  | "PRO_MONTHLY"
  | "PRO_YEARLY"
  | "POWER_USER";

export type CreditPlan = {
  id: YajuPlanId;
  name: string;
  credits: number;
  reset: "none" | "24-hours" | "monthly";
  bulkEnabled: boolean;
};

export const YAJU_CREDIT_PLANS: Record<YajuPlanId, CreditPlan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    credits: 0,
    reset: "none",
    bulkEnabled: false,
  },
  DAILY: {
    id: "DAILY",
    name: "Daily Pass",
    credits: 100,
    reset: "24-hours",
    bulkEnabled: true,
  },
  PRO_MONTHLY: {
    id: "PRO_MONTHLY",
    name: "Pro Monthly",
    credits: 1500,
    reset: "monthly",
    bulkEnabled: true,
  },
  PRO_YEARLY: {
    id: "PRO_YEARLY",
    name: "Pro Yearly",
    credits: 1500,
    reset: "monthly",
    bulkEnabled: true,
  },
  POWER_USER: {
    id: "POWER_USER",
    name: "Power User",
    credits: 6000,
    reset: "monthly",
    bulkEnabled: true,
  },
};

export const YAJU_TOOL_CREDITS = {
  "coordinates-bulk-small": 5,
  "coordinates-bulk-medium": 15,
  "coordinates-bulk-large": 40,
  "pdf-to-word": 10,
  "pdf-to-excel": 12,
  "pdf-to-powerpoint": 12,
  "pdf-compress-heavy": 5,
  "pdf-batch": 10,
  "ai-document": 20,
} as const;

export type CreditToolId = keyof typeof YAJU_TOOL_CREDITS;

export function getCreditCost(tool: CreditToolId) {
  return YAJU_TOOL_CREDITS[tool];
}

export function getBulkCoordinateCreditCost(pointCount: number) {
  if (!Number.isFinite(pointCount) || pointCount <= 0) {
    throw new Error("pointCount must be a positive number");
  }

  if (pointCount <= 100) {
    return YAJU_TOOL_CREDITS["coordinates-bulk-small"];
  }

  if (pointCount <= 1000) {
    return YAJU_TOOL_CREDITS["coordinates-bulk-medium"];
  }

  return YAJU_TOOL_CREDITS["coordinates-bulk-large"];
}
