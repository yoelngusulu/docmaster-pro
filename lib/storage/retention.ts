import type { YajuPlanId } from "@/lib/billing/credits";

export type StorageRetentionPolicy = {
  plan: YajuPlanId;
  retentionHours: number;
  label: string;
};

export const YAJU_STORAGE_RETENTION: Record<YajuPlanId, StorageRetentionPolicy> = {
  FREE: {
    plan: "FREE",
    retentionHours: 24,
    label: "24 hours",
  },
  DAILY: {
    plan: "DAILY",
    retentionHours: 24,
    label: "24 hours",
  },
  PRO_MONTHLY: {
    plan: "PRO_MONTHLY",
    retentionHours: 24 * 7,
    label: "7 days",
  },
  PRO_YEARLY: {
    plan: "PRO_YEARLY",
    retentionHours: 24 * 7,
    label: "7 days",
  },
  POWER_USER: {
    plan: "POWER_USER",
    retentionHours: 24 * 30,
    label: "30 days",
  },
};

export function getStorageRetention(plan: YajuPlanId) {
  return YAJU_STORAGE_RETENTION[plan];
}

export function getStorageExpiryDate(plan: YajuPlanId, createdAt = new Date()) {
  const { retentionHours } = getStorageRetention(plan);

  return new Date(createdAt.getTime() + retentionHours * 60 * 60 * 1000);
}
