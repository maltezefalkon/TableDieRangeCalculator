using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public record InputTableDto(string Name, string Dice, InputTableEntryDto[] Entries);

    public record InputTableEntryDto(string Entry, decimal Weight)
    {
        public override string ToString()
        {
            return Entry;
        }
    }
}
