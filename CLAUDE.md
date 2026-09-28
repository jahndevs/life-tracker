@AGENTS.md

# Life Tracker conventions

- Day-based dates are `YYYY-MM-DD` strings (`src/lib/dates.ts`), never `Date` objects. "Today" is `todayIn(user.timezone)`.
- Domain logic lives in pure `src/lib/*.ts` modules with Vitest tests beside them. Server Actions stay thin.
- Every Server Action calls `requireUser()` and scopes writes by `userId`.
- Pages call `requireUser()` / `requirePlan()` themselves; layouts render in parallel with pages.
- Prisma 7 generates the client to `src/generated/prisma` (gitignored). Run `npx prisma generate` after schema changes.
- Verify with `npm run typecheck && npm run lint && npm test && npm run build`.
