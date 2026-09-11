# English Vocab App

Sentence-first English vocabulary practice (Turkish UI).

**Live:** https://rozturac.github.io/english-vocab-app/

## Study flow

Primary mode is **Seç** (multiple choice):

1. Read the English sentence (target phrase highlighted)
2. Choose the Turkish meaning of the highlighted phrase (4 options)
3. After answering, see the full Turkish sentence (`exTr`) + optional morph tip
4. Optional: 🔊 Dinle · “Çeviriyi göster” before answering

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
