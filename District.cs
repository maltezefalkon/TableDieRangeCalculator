using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator;

public class District : IEquatable<District>
{
    public District(string name, DistrictStatus status, DistrictSetting settlementType)
    {
        Name = name;
        Status = status;
        SettlementType = settlementType;
    }

    public string Name { get; }
    public DistrictStatus Status { get; }
    public DistrictSetting SettlementType { get; }  

    public static IEnumerable<District> GetAll()
    {
        foreach (DistrictStatus wealth in Enum.GetValues<DistrictStatus>())
        {
            foreach (DistrictSetting settlementType in Enum.GetValues<DistrictSetting>())
            {
                if (wealth != DistrictStatus.Unknown && settlementType != DistrictSetting.Unknown)
                {
                    yield return new District($"{wealth} {settlementType}", wealth, settlementType);
                }
            }
        }
    }

    public override string ToString()
    {
        return $"{Status} {SettlementType}";
    }

    public bool Equals(District? other)
    {
        return other is not null && Status.Equals(other.Status) && SettlementType.Equals(other.SettlementType);
    }
}
