using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public class DiceRange<TEntry>
    {
        public static string Nil = "-";

        protected internal DiceRange(TEntry entry)
        {
            Entry = entry;
        }

        public TEntry Entry { get; }
        public int MinRoll { get; set; }
        public int MaxRoll { get; set; }
        public decimal AssignedWeight { get; set; }
        public decimal TargetWeight { get; set; }
        public virtual string WriteRange()
        {
            if (MinRoll == 0 && MaxRoll == 0)
            {
                return Nil;
            }
            else if (MinRoll == MaxRoll)
            {
                return MinRoll.ToString();
            }
            else
            {
                return $"{MinRoll}-{MaxRoll}";
            }
        }
    }
}
