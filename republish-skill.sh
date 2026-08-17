#!/usr/bin/env bash
# Runs the Node test suite, vendors the Node implementation into the
# trad-rpg-dice-ranges skill package, and repackages it as an installable
# .skill archive. Run this any time node/ changes and you want the skill's
# bundled copy to reflect it.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$REPO_DIR/node"
SKILL_DIR="$REPO_DIR/skill/trad-rpg-dice-ranges"
VENDOR_DIR="$SKILL_DIR/scripts/dice-ranges"

echo "== Testing =="
# Includes the differential test against publish/TableDieRangeCalculator.dll,
# which skips itself if that build isn't present.
(cd "$NODE_DIR" && node --test test/)

echo "== Vendoring into skill package =="
rm -rf "$VENDOR_DIR"
mkdir -p "$VENDOR_DIR/bin" "$VENDOR_DIR/src"
cp "$NODE_DIR/bin/dice-ranges.js" "$VENDOR_DIR/bin/"
cp "$NODE_DIR"/src/*.js "$VENDOR_DIR/src/"

echo "== Smoke-testing the vendored copy =="
echo '{"dice":"d20","entries":[{"entry":"A","weight":1},{"entry":"B","weight":1}]}' \
  | node "$VENDOR_DIR/bin/dice-ranges.js" > /dev/null
echo "OK"

echo "== Packaging .skill archive =="
python "$REPO_DIR/skill/package_skill.py" "$SKILL_DIR"

echo
echo "Done. Reinstall via 'Save skill' if this skill is already installed -"
echo "republishing does not update an already-installed copy automatically."
