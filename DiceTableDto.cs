using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator
{
    public record DiceTableDto(string? Name, string Dice, int Min, int Max, DiceRangeDto[] Ranges);

    public record DiceRangeDto(string Entry, int Min, int Max, string Range, decimal TargetWeight, decimal AssignedWeight);
}
