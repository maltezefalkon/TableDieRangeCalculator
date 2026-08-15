using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.PortableExecutable;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public class Temple : IEquatable<Temple>
    {
        public Temple(params string[] names)
        {
            Names = names;
        }

        public string[] Names { get; }
        public decimal Weight { get; set; } = 5m;

        public override string ToString()
        {
            return string.Join("/", Names);
        }

        public static IEnumerable<Temple> GetAll()
        {
            yield return new Temple("Sun", "Law") { Weight = 9m };
            yield return new Temple("Moon", "Secrets") { Weight = 3m };
            yield return new Temple("Love", "Beauty", "Family") { Weight = 6m };
            yield return new Temple("War", "Chaos") { Weight = 5m };
            yield return new Temple("Knowledge", "Craft") { Weight = 5m };
            yield return new Temple("Sea", "Travel") { Weight = 5m };
            yield return new Temple("Harvest", "Nature") { Weight = 11m };
            yield return new Temple("Death", "Magic") { Weight = 2m };
        }

        public bool Equals(Temple? other)
        {
            return other is not null && other.Names.SequenceEqual(Names);
        }

        public int CompareTo(Temple? other)
        {
            if (other is null)
            {
                return 0;
            }
            else 
            {
                return this.ToString().CompareTo(other.ToString());
            }
        }
    }
}

