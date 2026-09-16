---
name: git-workflow
description: Committing, merging, and pushing changes in the AutoMatch repo. Use whenever work is finished and needs to go into git — committing new work, tidying up, merging a branch into main, or pushing. Enforces the project's branch-first, verify-before-push discipline.
---

# Git workflow (AutoMatch)

The established discipline for getting work into git safely. Follow it every time —
the whole point is that `main` never breaks and nothing risky happens silently.

## The rhythm

1. **Never commit directly to `main`.** Always work on a branch. If not already on one,
   create a descriptively named branch first (e.g. `drivetrain-display`, `skill-api-route`).
2. **Verify before it goes anywhere.** Before committing, run `npm test` (the scoring
   regression suite must stay green) and, if any app code changed, `npm run build` (must
   compile). If either fails → **STOP and show the user**, do not commit.
3. **Commit only what belongs to this task.** Stage the specific files for the work; show
   `git status` so the user can see exactly what's staged. Never commit the untracked
   template CSVs (`scripts/equipment-trims-template.csv`,
   `scripts/drivetrain-pairing-template.csv`) unless the user explicitly says so — if
   unsure whether a file belongs, ask rather than staging it.
4. **Merge into `main` only as a clean fast-forward.** If it is NOT a clean fast-forward
   (conflicts, diverged history) → **STOP and show the user**, do not force it.
5. **Delete the branch** once it's merged.
6. **Push `main` to origin** — see the push rule below.
7. **Show the result:** final `git status` and `git log --oneline -6`.

## The push rule

Push `main` to origin **automatically** once everything is green — but only then:

- Push only if **`npm test` passed, `npm run build` passed (when app code changed), and the
  merge was a clean fast-forward.** If any of those failed, do NOT push — STOP and show the
  user the problem instead.
- **Never `--force` / force-push.** If the push is rejected for any reason → **STOP and show
  the user the exact error**. Never force past a rejection.

The push is automatic because the safety gates (analysis before, tests after) have already
run. A red gate cancels the automatic push — it does not get pushed and then flagged.

## Hard rules (never bend)

- Never commit to `main` directly, never `--force`, never push past a rejection.
- A failing test, a failing build, a non-clean merge, or a push rejection all mean the same
  thing: **STOP and show the user** — never force, never paper over.
- Do NOT run migrations or execute anything against the database as part of git work — that's
  separate (see the write-migration / author-data-sql skills). Git work is git only.
