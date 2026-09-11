#!/usr/bin/env python3
"""Regenerate src/data/vocab.json from vocab_slim + curated examples + morph tips."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/workspace/vocab_slim.json")
OUT = ROOT / "src" / "data" / "vocab.json"
CURATED_PATH = Path(__file__).with_name("curated_examples.json")
MORPH_PATH = Path(__file__).with_name("morph_tips.json")

BANNED = (
    "At the start of the meeting I said",
    "On a Friday call I asked",
    "When we first met, I used",
    "Her story showed why",
    "I finally understood what",
    "On the call I said,",
)


def clean(en: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()


def ensure(en: str, sentence: str) -> str:
    base = clean(en)
    if en in sentence or base in sentence:
        return sentence
    m = re.search(re.escape(en), sentence, flags=re.I)
    if m:
        # preserve existing capitalization in the sentence
        return sentence
    if base != en and re.search(re.escape(base), sentence, flags=re.I):
        return sentence
    return f"You'll hear {en} in real conversations."


def main() -> None:
    curated: dict[str, str] = json.loads(CURATED_PATH.read_text(encoding="utf-8"))
    morph_map: dict[str, str] = {}
    if MORPH_PATH.exists():
        morph_map = json.loads(MORPH_PATH.read_text(encoding="utf-8"))

    items = json.loads(SRC.read_text(encoding="utf-8"))
    out = []
    missing = 0
    for it in items:
        en = it["en"].strip()
        tr = it["tr"].strip()
        theme = it["t"]
        day = it["d"]
        ex = curated.get(en)
        if not ex:
            for k, v in curated.items():
                if k.lower() == en.lower():
                    ex = v
                    break
        if not ex:
            missing += 1
            ex = f"You'll hear {en} in real conversations."
        ex = re.sub(r"\s+", " ", ex).strip()
        if any(b in ex for b in BANNED):
            ex = f"People use {en} naturally in everyday speech."
        ex = ensure(en, ex)
        row = {"d": day, "t": theme, "en": en, "tr": tr, "ex": ex}
        tip = morph_map.get(en)
        if not tip:
            for k, v in morph_map.items():
                if k.lower() == en.lower():
                    tip = v
                    break
        if tip:
            row["morph"] = tip
        out.append(row)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(out)} → {OUT} (missing_curated={missing}, morph={sum(1 for x in out if 'morph' in x)})")


if __name__ == "__main__":
    main()
