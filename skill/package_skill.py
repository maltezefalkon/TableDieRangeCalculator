#!/usr/bin/env python3
"""Zips a skill folder into an installable .skill archive.

Usage: python package_skill.py <path-to-skill-folder>

Produces <skill-folder-name>.skill next to the folder itself, containing the
folder's own name as the top-level path inside the archive (matching what the
skill installer expects).
"""
import sys
import zipfile
from pathlib import Path


def package(skill_path: str) -> Path:
    skill_dir = Path(skill_path).resolve()
    if not (skill_dir / "SKILL.md").exists():
        raise SystemExit(f"No SKILL.md found in {skill_dir}")

    output = skill_dir.parent / f"{skill_dir.name}.skill"
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(skill_dir.rglob("*")):
            if file.is_file():
                arcname = Path(skill_dir.name) / file.relative_to(skill_dir)
                zf.write(file, arcname)
                print(f"  Added: {arcname}")

    print(f"Packaged: {output}")
    return output


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: package_skill.py <path-to-skill-folder>")
    package(sys.argv[1])
