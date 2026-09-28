import * as z from "zod";
import { isISODate, weekday } from "@/lib/dates";
import { MACRO_KEYS } from "@/lib/adherence";
import { PHASE_KEYS } from "@/lib/phases";
import { WORKOUT_TYPES } from "@/lib/workouts";

export const isoDate = z.string().refine(isISODate, { error: "Pick a valid date." });

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const weight = z.coerce.number().min(50).max(700);
const optionalMeasure = z.preprocess(blankToUndefined, z.coerce.number().min(0).max(200).optional());

export const PlanSchema = z
  .object({
    raceName: z.string().trim().min(1, { error: "Name your race." }).max(80),
    raceDate: isoDate,
    startDate: isoDate.refine((d) => weekday(d) === 0, { error: "Start on a Monday." }),
    startWeight: weight,
    goalWeight: weight,
    weeklyLossLb: z.coerce.number().min(0).max(3),
  })
  .refine((p) => p.raceDate > p.startDate, {
    path: ["raceDate"],
    error: "Race day must be after the start date.",
  });

const target = (max: number) => z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(max));

export const TargetsSchema = z.object({
  phase: z.enum(PHASE_KEYS),
  calories: target(10000),
  protein: target(1000),
  carbs: target(2000),
  fat: target(1000),
  waterOz: target(1000),
});

export const MacroKeySchema = z.enum(MACRO_KEYS);

export const WeighInSchema = z.object({
  date: isoDate,
  weight: z.preprocess(blankToUndefined, weight.optional()),
  waistNavel: optionalMeasure,
  waistNatural: optionalMeasure,
  chest: optionalMeasure,
  arm: optionalMeasure,
  thigh: optionalMeasure,
  hips: optionalMeasure,
});

export const WorkoutSchema = z.object({
  type: z.enum(WORKOUT_TYPES),
  protocol: z.string().trim().min(1, { error: "Describe the session." }).max(120),
  hardLong: z.boolean().default(false),
});

export const WorkoutDetailsSchema = z.object({
  distance: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(10000).optional()),
  duration: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(1440).optional()),
  notes: z.string().trim().max(1000).optional(),
});

export const SupplementSchema = z.object({
  name: z.string().trim().min(1, { error: "Name it." }).max(60),
  timing: z.string().trim().max(40).optional(),
});

export const JournalSchema = z.object({
  body: z.string().max(50_000, { error: "That entry is too long." }),
  mood: z.number().int().min(1).max(5).nullable(),
  tags: z.string().max(500),
});

export const HabitSchema = z.object({
  name: z.string().trim().min(1, { error: "Name the habit." }).max(60),
  cadence: z.enum(["daily", "weekdays", "custom"]),
  days: z.number().int().min(1, { error: "Pick at least one day." }).max(127),
});

const optionalPages = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().int().min(1).max(20000).optional(),
);

export const BookSchema = z.object({
  title: z.string().trim().min(1, { error: "Add a title." }).max(200),
  author: z.string().trim().max(120).optional(),
  pagesTotal: optionalPages,
  status: z.enum(["want", "reading", "finished"]),
  notes: z.string().trim().max(5000).optional(),
});
