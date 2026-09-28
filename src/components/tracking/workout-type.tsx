import {
  BikeIcon,
  DumbbellIcon,
  FootprintsIcon,
  LayersIcon,
  PersonStandingIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import type { WorkoutType } from "@/lib/workouts";

export const WORKOUT_META: Record<WorkoutType, { label: string; icon: LucideIcon; unit: string }> = {
  run: { label: "Run", icon: FootprintsIcon, unit: "mi" },
  bike: { label: "Bike", icon: BikeIcon, unit: "mi" },
  swim: { label: "Swim", icon: WavesIcon, unit: "yd" },
  lift: { label: "Lift", icon: DumbbellIcon, unit: "" },
  brick: { label: "Brick", icon: LayersIcon, unit: "mi" },
  mobility: { label: "Mobility", icon: PersonStandingIcon, unit: "" },
};

export function workoutMeta(type: string) {
  return WORKOUT_META[type as WorkoutType] ?? WORKOUT_META.mobility;
}
