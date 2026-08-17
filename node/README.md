# dice-ranges (Node port)

A Node.js port of TableDieRangeCalculator. Same algorithm, same input and output
formats, no .NET runtime required.

## Usage

```bash
echo '{"dice":"3d6","entries":[{"entry":"Goblin","weight":5},{"entry":"Nothing","weight":10}]}' | node bin/dice-ranges.js
```

A file path may be passed as the single argument instead of piping to stdin.
Exit code is 0 on success and -1 on failure, with a plain-text message on stdout.

## Fidelity to the .NET original

Output is **byte-identical** to `dotnet publish/TableDieRangeCalculator.dll` for
successful runs and for the error paths the original raises itself. `npm test`
includes a differential test that asserts this across a matrix of dice
expressions, weight distributions and malformed requests.

That reference build is gitignored, so the differential test skips itself until
you produce it:

```bash
dotnet publish ../TableDieRangeCalculator.csproj -c Release -o ../publish
```

Three things had to be reproduced rather than approximated, because they are all
visible in the output bytes:

- **`System.Decimal` arithmetic** (`src/decimal.js`). Weights print with all 28
  decimal places, and those digits carry the accumulated rounding of summing
  individually-rounded quotients — 125/216 prints as `0.5787037037037037037037037036`,
  one ulp below the exactly-rounded value. Doubles cannot produce that. Decimal
  exactness also matters *before* output: the dynamic-programming search keeps a
  split only on strict improvement, so ties that are exact in decimal must stay
  exact or a different (still optimal, but different) table wins.
- **`System.Text.Json` encoding** (`src/netJson.js`). The default encoder escapes
  more than the JSON spec requires — non-ASCII plus `&`, `'`, `+`, `<`, `>` and
  `` ` `` — as uppercase `\uXXXX`, and indented output breaks lines with
  `Environment.NewLine` (CRLF on Windows).
- **Number literals from the request** (`src/jsonReader.js`). System.Text.Json
  binds a weight straight from its literal text into a decimal, so `1.50` keeps
  its scale and prints back as `1.50`. Routing it through a JS double first would
  lose both the scale and any digits past the 15th, so this reads JSON with number
  literals preserved as text.

### Known differences

- Errors raised by the runtime rather than the calculator differ in wording: a
  missing input file reports Node's `ENOENT ...` instead of .NET's
  `Could not find file '...'`, and malformed JSON reports this reader's message
  instead of System.Text.Json's.
- Big tables are slower, by roughly 5×, because the search runs on BigInt decimals
  rather than a hardware decimal type. For everyday sizes (any single die, a few
  dozen entries) this port matches or beats the .NET build once .NET's startup is
  counted — d100 with 12 entries is ~0.18s here against ~0.22s there.

  The case where 5× actually hurts is inherited from the original algorithm rather
  than introduced by the port: a **multi-die pool with 6-8 entries** takes the
  brute-force ordering path, solving the full dynamic program once per m!
  orderings. Total cost is m! x (outcome count)², so it is driven as much by how
  *wide* the pool is as by entry count. Measured on `8d20` (153 outcomes), Node:

  | Entries | Time | | Narrow pool, 8 entries | Time |
  | --- | --- | --- | --- | --- |
  | 4 | 1.2s | | `3d6` (16 outcomes), .NET | 5.3s |
  | 5 | 6.5s | | `3d6`, Node | 28s |
  | 6 | 45s | | `2d10` (19 outcomes), .NET | 7.3s |
  | 7 | 374s | | `2d10`, Node | 38s |
  | 8 | ~40 min | | | |

  Nine or more entries falls through to the zig-zag heuristic and is fast again
  (sub-second even on `8d20`); single dice are always fast at any entry count.

  `MAX_BRUTE_FORCE_ENTRIES` is a count-only guard, so it cannot distinguish `3d6`
  at 8 entries (28s, worth it) from `8d20` at 8 entries (~40 min, not). Gating on
  the actual m! x outcomes² work estimate instead would fix that; it has not been
  done, since it would change which tables get the provably-optimal ordering and
  would need a matching change in the C# to preserve differential parity.

## Layout

| Path | C# counterpart |
| --- | --- |
| `src/die.js` | `Die.cs` |
| `src/dice.js` | `Dice.cs` |
| `src/diceRange.js` | `DiceRange.cs`, `PercentileDiceRange.cs` |
| `src/diceTable.js` | `DiceTable.cs` |
| `src/permute.js` | `Extensions.Permute` |
| `src/inputTable.js` | `InputTableDto.cs` |
| `bin/dice-ranges.js` | `Program.cs` |
| `src/decimal.js`, `src/netJson.js`, `src/jsonReader.js` | .NET BCL behaviour |

## Tests

```bash
npm test
```

`test/dice.test.js`, `test/diceTable.test.js`, `test/diceTableJson.test.js` and
`test/permute.test.js` are direct ports of the xUnit suite in
`TableDieRangeCalculatorTests`. `test/decimal.test.js` pins the BCL behaviours
above against values read off the .NET tool's own output.
