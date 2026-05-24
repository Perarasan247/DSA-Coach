# DSA Coach

A single-device web app that walks you through ~290 coding-interview problems
using a custom spaced-repetition schedule. All data lives in your browser
(IndexedDB) — no account, no server.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # runs the scheduling-engine unit tests
npm run build    # produces a static site in dist/
```

## Dropping in the real problems list

Replace `src/data/problems.json` with your ~290-problem catalog. Schema:

```json
[
  {
    "id": 1,
    "title": "Two Sum",
    "topic": "Arrays & Hashing",
    "subtopic": "hash maps",          // optional
    "difficulty": "easy",              // easy | medium | hard
    "order_index": 1,                  // roadmap order; new problems are served in ascending order
    "url": "https://leetcode.com/..."  // optional
  }
]
```

On boot the app upserts the catalog into Dexie. Adding rows later is
non-destructive: only new `id`s are inserted; existing cards and reviews stay.

## Architecture

```
src/
  engine/                 # pure, framework-free scheduling logic (tested)
    scheduler.ts          # rate(), resolveMaster(), buildTodaysQueue(), pickOffset()
    dates.ts              # YYYY-MM-DD day-key helpers (local time, no off-by-ones)
    types.ts              # Problem, Card, Review, Settings
    __tests__/            # 25 unit tests covering every rule in the spec
  db/db.ts                # Dexie schema, seeding, export/import, reset
  lib/store.ts            # useLiveQuery hooks + mutation helpers
  components/             # shared UI primitives (Card, Btn, FluencyButtons, Ring, …)
  screens/                # Today, Problems, ProblemDetail, Stats, Settings
  App.tsx                 # sidebar / mobile tab bar / theme / global hotkeys
```

### The scheduling engine

The schedule is the custom doubling engine from the brief — **not** SM-2.

| Rating | Effect                                                                              |
| ------ | ----------------------------------------------------------------------------------- |
| Stuck  | streak → 0, interval pulled to 2 days (or 3 if day 2 is saturated)                  |
| Shaky  | streak → 0, interval pulled to 4 days (or 5 if day 4 is saturated)                  |
| Fluent | streak +1, interval doubles (base 8 → 16 → 32 …); 3-in-a-row triggers master prompt |

`buildTodaysQueue()` blends revisions (due ≤ today, most-overdue first) with new
problems (strict `order_index` order). Revisions can stretch to the ceiling
(default 7); new problems only fill toward the target (default 5). Unfinished
items keep their due date so they lead the next day's queue automatically.

### Persistence

Dexie tables: `problems`, `cards`, `reviews`, `settings`. Every rating writes a
`review` row carrying a `prev_card` snapshot, which makes Undo (Cmd/Ctrl-Z, or
the link in the cleared-day state) a one-row revert. Export/Import dumps the
full DB to JSON.

### Naming convention (don't mix these up)

- **Fluency** = how the solve went: **Stuck / Shaky / Fluent** — the hero
  action, colored amber / blue / green, keyboard `1` / `2` / `3`.
- **Difficulty** = a fixed attribute of the problem: **Easy / Medium / Hard** —
  rendered as quiet neutral pills, visually unlike the fluency buttons.

## Tests

`npm test` covers:

- Fluent path produces +8, +16, then `ready_to_master` on streak 3.
- Shaky-first sequence (shaky, shaky, fluent×3) retires on the 5th attempt.
- Stuck/Shaky on an active card resets the streak and pulls the interval back.
- New-card base intervals: Stuck +2, Shaky +4, Fluent +8.
- First Fluent after a Stuck start doubles the previous interval (2 → 4).
- `resolveMaster(keepGoing=false)` marks the card mastered and removes it from
  the queue forever.
- Queue rules: 0/2/7/8 due → expected revisions+new mix, ≤ ceiling, carry-over.
- New problems are introduced strictly in `order_index` order.
- Mastered cards never appear in the queue.
- Load smoothing via `pickOffset` skips a saturated early day for the late one.

All 25 tests pass.
