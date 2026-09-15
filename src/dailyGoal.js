/** Shared daily-goal presets for settings + profile + registration. */
export const DAILY_GOAL_PRESETS = [2, 3, 5, 7];
export const DAILY_GOAL_MIN = 1;
export const DAILY_GOAL_MAX = 50;
export const DAILY_GOAL_DEFAULT = 5;

export function isPresetDailyGoal(value) {
  return DAILY_GOAL_PRESETS.includes(Number(value));
}

export function clampDailyGoal(value, fallback = DAILY_GOAL_DEFAULT) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < DAILY_GOAL_MIN) return fallback;
  return Math.min(DAILY_GOAL_MAX, Math.max(DAILY_GOAL_MIN, Math.round(n)));
}
