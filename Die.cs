using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public class Die
    {
        private static Dictionary<string, Die> _dice = new Dictionary<string, Die>();

        public static Die d2 = new Die(1, 2, nameof(d2));
        public static Die d3 = new Die(1, 3, nameof(d3));
        public static Die d4 = new Die(1, 4, nameof(d4));
        public static Die d6 = new Die(1, 6, nameof(d6));
        public static Die d8 = new Die(1, 8, nameof(d8));
        public static Die d10 = new Die(1, 10, nameof(d10));
        public static Die d12 = new Die(1, 12, nameof(d12));
        public static Die d16 = new Die(1, 16, nameof(d16));
        public static Die d20 = new Die(1, 20, nameof(d20));
        public static Die d24 = new Die(1, 24, nameof(d24));
        public static Die d30 = new Die(1, 30, nameof(d30));
        public static Die d100 = new Die(1, 100, nameof(d100));
        public static Die d1000 = new Die(1, 1000, nameof(d1000));
        
        public static Die GetDie(string name)
        {
            if (string.Equals(name, "d%", StringComparison.OrdinalIgnoreCase))
            {
                return d100;
            }
            else
            {
                return _dice[name];
            }
        }

        public Die(int sides)
        {
            MinRoll = 1;
            MaxRoll = sides;
            Name = $"d{sides}";
        }

        private Die(int minRoll, int maxRoll, string name)
        {
            MinRoll = minRoll; 
            MaxRoll = maxRoll;
            Name = name;
            _dice.Add(name, this);
        }

        public int MinRoll { get; }
        public int MaxRoll { get; }
        public string Name { get; }
        public int Sides => MaxRoll - MinRoll + 1;
        public IEnumerable<int> Faces => Enumerable.Range(MinRoll, MaxRoll);
        public decimal FaceProbability => 1m / Sides;
        
        public string GetHeader()
        {
            return GetHeader(MinRoll, MaxRoll);
        }

        public static string GetHeader(int minRoll, int maxRoll)
        {
            Die? found = _dice.Values.SingleOrDefault(d => d.MinRoll == minRoll && d.MaxRoll == maxRoll);
            if (found != null)
            {
                return found.Name + " Roll";
            }
            else if (minRoll == 1)
            {
                return "d" + maxRoll.ToString() + " Roll";
            }
            else
            {
                return "Roll";
            }
        }

        public static implicit operator Dice(Die die)
        {
            return new Dice(die);
        }
    }
}
