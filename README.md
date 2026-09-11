# English Vocab App

Sentence-first English vocabulary practice (Turkish UI).

**Live:** https://rozturac.github.io/english-vocab-app/

## Study flow

Two directions, **Seç** (4 options):

- **TR → EN:** Turkish sentence with the target meaning blanked (`____`); pick the English `en`. After answering: English `ex` (target bold) + 🔊 Dinle + full `exTr`.
- **EN → TR:** English sentence with the target highlighted; pick the Turkish `exTr`. After answering: full `exTr` + gloss.

Distractors come from the same theme and similar length, not random jargon.

Progress uses Leitner boxes in `localStorage` (card ids: `{day}::{en}`).

## Data

- `src/data/vocab.json` — items with `d`, `t`, `en`, `tr`, `ex`, `exTr`, optional `morph`
- Regenerate English examples: `python3 scripts/generate_examples.py`
- Regenerate Turkish sentence translations: `.venv/bin/python scripts/generate_extr.py`

## Dev

```bash
npm install
npm run dev
npm run build
```

GitHub Pages base path: `/english-vocab-app/`
