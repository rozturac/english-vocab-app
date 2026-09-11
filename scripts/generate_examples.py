#!/usr/bin/env python3
"""Generate natural English example sentences for vocab items."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/workspace/vocab_slim.json")
OUT = ROOT / "src" / "data" / "vocab.json"

CURATED_PATH = Path(__file__).with_name("curated_examples.json")


def hp(key: str, options: list[str]) -> str:
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return options[h % len(options)]


def art(word: str) -> str:
    return "an" if word[:1].lower() in "aeiou" else "a"


def ensure(en: str, sentence: str) -> str:
    if en in sentence:
        return sentence
    m = re.search(re.escape(en), sentence, flags=re.I)
    if m:
        return sentence[: m.start()] + en + sentence[m.end() :]
    base = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()
    if base != en and re.search(re.escape(base), sentence, flags=re.I):
        return sentence
    return f"{sentence.rstrip('.')} — {en}."


def looks_verb_tr(tr: str) -> bool:
    return bool(re.search(r"(mak|mek)", tr.lower()))


CLAUSE_PREFIXES = (
    "i ", "i'", "i’m", "my ", "we ", "you ", "you're", "you've", "you'll",
    "that's", "that’s", "sorry", "thanks", "thank ", "nice ", "same ", "tell ",
    "what ", "what's", "who ", "how ", "how's", "can ", "could ", "are ", "any ",
    "english ", "feel free", "great to", "have a good", "it ", "let's", "let’s",
    "most ", "outside ", "shout ", "talk soon", "bear with", "catch you",
    "go ahead", "small world", "please ", "net-net", "to be fair", "that said",
    "off the ", "at a ", "heads up", "point taken", "good catch", "top of mind",
    "for what", "moving forward", "just to", "consider it", "same here",
)

VERB_FIRST = {
    "get", "make", "take", "keep", "give", "put", "set", "run", "go", "let",
    "feel", "break", "catch", "call", "send", "share", "check", "follow",
    "reach", "touch", "sync", "loop", "circle", "flag", "push", "raise",
    "move", "drive", "close", "own", "ping", "unblock", "throttle", "align",
    "absorb", "protect", "uplevel", "bounce", "hit", "have", "bring", "build",
    "cut", "dig", "figure", "hand", "hold", "lean", "look", "map", "nail",
    "open", "pair", "park", "pick", "play", "pull", "ramp", "scope", "scrub",
    "ship", "sit", "skip", "slow", "spell", "spin", "spot", "stand", "stay",
    "step", "stick", "surface", "sweep", "tighten", "trade", "triage", "try",
    "turn", "walk", "watch", "weed", "weigh", "work", "wrap", "write", "zoom",
    "level", "land", "kick", "fire", "grow", "fill", "double", "narrow",
    "shore", "show", "deep", "fall", "sleep", "table", "shadow", "manage",
    "influence", "escalate", "sign", "place", "roll", "sow", "suffer",
    "reflect", "game", "span", "consider", "offer", "force", "de-risk",
    "commit", "nail", "iron", "kick", "wrap", "dig", "weed", "shore",
}

NOUN_HINTS = (
    " plan", " path", " rights", " reports", " line", " risk", " function",
    " manager", " loop", " strength", " session", " list", " ladder", " time",
    " attrition", " owner", " control", " management", " health", " hours",
    " project", " spot", " medium", " detail", " responder", " commitments",
    " conversation", " feedback", " expectations", " pattern", " aid",
    " goals", " cover", " design", " concern", " sizing", " myth", " forum",
    " culture", " packet", " score", " bar", " coach", " lane", " noise",
)

PROPER = {
    "jewish": "He is taking a seminar on Jewish history and culture.",
    "christian": "The cathedral tour explained Christian art from the Middle Ages.",
    "muslim": "They visited a historic Muslim quarter on the walking tour.",
    "turkish": "She ordered a classic Turkish breakfast by the Bosphorus.",
    "american": "American football still confuses me on Thanksgiving.",
    "european": "European trains made the weekend trip easy.",
    "british": "British humor shows up a lot in our team chat.",
}


def is_clause(en: str) -> bool:
    low = en.lower().strip()
    if low.endswith("?") or "..." in en:
        return True
    return low.startswith(CLAUSE_PREFIXES)


def is_noun_multi(en: str, tr: str) -> bool:
    low = " " + en.lower()
    if any(h in low for h in NOUN_HINTS):
        return True
    words = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip().split()
    first = words[0].lower() if words else ""
    if first in VERB_FIRST:
        return False
    if not looks_verb_tr(tr) and not is_clause(en):
        return True
    return False


def gen_clause(en: str) -> str:
    if en.rstrip().endswith("?"):
        return hp(
            en,
            [
                f'She smiled and asked, "{en}"',
                f"Quick check-in before the meeting — {en}",
                f'Making small talk, he asked, "{en}"',
            ],
        )
    if "..." in en:
        return hp(
            en,
            [
                f'In the intro round I said, "{en}"',
                f'During onboarding I explained, "{en}"',
            ],
        )
    return hp(
        en,
        [
            f'On the call I said, "{en}."',
            f"I typed in Slack: {en}.",
            f'She replied warmly, "{en}."',
            f'Before hanging up I added, "{en}."',
        ],
    )


def gen_verb_multi(en: str) -> str:
    e = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()
    low = e.lower()
    needs_obj = low.endswith(
        (" on", " for", " to", " with", " by", " of", " in", " off", " up", " out", " across", " through", " from", " into", " about")
    ) or low.endswith((" someone's back", " the miss", " early", " thin"))
    if needs_obj or low.split()[-1] in {"on", "for", "to", "with", "by", "of", "in", "off", "up", "out", "across", "through", "from"}:
        return hp(
            en,
            [
                f"I'll {e} the plan with the team tomorrow.",
                f"Can we {e} this before we decide?",
                f"She asked me to {e} the latest draft.",
                f"We should {e} the risk while it's small.",
            ],
        )
    return hp(
        en,
        [
            f"We need to {e} before the Friday deadline.",
            f"My manager asked me to {e}.",
            f"In the retro we agreed we should {e}.",
            f"I set a reminder to {e} after lunch.",
            f"The playbook says we should {e} early.",
            f"Can you help the team {e} this week?",
        ],
    )


def gen_noun_multi(en: str) -> str:
    return hp(
        en,
        [
            f"We reviewed {en} in yesterday's planning meeting.",
            f"Please add a short note about {en} in the doc.",
            f"Leadership asked for an update on {en}.",
            f"A clear {en} made the launch much smoother.",
            f"There's growing attention on {en} this quarter.",
            f"The hiring packet emphasizes strong {en}.",
            f"We tracked {en} carefully after the incident.",
            f"During the offsite we workshopped our {en}.",
        ],
    )


def gen_single(en: str, tr: str, theme: str) -> str:
    base = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()
    low = base.lower()
    if low in PROPER:
        return PROPER[low]
    if en.isupper() and len(en) <= 5:
        return hp(
            en,
            [
                f"Someone dropped a {en} in the team channel this morning.",
                f"I had to look up what {en} meant in that thread.",
                f"Put {en} on the calendar so nobody schedules over it.",
            ],
        )
    work = any(
        k in theme.lower()
        for k in ["uber", "iş", "slack", "1o1", "em", "perf", "değerlendirme", "günlük", "kalıp"]
    )
    is_v = bool(re.search(r"\(v\.?\)", en, re.I)) or looks_verb_tr(tr)
    is_adj = bool(re.search(r"\(adj\.?\)", en, re.I)) or low.endswith(
        ("ous", "ive", "able", "ible", "ful", "less", "ish", "ent", "ant")
    )
    is_nounish = low.endswith(
        ("tion", "sion", "ness", "ment", "ity", "ance", "ence", "ship", "hood", "ism", "ure", "age")
    )

    if is_v and not is_nounish:
        if work:
            return hp(
                en,
                [
                    f"We need to {base} this before the Friday deadline.",
                    f"Can you help me {base} the remaining tasks?",
                    f"I'd rather {base} now than wait for a bigger issue.",
                    f"The playbook explains how to {base} in this case.",
                    f"She asked the team to {base} and share results.",
                ],
            )
        return hp(
            en,
            [
                f"I try to {base} a little every morning.",
                f"Please don't {base} people with last-minute changes.",
                f"If you {base} too quickly, you might miss details.",
                f"It takes practice to {base} without sounding rude.",
                f"We watched him {base} with surprising confidence.",
            ],
        )
    if is_adj and not is_nounish:
        a = art(base)
        if work:
            return hp(
                en,
                [
                    f"That was {a} {base} decision given the tight deadline.",
                    f"The feedback felt {base} but fair.",
                    f"We need a more {base} approach to this problem.",
                    f"His update was clear, concise, and {base}.",
                    f"The timeline looks {base} if we cut scope.",
                ],
            )
        return hp(
            en,
            [
                f"What {a} {base} view from the hill!",
                f"She gave {a} {base} answer to a hard question.",
                f"The weather turned {base} by late afternoon.",
                f"He stayed {base} even when the plan changed.",
                f"Their apartment is small but {base}.",
            ],
        )
    if work:
        return hp(
            en,
            [
                f"We discussed the {base} in yesterday's planning meeting.",
                f"Improving our {base} is a goal for this quarter.",
                f"Please add a note about the {base} in the doc.",
                f"Leadership asked for an update on our {base}.",
                f"We tracked the {base} carefully after the incident.",
                f"A solid {base} made the launch much smoother.",
            ],
        )
    return hp(
        en,
        [
            f"I read a short piece about {base} on the train this morning.",
            f"We talked about {base} over dinner last night.",
            f"Her story showed why {base} matters in real life.",
            f"The guidebook had a whole section on {base}.",
            f"I finally understood what {base} really means.",
            f"The podcast kept returning to the idea of {base}.",
            f"Kids at school were learning about {base} today.",
        ],
    )


def generate(en: str, tr: str, theme: str, curated: dict[str, str]) -> str:
    if en in curated:
        return curated[en]
    for k, v in curated.items():
        if k.lower() == en.lower():
            return v

    words = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip().split()
    multi = len(words) >= 2 or "-" in en or "/" in en
    if multi:
        if is_clause(en):
            return ensure(en, gen_clause(en))
        if is_noun_multi(en, tr):
            return ensure(en, gen_noun_multi(en))
        first = words[0].lower() if words else ""
        if first in VERB_FIRST or looks_verb_tr(tr):
            return ensure(en, gen_verb_multi(en))
        return ensure(en, gen_noun_multi(en))
    return ensure(en, gen_single(en, tr, theme))


def main() -> None:
    curated: dict[str, str] = {}
    if CURATED_PATH.exists():
        curated = json.loads(CURATED_PATH.read_text(encoding="utf-8"))

    items = json.loads(SRC.read_text(encoding="utf-8"))
    out = []
    missing = 0
    for it in items:
        en = it["en"].strip()
        tr = it["tr"].strip()
        theme = it["t"]
        day = it["d"]
        ex = re.sub(r"\s+", " ", generate(en, tr, theme, curated)).strip()
        for b in (
            "At the start of the meeting I said,",
            "On a Friday call I asked,",
            "When we first met, I used",
        ):
            if b in ex:
                ex = f"In everyday speech you might hear: {en}."
        base = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()
        if (
            en not in ex
            and base not in ex
            and en.lower() not in ex.lower()
            and base.lower() not in ex.lower()
        ):
            missing += 1
            ex = f"A natural example: {en}."
        out.append({"d": day, "t": theme, "en": en, "tr": tr, "ex": ex})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} → {OUT} (missing={missing}, curated={len(curated)})")


if __name__ == "__main__":
    main()
