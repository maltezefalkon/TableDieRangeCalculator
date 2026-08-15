using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public class PercentileDiceRange<TEntry> : DiceRange<TEntry>
    {
        public static string DoubleZero = "00";

        protected internal PercentileDiceRange(TEntry entry)
            : base(entry)
        {
        }

        public override string WriteRange()
        {
            if (MinRoll == 0 && MaxRoll == 0)
            {
                return base.WriteRange();
            }
            else if (MinRoll == MaxRoll)
            {
                if (MinRoll == 100)
                {
                    return DoubleZero;
                }
                else
                {
                    return $"{MinRoll:00}";
                }
            }
            else
            {
                if (MaxRoll == 100)
                {
                    return $"{MinRoll:00}-{DoubleZero}";
                }
                else
                {
                    return $"{MinRoll:00}-{MaxRoll:00}";
                }
            }
        }
    }
}
