export interface PlanLimits {
  permanent: number;
  temporary: number;
}

/** Device slot limits by plan (mirrors backend enforcement). */
export const getPlanLimits = (plan?: string): PlanLimits =>
  plan === "paid" ? { permanent: 20, temporary: 5 } : { permanent: 5, temporary: 1 };
