using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public static class Extensions
    {
        public static T SelectRandom<T>(this IEnumerable<T> items)
        {
            int randomIndex = (int)(items.Count() * Random.Shared.NextSingle());
            return items.Skip(randomIndex).Take(1).Single();
        }

        public static IEnumerable<IEnumerable<T>> CartesianProduct<T>(this IEnumerable<IEnumerable<T>> sequences)
        {
            IEnumerable<IEnumerable<T>> emptyProduct = new[] { Enumerable.Empty<T>() };
            return sequences.Aggregate(
                emptyProduct,
                (accumulator, sequence) =>
                    accumulator.SelectMany(acc => sequence,
                    (innerAccumulator, item) => innerAccumulator.Concat(new[] { item }))
                );
        }

        public static IEnumerable<IEnumerable<T>> Permute<T>(this IEnumerable<T> sequence)
        {
            if (sequence == null) throw new ArgumentNullException(nameof(sequence));
            if (sequence.Count() <= 1) return new List<IEnumerable<T>>() { sequence };
            List<List<T>> ret = new List<List<T>>();
            foreach (var item in sequence)
            {
                var remaining = new List<T>(sequence.Where(x => !object.Equals(x, item)));
                foreach (var permuted in remaining.Permute())
                {
                    List<T> list = new List<T>(permuted);
                    list.Add(item);
                    ret.Add(list);
                }
            }
            return ret;
        }

        public static string? Truncate(this string? text, int length)
        {
            if (text is null) return null;
            if (text.Length > length) return text.Substring(0, length);
            return text;
        }

        public static T? SafeSingleOrDefault<T>(this IEnumerable<T> list)
        {
            if (list.Count() == 1)
            {
                return list.Single();
            }
            else
            {
                return default(T?);
            }
        }

        public static DiceTable<T> MakeTable<T>(this IEnumerable<T> entries, Dice dice, Func<T, decimal> weightFunction)
            where T : IEquatable<T>
        {
            return new DiceTable<T>(entries, weightFunction, dice);
        }
    }
}
