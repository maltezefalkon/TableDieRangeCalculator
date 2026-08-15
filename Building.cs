using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TableDieRangeCalculator;

public class Building : IEquatable<Building>
{
    public enum BuildingRarity
    {
        Common,
        Uncommon,
        Rare
    }

    static Dictionary<BuildingRarity, float> weightings = new()
    {
        { BuildingRarity.Common, 7f },
        { BuildingRarity.Uncommon, 5f },
        { BuildingRarity.Rare, 2f },
    };

    public Building(string name, BuildingRarity rarity, DistrictSetting[] applicableSettlementTypes, DistrictStatus[] applicableStatuses)
    {
        Name = name;
        Weight = weightings[rarity];
        Rarity = rarity;
        ApplicableSettlementTypes = applicableSettlementTypes;
        ApplicableStatuses = applicableStatuses;
    }

    public float Weight { get; }
    public string Name { get; }
    public BuildingRarity Rarity { get; }
    public DistrictStatus[] ApplicableStatuses { get; }
    public DistrictSetting[] ApplicableSettlementTypes { get; }
    public override string ToString()
    {
        return Name;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Name);
    }

    public override bool Equals(object? obj)
    {
        if (obj is Building b)
        {
            return Equals(b);
        }
        return false;
    }

    public static IEnumerable<Building> GetAll()
    {
        yield return new Building("Apothecary / Herbalist", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Armorer's Shop", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Armory", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Artist’s Studio", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Asylum", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Auction House", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Bakery", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Bank / Money Changer", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Barber", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Barracks", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Basket Weaver", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Poor });
        yield return new Building("Bathhouse", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Blacksmith", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate });
        yield return new Building("Boarding House", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Bookbinder", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Bowyer / Fletcher", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Brewery", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Brothel", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Butcher", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Candle Maker", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Carpenter / Woodworker", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Cartwright / Wheelwright / Carriagemaker", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Cheesemonger", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Clothier", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Cobbler / Shoemaker", BuildingRarity.Common, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Confectioner / Candy Shop", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Cooper / Barrelmaker", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Courier / Messenger’s Office", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Courthouse", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Curio shop", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Distillery", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Doctor / Healer", BuildingRarity.Rare, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Engraver", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Fighting Pit", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Fishmonger", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Flour Mill", BuildingRarity.Common, new[] { DistrictSetting.Village }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Fortune Teller", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Gaming Parlor", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("General Goods Store", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Glassblower / Glazier", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Goldsmith / Silversmith", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Granary", BuildingRarity.Uncommon, new[] { DistrictSetting.Village }, new[] { DistrictStatus.Poor });
        yield return new Building("Greengrocer / Farm Stand", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Guildhall", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Haberdashery", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Harbormaster", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate });
        yield return new Building("Hospital", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Inn / Tavern", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Jeweler", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Leatherworker", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Library / Archive", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Mapmaker", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Monastery", BuildingRarity.Rare, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Masonry shop", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Meadery", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Museum", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Music Store / Instrument Maker", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Observatory", BuildingRarity.Rare, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Orphanage", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Paper Maker", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Pawn Shop", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Perfumer", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Pet Store / Exotic Animals", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Pottery Shop / Studio", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Prison / Jail", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Puppet Theater", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Restaurant / Eatery", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Rug Merchant", BuildingRarity.Uncommon, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("School / Lecture Hall", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Ship Chandlery", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Shipyard", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Silversmith", BuildingRarity.Rare, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Slaughterhouse", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Smokehouse", BuildingRarity.Common, new[] { DistrictSetting.Village }, new[] { DistrictStatus.Poor });
        yield return new Building("Soap Maker", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Spice Merchant", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Stables", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Street Food Stall", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Tailor / Seamstress", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Tannery", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Tattoo Parlor", BuildingRarity.Rare, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Tax Collector Office", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Tea House", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Temple", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Theater", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
        yield return new Building("Tinker / Tinsmith", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor });
        yield return new Building("Tool / Hardware store", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Town Hall / Palace", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Undertaker’s Office", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Warehouse", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Watchtower", BuildingRarity.Uncommon, new[] { DistrictSetting.Village, DistrictSetting.Town }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate });
        yield return new Building("Weapon Shop", BuildingRarity.Uncommon, new[] { DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Weaver's shop", BuildingRarity.Common, new[] { DistrictSetting.Village, DistrictSetting.Town, DistrictSetting.City }, new[] { DistrictStatus.Poor, DistrictStatus.Moderate, DistrictStatus.Wealthy });
        yield return new Building("Wine Merchant", BuildingRarity.Rare, new[] { DistrictSetting.City }, new[] { DistrictStatus.Wealthy });
    }

    public bool Equals(Building? other)
    {
        if (other is null)
        {
            return false;
        }
        return other.Name == Name;
    }
}
