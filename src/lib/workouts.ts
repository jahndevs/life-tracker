export const WORKOUT_TYPES = ["run", "bike", "swim", "lift", "brick", "mobility"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
