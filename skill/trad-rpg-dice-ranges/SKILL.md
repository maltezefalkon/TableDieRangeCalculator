---
name: trad-rpg-dice-ranges
description: Calculates accurate, contiguous dice ranges for weighted random-table entries against any dice notation (d100, d%, d20, 3d6, 8d20, etc.) - not just simple flat percentile tables. Use this skill whenever generating a random table, encounter table, weighted loot/treasure table, reaction table, or any OSR/Gygaxian/trad-RPG-style table where entries need to be mapped to specific die-roll ranges matching their intended probability. Always use this for the underlying dice-range math instead of computing or guessing ranges by hand, even for a simple flat d100 table - naive proportional math (width = weight/total * 100) silently gives wrong odds for non-uniform multi-die distributions like 3d6 or 8d20, where some roll values are far more probable than others.
compatibility: Requires Node.js 18 or later to be installed and available as `node` on PATH.
---

# Trad RPG Dice Ranges

Turns a list of weighted table entries plus a dice expression into the correct, non-overlapping die-roll ranges for each entry - the same job a published RPG book's random table does (`01-05 Goblin, 06-12 Orc, ...`), but computed exactly rather than guessed.

## Why this matters

For a flat die (`d100`, `d20`), splitting a range proportionally to weight is straightforward. For a **multi-die sum** (`3d6`, `8d20`), it is not: those distributions are bell-shaped, not flat, so a roll near the middle (e.g. 10 or 11 on 3d6) is far more probable than a roll near either end (e.g. 3 or 18). Giving an entry "10% of the numeric range" and giving it "10% of the actual probability" are different problems, and only the second one is correct for a random table. This tool solves the second one.

## How to invoke it

Pipe a JSON request to the bundled tool over stdin:

```bash
echo '<JSON request>' | node scripts/dice-ranges/bin/dice-ranges.js
```

(Path is relative to this skill's own directory.) A file path may be passed as an argument instead of piping to stdin, if the request is large enough that an inline command gets unwieldy.

### Request format

```json
{
  "name": "Wandering Monster Table",
  "dice": "3d6",
  "entries": [
    { "entry": "Goblin patrol", "weight": 5 },
    { "entry": "Wild boar", "weight": 3 },
    { "entry": "Nothing", "weight": 10 }
  ]
}
```

- `name` is optional, just a label carried through to the output.
- `dice` is a **single** dice term: `NdX` (`3d6`, `8d20`, `1d4`) or `d%`/`d100`. Combined expressions like `2d6+1d4` or `3d6+2` are **not supported** - don't attempt them; pick a single equivalent die pool instead (e.g. use `4d6` rather than `3d6+1d4` if you need a specific range).
- `entries` weights don't need to be pre-normalized or sum to anything in particular - relative weight is all that matters (a weight of `10` vs `5` vs `1` means the first entry is meant to be twice as likely as the second and ten times as likely as the third, regardless of the absolute numbers used).
- Field name casing doesn't matter (`dice` and `Dice` both work), but the field names themselves must match what's shown above.

### Response format

```json
{
  "Name": "Wandering Monster Table",
  "Dice": "3d6",
  "Min": 3,
  "Max": 18,
  "Ranges": [
    { "Entry": "Wild boar", "Min": 3, "Max": 7, "Range": "3-7", "TargetWeight": 0.167, "AssignedWeight": 0.162 },
    { "Entry": "Nothing", "Min": 8, "Max": 12, "Range": "8-12", "TargetWeight": 0.556, "AssignedWeight": 0.579 },
    { "Entry": "Goblin patrol", "Min": 13, "Max": 18, "Range": "13-18", "TargetWeight": 0.278, "AssignedWeight": 0.259 }
  ]
}
```

Two things about this example are abbreviated for readability, and differ from what you'll actually see:

- **Weights are truncated here.** The real output carries full decimal precision (e.g. `0.1666666666666666666666666667`, not `0.167`). Round them yourself before showing weights to a user; don't expect short values.
- **Entry order is not request order.** The optimizer assigns ranges to whatever ordering best fits the target weights against the die's distribution, so `Ranges` comes back sorted by ascending roll - which for a bell-shaped die generally is *not* the order the entries were submitted in. Read entries out of the response, never by index into the request.

(The real output is also pretty-printed with one field per line rather than one range per line.)

Use the `Range` string directly as the table's roll column - it's already formatted correctly, including percentile conventions (`01-05`, `00` for a roll of 100) when the dice is a single d100/d%.

`TargetWeight` is what was requested; `AssignedWeight` is the true probability the entry actually ended up with. These will rarely match exactly for non-flat dice or when there are many entries relative to the die's range - that's expected, not an error, since ranges must be contiguous whole numbers. If a specific entry's `AssignedWeight` is meaningfully far from its `TargetWeight` (as a rule of thumb, more than a couple percentage points off, or off by a large relative fraction for a low-weight entry), mention this to the user rather than silently presenting the table as an exact match - they may want to adjust weights, choose a different die, or accept the discrepancy.

### One slow case to avoid

A **multi-die** pool (`3d6`, `8d20`, anything that isn't a single die) with **6 to 8 entries** triggers an exhaustive search over every ordering. Cost is (number of entries)! multiplied by the square of how many results the pool can roll, so pool *width* matters as much as entry count.

Narrow pools stay fine throughout - `3d6` with 8 entries is under 30 seconds. Wide pools are where it hurts: `8d20` takes roughly a minute at 6 entries, six minutes at 7, and tens of minutes at 8.

**Nine or more entries is fast again** (a fraction of a second even on `8d20`), because the exhaustive search is skipped above 8. Single dice (`d20`, `d100`) are always fast at any entry count, and five or fewer entries is quick on any pool.

So the combination to watch for is a wide multi-die pool - roughly `4d10`, `8d20`, or anything spanning 50+ possible results - with 6, 7, or 8 entries. If a table lands there, either add entries to reach 9+, use a narrower pool, or warn the user it will take minutes before invoking rather than leaving them waiting on a silent process.

### Errors

A non-zero exit code means the request failed - the process's output (on either stream) is a plain-text explanation, not JSON. Common causes: `dice` missing or unparseable, `entries` missing/empty, or more entries than the die has possible results (e.g. 30 entries on a d20 - a die pool with a wider range, or fewer entries, is needed).

## What to do with the result

This skill only computes ranges - it does not produce prose, table titles, flavor text, or Homebrewery/Markdown formatting. Combine its output with whatever's driving the actual table content (e.g. a separate OSR/Gygaxian content-generation skill) to produce the finished table.
