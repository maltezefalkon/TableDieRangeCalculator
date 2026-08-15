using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net.Security;
using System.Reflection.Metadata.Ecma335;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace TableDieRangeCalculator
{
    public class Dice : IEnumerable<Die>
    {
        private static Regex _regex = new Regex(@"(?'quantity'\d+)?d(?'sides'\d+|%)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private Die[] _dice;

        public Dice(string dieString)
        {
            List<Die> dice = new List<Die>();
            int modifier = 0;
            foreach (string term in dieString.Split('+'))
            {
                string clean = term.Replace(" ", "");
                Match m = _regex.Match(clean);

                // Match() finds the pattern ANYWHERE in the string, not just at the
                // start - "3d6-2" would otherwise "successfully" match just the "3d6"
                // part and silently drop the "-2" instead of rejecting the term, which
                // is worse than failing loudly: it returns a confidently wrong die pool
                // with no indication anything was ignored. Require the match to consume
                // the entire term before accepting it as a dice group.
                bool isWholeTermDiceGroup = m.Success && m.Index == 0 && m.Length == clean.Length;

                if (!isWholeTermDiceGroup)
                {
                    if (int.TryParse(clean, out int mod))
                    {
                        modifier += mod;
                    }
                    else
                    {
                        throw new ArgumentException($"Failed to parse die string term: '{term}'");
                    }
                }
                else
                {
                    int qty = int.Parse(m.Groups["quantity"].Success ? m.Groups["quantity"].Value : "1");
                    string sideStr = m.Groups["sides"].Value;
                    for (int i = 0; i < qty; i++)
                    {
                        dice.Add(Die.GetDie("d" + sideStr));
                    }
                }
            }
            _dice = dice.ToArray();
            MinRoll = _dice.Sum(d => d.MinRoll) + modifier;
            MaxRoll = _dice.Sum(d => d.MaxRoll) + modifier;
            Modifier = modifier;
        }

        public Dice(params Die[] dice)
        {
            _dice = dice;
            MinRoll = _dice.Sum(d => d.MinRoll);
            MaxRoll = _dice.Sum(d => d.MaxRoll);
            Modifier = 0;
        }

        public Dice(params Dice[] dice)
        {
            _dice = dice.SelectMany(d => d._dice).ToArray();
            MinRoll = _dice.Sum(d => d.MinRoll) + dice.Sum(d => d.Modifier);
            MaxRoll = _dice.Sum(d => d.MaxRoll) + dice.Sum(d => d.Modifier);
            Modifier = dice.Sum(d => d.Modifier);
        }

        public DiceRange<TEntry> Range<TEntry>(TEntry entry)
        {
            if (IsPercentile())
            {
                return new PercentileDiceRange<TEntry>(entry);
            }
            else
            {
                return new DiceRange<TEntry>(entry);
            }
        }

        public int MinRoll { get; }
        public int MaxRoll { get; }
        public int Modifier { get; }

        protected bool IsPercentile()
        {
            return MinRoll == 1 && MaxRoll == 100 && _dice.Length == 1 && Modifier == 0;
        }

        public IDictionary<int, decimal> GetDistribution()
        {
            // Start the offset at the flat modifier, not 0 - every key this method
            // returns must land in [MinRoll, MaxRoll] (which already include the
            // modifier), or callers indexing by MinRoll/MaxRoll (the DP, prefix sums,
            // backtracking) will look up keys that don't exist.
            int offset = Modifier;
            long[] dist = { 1L }; // rolling zero dice sums to 0 in exactly one way

            foreach (Die die in _dice)
            {
                // prefix sums of the current distribution, so each new cell is an O(1) window lookup
                long[] prefix = new long[dist.Length + 1];
                for (int i = 0; i < dist.Length; i++)
                {
                    prefix[i + 1] = prefix[i] + dist[i];
                }

                int sides = die.Sides;
                int newLength = dist.Length + sides - 1;
                long[] next = new long[newLength];
                for (int i = 0; i < newLength; i++)
                {
                    int hi = Math.Min(i, dist.Length - 1);
                    int lo = Math.Max(i - sides + 1, 0);
                    if (hi >= lo)
                    {
                        next[i] = prefix[hi + 1] - prefix[lo];
                    }
                }

                dist = next;
                offset += die.MinRoll;
            }

            long total = dist.Sum();
            var result = new Dictionary<int, decimal>(dist.Length);
            for (int i = 0; i < dist.Length; i++)
            {
                result[offset + i] = (decimal)dist[i] / total;
            }
            return result;
        }

        public IEnumerator<Die> GetEnumerator()
        {
            return ((IEnumerable<Die>)_dice).GetEnumerator();
        }

        public string GetHeader()
        {
            return ToString();
        }

        public override string ToString()
        {
            if (Modifier != 0)
            {
                return InnerToString() + " + " + Modifier.ToString();
            }
            else
            {
                return InnerToString();
            }
            // inner method
            string InnerToString()
            {
                var singleName = _dice.Select(d => d.Name).Distinct().SafeSingleOrDefault();
                if (singleName == null)
                {
                    string[] names = _dice.Select(d => d.Name).Distinct().ToArray();
                    var groups = names.Select(n => (Name: n, Count: _dice.Count(d => d.Name.Equals(n))));
                    return string.Join('+', groups.Select(x => x.Count == 1 ? x.Name : $"{x.Count}{x.Name}"));
                }
                else if (_dice.Count() == 1)
                {
                    return singleName;
                }
                else
                {
                    return $"{_dice.Count()}{singleName}";
                }
            }
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return GetEnumerator();
        }
    }
}
