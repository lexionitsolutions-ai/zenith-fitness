export const BMI_CHECK_INTERVAL_DAYS = 45;

export const BMI_VALIDATION_RANGES = {
  weightKg: { min: 20, max: 300, label: "Current Weight" },
  skeletalMuscleMassKg: { min: 5, max: 100, label: "Skeletal Muscle Mass" },
  fatMassKg: { min: 1, max: 150, label: "Fat Mass" },
  bodyFatPercentage: { min: 1, max: 70, label: "Body Fat %" },
} as const;

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateNextBmiDate(latestBmiDate: Date) {
  const next = new Date(Date.UTC(latestBmiDate.getUTCFullYear(), latestBmiDate.getUTCMonth(), latestBmiDate.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + BMI_CHECK_INTERVAL_DAYS);
  return next;
}

export function calculateWeightLossProgress(baselineWeight: number, currentWeight: number, targetWeight: number) {
  const totalRequired = baselineWeight - targetWeight;
  const progressAmount = baselineWeight - currentWeight;
  const rawPercentage = totalRequired > 0 ? (progressAmount / totalRequired) * 100 : 0;
  return { progressAmount, totalRequired, rawPercentage, visualPercentage: clamp(rawPercentage), reached: currentWeight <= targetWeight };
}

export function calculateMuscleGainProgress(baselineMuscle: number, currentMuscle: number, targetMuscle: number) {
  const totalRequired = targetMuscle - baselineMuscle;
  const progressAmount = currentMuscle - baselineMuscle;
  const rawPercentage = totalRequired > 0 ? (progressAmount / totalRequired) * 100 : 0;
  return { progressAmount, totalRequired, rawPercentage, visualPercentage: clamp(rawPercentage), reached: currentMuscle >= targetMuscle };
}

export function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
