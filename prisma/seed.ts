// Demo account with three weeks of history: npm run db:seed
// Log in as demo@lifetracker.local / demo-password

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, startOfWeek, todayIn, weekday } from "../src/lib/dates";
import { isScheduled } from "../src/lib/habits";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const EMAIL = "demo@lifetracker.local";
const PASSWORD = "demo-password";

const PLAN = { raceName: "Demo Triathlon", startWeight: 200, goalWeight: 185, weeklyLossLb: 1 };

const TARGETS = [
  { phase: "base", calories: 2200, protein: 180, carbs: 220, fat: 65, waterOz: 100 },
  { phase: "volume", calories: 2600, protein: 170, carbs: 300, fat: 70, waterOz: 110 },
  { phase: "race", calories: 2800, protein: 170, carbs: 350, fat: 70, waterOz: 120 },
  { phase: "taper", calories: 2400, protein: 160, carbs: 300, fat: 60, waterOz: 100 },
];

const SUPPLEMENTS = [
  { name: "Protein shake", timing: "Post-workout" },
  { name: "Creatine", timing: "Post-workout" },
  { name: "Multivitamin", timing: "Breakfast" },
  { name: "Electrolytes", timing: "Around training" },
];

const WEEK = [
  { weekday: 0, type: "lift", protocol: "Upper body" },
  { weekday: 1, type: "run", protocol: "30 min easy" },
  { weekday: 2, type: "swim", protocol: "1,500 yd technique" },
  { weekday: 3, type: "bike", protocol: "45 min Z2" },
  { weekday: 4, type: "lift", protocol: "Lower body" },
  { weekday: 5, type: "bike", protocol: "Long ride 90 min", hardLong: true },
  { weekday: 6, type: "run", protocol: "Long run 60 min", hardLong: true },
];

const JOURNAL = [
  { body: "Good session today. Swim technique still needs work on the catch.", tags: ["training", "swim"] },
  { body: "Legs heavy on the run. Slept badly, so phone out of the bedroom tonight.", tags: ["sleep", "run"] },
  { body: "Hit every macro. Meal prep is paying off.", tags: ["nutrition"] },
  { body: "Long ride went well, fueled every 30 min.", tags: ["training", "bike"] },
];

const HABITS = [
  { name: "Read 20 pages", cadence: "daily", days: 0b1111111 },
  { name: "Stretch 10 min", cadence: "custom", days: 0b0010101 },
  { name: "Lights out by 10:30", cadence: "weekdays", days: 0b1111111 },
];

async function main() {
  await db.user.deleteMany({ where: { email: EMAIL } });

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = todayIn(timezone);
  const startDate = addDays(startOfWeek(today), -21);

  const user = await db.user.create({
    data: {
      email: EMAIL,
      name: "Demo",
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      timezone,
      createdAt: new Date(`${startDate}T12:00:00Z`),
      plan: { create: { ...PLAN, startDate, raceDate: addDays(startDate, 7 * 36 + 6) } },
      phaseTargets: { create: TARGETS },
      supplements: { create: SUPPLEMENTS.map((s, i) => ({ ...s, sortOrder: i })) },
      workoutPlan: { create: WEEK.map((w, i) => ({ ...w, sortOrder: i })) },
    },
    include: { supplements: true, workoutPlan: true },
  });

  const tagIds = new Map<string, string>();
  for (const name of new Set(JOURNAL.flatMap((j) => j.tags))) {
    tagIds.set(name, (await db.tag.create({ data: { userId: user.id, name } })).id);
  }

  const habits = await Promise.all(
    HABITS.map((h, i) => db.habit.create({ data: { userId: user.id, ...h, startDate, sortOrder: i } })),
  );

  await db.book.createMany({
    data: [
      { title: "Endure", author: "Alex Hutchinson", status: "reading", pagesTotal: 320, pagesRead: 142, startedAt: addDays(startDate, 3) },
      { title: "The Obstacle Is the Way", author: "Ryan Holiday", status: "want", pagesTotal: 224 },
      { title: "Can't Hurt Me", author: "David Goggins", status: "want", pagesTotal: 364 },
      { title: "Atomic Habits", author: "James Clear", status: "finished", pagesTotal: 320, pagesRead: 320, rating: 5, startedAt: addDays(startDate, -40), finishedAt: addDays(startDate, -20) },
      { title: "Born to Run", author: "Christopher McDougall", status: "finished", pagesTotal: 287, pagesRead: 287, rating: 4, startedAt: addDays(startDate, -80), finishedAt: addDays(startDate, -55) },
    ].map((b) => ({ userId: user.id, ...b })),
  });

  // Fixed-seed PRNG so reseeding produces the same history.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  for (let date = startDate; date < today; date = addDays(date, 1)) {
    const week = Math.floor((Date.parse(date) - Date.parse(startDate)) / (7 * 86_400_000));
    const isMonday = weekday(date) === 0;
    const entry = rand() < 0.6 ? JOURNAL[Math.floor(rand() * JOURNAL.length)] : null;

    await db.dayLog.create({
      data: {
        userId: user.id,
        date,
        weight: isMonday ? Math.round((PLAN.startWeight - 0.9 * week + rand() * 0.8) * 10) / 10 : null,
        waistNavel: isMonday ? Math.round((38 - 0.3 * week) * 10) / 10 : null,
        nutrition: {
          create: {
            hitCalories: rand() < 0.8,
            hitProtein: rand() < 0.85,
            hitCarbs: rand() < 0.7,
            hitFat: rand() < 0.75,
            hitWater: rand() < 0.9,
          },
        },
        supplements: {
          create: user.supplements.map((s) => ({ supplementId: s.id, taken: rand() < 0.85 })),
        },
        workouts: {
          create: user.workoutPlan
            .filter((t) => t.weekday === weekday(date))
            .map((t, i) => ({
              templateId: t.id,
              type: t.type,
              protocol: t.protocol,
              hardLong: t.hardLong,
              completed: rand() < 0.85,
              sortOrder: i,
            })),
        },
        journal: entry
          ? {
              create: {
                body: entry.body,
                mood: 2 + Math.floor(rand() * 4),
                tags: { connect: entry.tags.map((name) => ({ id: tagIds.get(name)! })) },
              },
            }
          : undefined,
      },
    });

    for (const h of habits) {
      if (isScheduled(h, date) && rand() < 0.8) await db.habitLog.create({ data: { habitId: h.id, date } });
    }
  }

  console.log(`Seeded ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
