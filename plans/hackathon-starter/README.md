# Hackathon starter — Next.js + Better Auth + Drizzle/Neon

**Status:** `draft` — awaiting `plan-review`
**Created:** 2026-08-17
**Requested by:** sahil

## Purpose

A Next.js starter that lets 8 people build in one repo at once. Every API route exists
from hour one and returns realistic, schema-valid mock data, so frontend work never waits
on backend work — landing the real logic is a one-argument change to a route that already
works. Plus auth (email/password + Google) with extended NGO profile fields, Drizzle on a
shared Neon Postgres, a shadcn/ui kit, and an `AGENTS.md` that keeps Claude on the rails.

## Reading order

| File | What's in it |
|---|---|
| **`plan.md`** | **Start here.** Tweakable decisions first, then the phase-by-phase build order. |
| `findings.md` | Verified stack facts (with sources), derived risks, assumptions, open unknowns. |
| `decisions.md` | What was settled, by whom, and what was deliberately deferred. |
| `01-architecture.md` | File layout and the dependency rules that keep it honest. |
| `02-api-contract-layer.md` | The core. `defineContract`, `defineRoute`, the typed client, mock factories. |
| `03-auth-and-user-model.md` | Better Auth config, the two-roles split, the onboarding gate. |
| `04-database-and-migrations.md` | Neon client, schema ownership, migration rules for a shared DB. |
| `05-ui-kit.md` | Design direction, component list, form wiring. |
| `06-team-workflow-and-agents-md.md` | Ownership map, feature workflow, and the full `AGENTS.md` text to ship. |

## The four decisions everything else follows from

1. **Contract-first.** One Zod contract per endpoint produces the types, the validation,
   the mock, the client, and the docs. They cannot drift because there's one definition.
2. **Single Next.js app**, not a monorepo — module boundaries as folders + a lint rule.
3. **Shared Neon Postgres**, made survivable by process: `generate`+`migrate` only, one
   schema owner, per-feature schema files, per-dev Neon branch as escape hatch.
4. **Two roles, not one.** `systemRole` (server-owned, authz) is separate from `ngoRole`
   (self-declared profile). Merging them is a privilege-escalation bug.

## Open questions for sahil

1. **npm vs Bun** — assumed npm (Node 26 is present, pnpm isn't, and a mixed lockfile
   across 8 machines causes "works on my machine"). Bun is installed locally and faster;
   switching costs 2 minutes now and real pain later. Object now if you want Bun.
2. **The NGO field list** (`ngoRole` values, what onboarding asks) is a placeholder until
   the problem statement is final. Designed to be a 3-line change.
3. **Domain nouns** — `projects`/`tasks` are worked examples to rename on day one.

## Next step

Run `plan-review` on `plan.md`. Only its pass flips this status to `ready-to-implement`.
Then start a fresh session with:

```
implement plans/hackathon-starter/
```
