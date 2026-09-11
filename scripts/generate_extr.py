#!/usr/bin/env python3
"""Add natural Turkish full-sentence translations (exTr) via offline Argos + gloss stitching."""
from __future__ import annotations

import json
import re
from pathlib import Path

import argostranslate.translate

ROOT = Path(__file__).resolve().parents[1]
VOCAB = ROOT / "src" / "data" / "vocab.json"
CACHE = Path(__file__).with_name("extr_cache.json")
CURATED = Path(__file__).with_name("curated_extr.json")

# High-quality overrides keyed by English example sentence
OVERRIDES: dict[str, str] = {
    "Before we dive into the agenda, let me share a bit about me.": "Gündeme geçmeden önce biraz kendimden bahsedeyim.",
    "We're wrapping up early on Friday — any plans for the weekend?": "Cuma günü işi erken bitiriyoruz — hafta sonu planın var mı?",
    "She's a hands-on manager who still reviews critical PRs.": "Kritik PR'ları hâlâ gözden geçiren, işin içinde bir yönetici.",
    "The design looks clean; that said, accessibility still needs work.": "Tasarım temiz görünüyor; yine de erişilebilirlik üzerinde çalışmak gerekiyor.",
    "After the keynote we joined a breakout session on hiring.": "Ana konuşmadan sonra işe alım üzerine bir ara oturuma katıldık.",
    "That was a crafty workaround until the real fix ships.": "Asıl düzeltme gelene kadar kurnazca bir geçici çözümdü.",
    "Meditation practice sharpened her consciousness of stress.": "Meditasyon pratiği, stres bilincini keskinleştirdi.",
    "We took the railway into the city to avoid traffic.": "Trafikten kaçmak için şehre trenle gittik.",
    "It is vain to expect zero bugs after a rewrite.": "Yeniden yazımdan sonra sıfır hata beklemek nafile.",
}


def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def polish(tr: str) -> str:
    tr = re.sub(r"\s+", " ", tr).strip()
    tr = tr.replace(" ,", ",").replace(" .", ".")
    tr = tr.replace(" ;", ";").replace(" :", ":")
    # Mild Argos quirk fixes
    tr = tr.replace("PR'lar", "PR'lar")
    return tr


def clean_en(en: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()


def stitch_gloss(ex_tr: str, en: str, tr: str) -> str:
    """If Argos translated the target phrase oddly, prefer the curated gloss."""
    phrase = clean_en(en)
    if not phrase or not tr:
        return ex_tr
    # Translate phrase alone to find what Argos put in the sentence
    try:
        mt_phrase = argostranslate.translate.translate(phrase, "en", "tr").strip()
    except Exception:
        return ex_tr
    if not mt_phrase or len(mt_phrase) < 2:
        return ex_tr
    # Prefer replacing machine phrase with curated gloss (case-insensitive)
    pattern = re.compile(re.escape(mt_phrase), flags=re.I)
    if pattern.search(ex_tr):
        return pattern.sub(tr, ex_tr, count=1)
    return ex_tr


def main() -> None:
    items = json.loads(VOCAB.read_text(encoding="utf-8"))
    curated: dict[str, str] = load_json(CURATED, {})
    curated.update(OVERRIDES)

    cache: dict[str, str] = {}
    # drop empty/failed previous cache entries; rebuild with Argos
    old = load_json(CACHE, {})
    for k, v in old.items():
        if isinstance(v, str) and v.strip():
            cache[k] = v

    uniq = list(dict.fromkeys(it["ex"] for it in items))
    print(f"items={len(items)} unique_ex={len(uniq)} cached={len(cache)} curated={len(curated)}")

    for i, ex in enumerate(uniq, 1):
        if ex in curated:
            cache[ex] = polish(curated[ex])
            continue
        if ex in cache and cache[ex].strip():
            continue
        try:
            out = argostranslate.translate.translate(ex, "en", "tr")
            cache[ex] = polish(out)
        except Exception as e:
            print(f"FAIL [{i}]: {e} :: {ex[:70]}")
            cache[ex] = ""
        if i % 100 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"  progress {i}/{len(uniq)}")

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    failed = 0
    for it in items:
        ex = it["ex"]
        en = it["en"]
        tr = it["tr"]
        if ex in curated:
            it["exTr"] = polish(curated[ex])
        elif cache.get(ex):
            it["exTr"] = polish(stitch_gloss(cache[ex], en, tr))
        else:
            # last resort: frame the gloss in a short sentence
            it["exTr"] = f"Bu cümlede «{tr}» anlamında kullanılıyor."
            failed += 1

    VOCAB.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} with exTr (fallback={failed})")
    # sample
    for it in items[:3]:
        print("---")
        print("EN:", it["ex"])
        print("TR:", it["exTr"])


if __name__ == "__main__":
    main()
