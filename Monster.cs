using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public class Monster : IEquatable<Monster>
    {
        private static Dictionary<string, Monster> _all = new Dictionary<string, Monster>();
        
        public static IEnumerable<Monster> GetAll() => _all.Values;

        public bool Equals(Monster? other)
        {
            if (ReferenceEquals(null, other)) return false;
            return other.Name == this.Name;
        }

        public static Monster Godzilla = new Monster(nameof(Godzilla), 2m);
        public static Monster Vampire = new Monster(nameof(Vampire), 4m);
        public static Monster Werewolf = new Monster(nameof(Werewolf), 6m);
        public static Monster Tarrasque = new Monster(nameof(Tarrasque), 1m);
        public static Monster RingWraith = new Monster(nameof(RingWraith), 9m);
        public static Monster Xenomorph = new Monster(nameof(Xenomorph), 12m);
        public static Monster Zombie = new Monster(nameof(Zombie), 13m);

        public Monster(string name, decimal rarity)
        {
            Name = name;
            Rarity = rarity;
            _all.Add(name, this);
        }

        public string Name { get; }
        public decimal Rarity { get; }

        public override string ToString()
        {
            return Name;
        }
    }
}
