using System;
using System.Collections.Generic;
using System.Formats.Tar;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml;

namespace TableDieRangeCalculator
{
    public class DiceTable<TEntry> : Dictionary<TEntry, DiceRange<TEntry>> where TEntry : IEquatable<TEntry>
    {
        public Dice Dice { get; }

        // Trying every ordering is m! work. 8! = 40,320 (instant), 10! = 3,628,800
        // (a couple seconds) - beyond that it grows too fast to be worth the wait, so
        // larger entry sets fall back to the zig-zag heuristic ordering instead.
        private const int MaxBruteForceEntries = 8;

        public DiceTable(IEnumerable<TEntry> entries, Func<TEntry, decimal> weightingFunction, Dice dice)
        {
            Dice = dice;
            List<DiceRange<TEntry>> list = new List<DiceRange<TEntry>>(entries.Select(entry =>
                {
                    var range = dice.Range(entry);
                    range.TargetWeight = weightingFunction(entry);
                    return range;
                }));
            NormalizeWeights(list, dice);

            Dictionary<int, Dictionary<int, int>> splits;
            if (dice.Count() == 1)
            {
                (splits, _) = DynamicProgrammingOptimal(dice, list);
            }
            // If there's a bell curve involved, then we might need to reorder the
            // list of entries in order to achieve the desired weights.
            else if (list.Count <= MaxBruteForceEntries)
            {
                // Small enough to try every ordering and keep the provably best one.
                (list, splits) = BruteForceAllOrderings(dice, list);
            }
            else
            {
                // Too many entries for m! orderings to be feasible - the zig-zag
                // heuristic (small weights at both ends, large weights in the middle)
                // tends to land close to optimal for a symmetric, unimodal distribution.
                list = ZigZagSort(list);
                (splits, _) = DynamicProgrammingOptimal(dice, list);
            }

            Backtrack(dice, list, splits);
            foreach (DiceRange<TEntry> range in list)
            {
                Add(range.Entry, range);
            }
        }

        // Tries every possible ordering of `list` and keeps whichever one produces the
        // lowest total deviation once DynamicProgrammingOptimal finds its best split -
        // i.e. the provably best fixed-order table achievable for these entries. Only
        // tractable while list.Count! is small (see MaxBruteForceEntries).
        private (List<DiceRange<TEntry>> Ordering, Dictionary<int, Dictionary<int, int>> Split) BruteForceAllOrderings(Dice dice, List<DiceRange<TEntry>> list)
        {
            List<DiceRange<TEntry>> bestOrdering = list;
            Dictionary<int, Dictionary<int, int>>? bestSplit = null;
            decimal bestDeviation = decimal.MaxValue;

            foreach (List<DiceRange<TEntry>> candidateOrdering in list.Permute())
            {
                (Dictionary<int, Dictionary<int, int>> split, decimal totalDeviation) = DynamicProgrammingOptimal(dice, candidateOrdering);
                if (totalDeviation < bestDeviation)
                {
                    bestDeviation = totalDeviation;
                    bestOrdering = candidateOrdering;
                    bestSplit = split;
                }
            }

            // GenerateAllPermutations always yields at least one ordering (list.Count >= 1),
            // so bestSplit is always assigned by the time the loop above finishes.
            return (bestOrdering, bestSplit!);
        }

        private List<DiceRange<TEntry>> ZigZagSort(List<DiceRange<TEntry>> list)
        {
            bool front = true;
            var array = list.OrderBy(r => r.TargetWeight).ToArray();
            var targetArray = new DiceRange<TEntry>[array.Length];
            for (int i = 0; i < array.Length; i++)
            {
                if (front)
                {
                    targetArray[(i / 2)] = array[i];
                    front = false;
                }
                else
                {
                    targetArray[array.Length - ((i + 1) / 2)] = array[i]; 
                    front = true;
                }
            }
            return targetArray.ToList();
        }

        private (Dictionary<int, Dictionary<int, int>> Split, decimal TotalDeviation) DynamicProgrammingOptimal(Dice dice, List<DiceRange<TEntry>> list)
        {
            IDictionary<int, decimal> distribution = dice.GetDistribution();
            if (list.Count > distribution.Count)
            {
                // Can't give every entry its own contiguous, non-empty range if there
                // are more entries than there are possible results to divide up.
                throw new ArgumentException($"{dice} only has {distribution.Count} possible results and cannot be used for a set of {list.Count} entries.");
            }

            var prefixSums = ComputePrefixSums(dice);
            Dictionary<int, Dictionary<int, decimal?>> dp = new Dictionary<int, Dictionary<int, decimal?>>();
            Dictionary<int, Dictionary<int, int>> split = new Dictionary<int, Dictionary<int, int>>();

            // Base case: zero outcomes used for zero entries costs nothing. Every other
            // not-yet-computed state defaults to decimal.MaxValue ("unreachable so far"),
            // but this one specific state must be seeded to 0 up front, or the very first
            // lookup of it treats it as unreachable instead of free.
            dp[0] = new Dictionary<int, decimal?> { { 0, 0m } };

            for (int i = 1; i <= distribution.Count; i++)
            {
                for (int j = 1; j <= Math.Min(i, list.Count); j++)
                {
                    for (int k = j - 1; k <= i-1; k++)
                    {
                        if (!dp.ContainsKey(k)) dp.Add(k, new Dictionary<int, decimal?>());
                        if (!dp[k].ContainsKey(j - 1)) dp[k].Add(j - 1, null);
                        if (dp[k][j - 1] is null)
                        {
                            continue;
                        }
                        else
                        {
                            decimal assignedWeight = prefixSums[i + dice.MinRoll - 1] - (k > 0 ? prefixSums[k + dice.MinRoll - 1] : 0);
                            var deviation = Math.Pow((double)assignedWeight - (double)list[j - 1].TargetWeight, 2f);
                            var cost = dp[k][j - 1] + (decimal)deviation;
                            if (!dp.ContainsKey(i))
                            {
                                dp.Add(i, new Dictionary<int, decimal?>());
                                split.Add(i, new Dictionary<int, int>());
                            }
                            if (!dp[i].ContainsKey(j))
                            {
                                dp[i].Add(j, cost);
                                split[i][j] = k;
                            }
                            else if (cost < dp[i][j])
                            {
                                dp[i][j] = cost;
                                split[i][j] = k;
                            }
                        }
                    }
                }
            }

            // dp[n][m]: the best achievable total deviation using ALL outcomes for ALL
            // entries - the answer to the whole problem, and what callers compare across
            // candidate orderings.
            decimal totalDeviation = dp[distribution.Count][list.Count]
                ?? throw new Exception("Unexpected error calculating deviation");
            return (split, totalDeviation);
        }

        // Recovers each entry's final die-value range from the optimal-split table.
        //
        // DynamicProgrammingOptimal only worked out the SCORE of the best arrangement at
        // every (outcomes-used, entries-placed) checkpoint - split[i][j] is the memory of
        // *where* the boundary was that achieved that score: entries 1..j-1 optimally cover
        // sorted-outcome positions 1..k, and entry j covers positions k+1..i.
        //
        // To reconstruct actual ranges, start from the answer to the WHOLE problem -
        // split[n][m], which tells you where the LAST entry's range begins - then walk
        // backward: once you know entry m's boundary, everything before it is exactly the
        // (m-1)-entry version of the same problem, restricted to fewer outcomes. Repeating
        // that all the way down to entry 1 peels off one entry's range per step.
        private static void Backtrack(Dice dice, List<DiceRange<TEntry>> list, Dictionary<int, Dictionary<int, int>> split)
        {
            IDictionary<int, decimal> distribution = dice.GetDistribution();

            // The die's possible sums in ascending order, e.g. for 3d6: [3, 4, 5, ..., 18].
            // Array index p (0-indexed) is sorted-outcome position (p + 1) (1-indexed) -
            // the convention split[i][j] was built against.
            int[] sortedRollValues = distribution.Keys.OrderBy(v => v).ToArray();

            int totalEntryCount = list.Count;                // m
            int outcomesRemaining = sortedRollValues.Length;  // starts at n: nothing assigned yet

            // Walk entries from LAST to FIRST, shrinking the unresolved region each step.
            for (int entryPosition = totalEntryCount; entryPosition >= 1; entryPosition--)
            {
                // Everything up to (and including) sorted-outcome position "boundaryIndex"
                // belongs to the entries BEFORE this one. Everything after that boundary,
                // through outcomesRemaining, is this entry's range.
                int boundaryIndex = split[outcomesRemaining][entryPosition];

                DiceRange<TEntry> entry = list[entryPosition - 1];
                entry.MinRoll = sortedRollValues[boundaryIndex];         // first value in range
                entry.MaxRoll = sortedRollValues[outcomesRemaining - 1]; // last value in range

                // Now that the entry's final range is known, its real assigned probability
                // is just the distribution mass covered by that range - not something that
                // could be known mid-search, since candidate ranges kept changing.
                decimal assignedWeight = 0m;
                for (int rollValue = entry.MinRoll; rollValue <= entry.MaxRoll; rollValue++)
                {
                    assignedWeight += distribution[rollValue];
                }
                entry.AssignedWeight = assignedWeight;

                // The earlier entries only need to account for outcomes up to the boundary
                // now - that's the smaller subproblem the next loop iteration solves.
                outcomesRemaining = boundaryIndex;
            }

            // Every outcome from the low end through the high end should now be claimed by
            // exactly one entry, with no gaps or overlaps, purely from the DP's structure.
            if (outcomesRemaining != 0)
            {
                throw new InvalidOperationException("Backtracking did not consume every outcome - split table is inconsistent.");
            }
        }

        private static void NormalizeWeights(IEnumerable<DiceRange<TEntry>> ranges, Dice dice)
        {
            int numberOfResults = (dice.MaxRoll - dice.MinRoll + 1);
            decimal totalWeight = ranges.Sum(r => r.TargetWeight);
            if (totalWeight > 0)
            {
                foreach (var range in ranges)
                {
                    range.TargetWeight /= totalWeight;
                }
            }
        }

        public virtual string ToJson(string? name = null)
        {
            DiceTableDto table = new DiceTableDto(
                name,
                Dice.ToString(),
                Dice.MinRoll,
                Dice.MaxRoll,
                this.Select(entry =>
                    new DiceRangeDto(
                        entry.Key?.ToString() ?? string.Empty,
                        entry.Value.MinRoll,
                        entry.Value.MaxRoll,
                        entry.Value.WriteRange(),
                        entry.Value.TargetWeight,
                        entry.Value.AssignedWeight)
                    ).ToArray());
            JsonSerializerOptions options = new JsonSerializerOptions()
            {
                WriteIndented = true
            };
            return JsonSerializer.Serialize(table, options);
        }

        private static IDictionary<int, decimal> ComputePrefixSums(Dice dice)
        {
            IDictionary<int, decimal> rollProbabilities = dice.GetDistribution();
            Dictionary<int, decimal> prefixSums = new Dictionary<int, decimal>();
            bool first = true;
            foreach (int key in rollProbabilities.Keys.OrderBy(k => k))
            {
                if (first)
                {
                    prefixSums[key] = rollProbabilities[key];
                    first = false;
                }
                else
                {
                    prefixSums[key] = prefixSums[key - 1] + rollProbabilities[key];
                }
            }
            return prefixSums;
        }
    }
}
