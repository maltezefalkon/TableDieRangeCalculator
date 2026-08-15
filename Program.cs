using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace TableDieRangeCalculator;

public class Program
{
    public static int Main(string[] args)
    {
        Stream? inputStream;
        try
        {
            if (args.Length == 1)
            {
                inputStream = File.OpenRead(args[0]);
            }
            else
            {
                inputStream = Console.OpenStandardInput();
            }
            JsonSerializerOptions inputOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            };
            InputTableDto inputTable = JsonSerializer.Deserialize<InputTableDto>(inputStream, inputOptions)
                ?? throw new ArgumentException("Failed to deserialize JSON");

            // Case-insensitive matching means a field simply being absent from the input
            // still leaves it null - fail clearly here rather than letting that null flow
            // into unrelated code (e.g. a regex match) and surface as a confusing error
            // from somewhere that gives no hint the actual problem was a missing field.
            if (string.IsNullOrWhiteSpace(inputTable.Dice))
            {
                throw new ArgumentException("Input JSON is missing a required 'dice' field (e.g. \"3d6\", \"d%\").");
            }
            if (inputTable.Entries is null || inputTable.Entries.Length == 0)
            {
                throw new ArgumentException("Input JSON is missing a required, non-empty 'entries' array.");
            }

            using StreamWriter writer = new StreamWriter(Console.OpenStandardOutput());
            Dice dice = new Dice(inputTable.Dice);
            DiceTable<InputTableEntryDto> outputTable = inputTable.Entries.MakeTable(dice, t => t.Weight);
            writer.WriteLine(outputTable.ToJson(inputTable.Name));
        }
        catch (Exception x)
        {
            Console.WriteLine(x.Message);
            return -1;
        }
        return 0;
    }

    private static void RenderTable<TEntry>(TextWriter writer, IDictionary<TEntry, DiceRange<TEntry>> table, string title, string rollHeader, string? entryHeader = null, bool percentileFormatting = false, bool showTargetVsActual = true) where TEntry : notnull, IEquatable<TEntry>
    {
        // table title
        writer.WriteLine(title);
        writer.WriteLine(new string('-', title.Length));
        writer.WriteLine();
        string resolvedEntryHeader = entryHeader ?? typeof(TEntry).Name;
        string targetWeightColumnHeader = "Target Weight";
        string assignedWeightColumnHeader = "Assigned Weight";
        int rollColumnWidth = 20;
        int entryColumnWidth = 50;
        int targetWeightColumnWidth = 20;
        int assignedWeightColumnWidth = 20;
        int[] widths = new int[] { rollColumnWidth, entryColumnWidth, targetWeightColumnWidth, assignedWeightColumnWidth };
        WriteColumns(writer, new string[] { rollHeader, resolvedEntryHeader, targetWeightColumnHeader, assignedWeightColumnHeader }, widths);
        WriteColumns(writer, new string[] { new string('-', rollHeader.Length), new string('-', resolvedEntryHeader.Length), new string('-', targetWeightColumnHeader.Length), new string('-', assignedWeightColumnHeader.Length) }, widths);
        foreach (TEntry key in table.Keys)
        {
            WriteColumns(writer, new string[] { table[key].WriteRange(), key?.ToString() ?? "", $"{table[key].TargetWeight:0.000}", $"{table[key].AssignedWeight:0.000}" }, widths);
        }
    }

    private static void WriteColumns(TextWriter writer, string[] strings, int[] ints)
    {
        Debug.Assert(strings.Length == ints.Length);
        for (int i = 0; i < strings.Length; i++)
        {
            WriteColumn(writer, strings[i], ints[i]);
            if (i < strings.Length - 1)
            {
                writer.Write("  ");
            }
        }
        writer.WriteLine();
    }

    private static void WriteColumn(TextWriter writer, string text, int width)
    {
        writer.Write("{0,-" + width.ToString() + "}", text.Truncate(width));
    }
}