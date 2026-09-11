# English Vocab App

Sentence-first English vocabulary practice (Turkish UI) for intermediate work English + general vocab.

**Live:** https://rozturac.github.io/english-vocab-app/

## Study modes

- **Kart** — read the full English example (target bold) → reveal Turkish (+ optional morph tip)
- **Boşluk** — Turkish + cloze sentence; type the phrase
- **Seç** — cloze sentence; pick the phrase
- **Dinle** — hear the sentence; pick Turkish meaning

Progress uses Leitner boxes in `localStorage` (card ids: `{day}::{en}`).

## Data

- `src/data/vocab.json` — 1221 items (`d`, `t`, `en`, `tr`, `ex`, optional `morph`)
- Regenerate examples: `python3 scripts/generate_examples.py` (reads `scripts/curated_examples.json` + `scripts/morph_tips.json`)

## Dev

```bash
npm install
npm run dev
npm run build
```

GitHub Pages base path: `/english-vocab-app/`
