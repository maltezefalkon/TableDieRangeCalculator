#!/usr/bin/env bash
# Rebuilds TableDieRangeCalculator, vendors the fresh build into the
# trad-rpg-dice-ranges skill package, and repackages it as an installable
# .skill archive. Run this any time the C# project changes and you want the
# skill's bundled binary to reflect it.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLISH_DIR="$REPO_DIR/publish"
SKILL_DIR="$REPO_DIR/skill/trad-rpg-dice-ranges"
VENDOR_DIR="$SKILL_DIR/scripts/dice-ranges"

echo "== Publishing TableDieRangeCalculator (Release) =="
rm -rf "$PUBLISH_DIR"
dotnet publish "$REPO_DIR/TableDieRangeCalculator.csproj" -c Release -o "$PUBLISH_DIR"

echo "== Vendoring build into skill package =="
mkdir -p "$VENDOR_DIR"
cp "$PUBLISH_DIR/TableDieRangeCalculator.dll" "$VENDOR_DIR/"
cp "$PUBLISH_DIR/TableDieRangeCalculator.deps.json" "$VENDOR_DIR/"
cp "$PUBLISH_DIR/TableDieRangeCalculator.runtimeconfig.json" "$VENDOR_DIR/"

echo "== Smoke-testing the vendored build =="
echo '{"dice":"d20","entries":[{"entry":"A","weight":1},{"entry":"B","weight":1}]}' \
  | dotnet "$VENDOR_DIR/TableDieRangeCalculator.dll" > /dev/null
echo "OK"

echo "== Packaging .skill archive =="
python "$REPO_DIR/skill/package_skill.py" "$SKILL_DIR"

echo
echo "Done. Reinstall via 'Save skill' if this skill is already installed -"
echo "republishing does not update an already-installed copy automatically."
