import type { VocabItem } from '../types';

const THEME_FAMILY: Record<string, string> = {
  'Tanışma ve sohbet': 'social',
  'Günlük iş dili': 'work',
  'Slack / ekip yazışması': 'work',
  '1o1 ve yeni rol': 'career',
  'EM ↔ Sr EM': 'career',
  'Perf & promo dili': 'career',
  'Değerlendirme dili': 'career',
  'Uber teknik dili': 'tech',
  'Kalıp ve kısaltma': 'tech',
  'Defter (genel kelime)': 'general',
  'Okuma metinleri': 'general',
  'Genel (düşük öncelik)': 'general',
};

const TR_STOP = new Set(
  [
    've',
    'veya',
    'ile',
    'icin',
    'için',
    'bir',
    'bu',
    'su',
    'şu',
    'o',
    'da',
    'de',
    'ki',
    'ne',
    'ya',
    'ama',
    'cok',
    'çok',
    'daha',
    'en',
    'ben',
    'sen',
    'biz',
    'siz',
    'mi',
    'mi',
    'mı',
    'mu',
    'mü',
    'misin',
    'misin',
    'mısın',
    'musun',
    'müsün',
    'var',
    'yok',
    'beni',
    'seni',
    'bana',
    'sana',
    'sonra',
    'once',
    'önce',
    'zaman',
    'gibi',
    'kadar',
    'diye',
    'olan',
    'olarak',
    'et',
    'etmek',
    'yapmak',
  ].map((w) => w.toLocaleLowerCase('tr-TR')),
);

const TR_SUFFIXES = [
  'abilecekler',
  'ebilecekler',
  'abilecek',
  'ebilecek',
  'abilirler',
  'ebilirler',
  'abiliyor',
  'ebiliyor',
  'abilir',
  'ebilir',
  'ecekler',
  'acaklar',
  'iyorlar',
  'uyorlar',
  'üyorlar',
  'misiniz',
  'mısınız',
  'musunuz',
  'müsünüz',
  'misin',
  'mısın',
  'musun',
  'müsün',
  'siniz',
  'sınız',
  'sunuz',
  'sünüz',
  'leri',
  'ları',
  'ler',
  'lar',
  'imiz',
  'ımız',
  'umuz',
  'ümüz',
  'iniz',
  'ınız',
  'unuz',
  'ünüz',
  'dan',
  'den',
  'tan',
  'ten',
  'dır',
  'dir',
  'dur',
  'dür',
  'tır',
  'tir',
  'tur',
  'tür',
  'mek',
  'mak',
  'yor',
  'ını',
  'ini',
  'unu',
  'ünü',
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function familyOf(theme: string): string {
  return THEME_FAMILY[theme] ?? theme;
}

function tokens(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

function foldWord(w: string): string {
  return w.toLocaleLowerCase('tr-TR').replace(/[’`´]/g, "'");
}

function stemTr(word: string): string {
  let w = foldWord(word);
  let changed = true;
  while (changed && w.length > 5) {
    changed = false;
    for (const suf of TR_SUFFIXES) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) {
        w = w.slice(0, -suf.length);
        changed = true;
        break;
      }
    }
  }
  return w;
}

function wordsRelated(a: string, b: string): boolean {
  const fa = foldWord(a);
  const fb = foldWord(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const sa = stemTr(fa);
  const sb = stemTr(fb);
  if (sa === sb) return true;
  const n = Math.min(sa.length, sb.length);
  if (n >= 5 && (sa.startsWith(sb) || sb.startsWith(sa))) return true;
  return false;
}

function findCi(haystack: string, needle: string): number {
  return haystack.toLocaleLowerCase('tr-TR').indexOf(needle.toLocaleLowerCase('tr-TR'));
}

function contentWords(phrase: string): string[] {
  const raw = tokens(phrase.replace(/[^\p{L}\p{N}'\s]/gu, ' '));
  const folded = raw.map(foldWord).filter(Boolean);
  const content = folded.filter((w) => w.length >= 4 && !TR_STOP.has(w));
  return content.length ? content : folded.filter((w) => !TR_STOP.has(w));
}

type WordSpan = { start: number; end: number; word: string };

function sentenceWords(sentence: string): WordSpan[] {
  const out: WordSpan[] = [];
  const re = /[\p{L}\p{N}'’]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return out;
}

function findOverlapSpan(sentence: string, gloss: string): WordSpan | null {
  const words = sentenceWords(sentence);
  const targets = contentWords(gloss);
  if (!words.length || !targets.length) return null;

  let best: { score: number; start: number; end: number } | null = null;

  for (let i = 0; i < words.length; i++) {
    for (let j = i; j < words.length; j++) {
      const window = words.slice(i, j + 1);
      const used = new Set<number>();
      let matched = 0;
      let longest = 0;
      for (const tw of targets) {
        for (let k = 0; k < window.length; k++) {
          if (used.has(k)) continue;
          if (wordsRelated(tw, window[k]!.word)) {
            used.add(k);
            matched += 1;
            longest = Math.max(longest, foldWord(tw).length, foldWord(window[k]!.word).length);
            break;
          }
        }
      }
      if (matched === 0) continue;
      const wsize = window.length;
      const recall = matched / targets.length;
      const precision = matched / wsize;
      const ok =
        (matched >= 2 && recall >= 0.5 && precision >= 0.4) ||
        (matched === 1 && longest >= 6 && recall >= 0.4 && wsize <= 3);
      if (!ok) continue;
      const lenPenalty = Math.abs(wsize - targets.length) * 0.25;
      const score = matched * 3 + recall + precision - lenPenalty;
      if (!best || score > best.score) {
        best = { score, start: window[0]!.start, end: window[window.length - 1]!.end };
      }
    }
  }
  return best ? { start: best.start, end: best.end, word: '' } : null;
}

/** Blank the target gloss inside the Turkish example sentence when possible. */
export function blankTurkish(exTr: string, tr: string): string {
  const sentence = (exTr || '').trim();
  const gloss = (tr || '').trim();
  if (!sentence) return '____';
  if (!gloss) return sentence;

  const exact = findCi(sentence, gloss);
  if (exact >= 0 && gloss.length >= 2) {
    return `${sentence.slice(0, exact)}____${sentence.slice(exact + gloss.length)}`;
  }

  const stripped = gloss.replace(/[?!.,;:…]+$/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (stripped.length >= 2 && stripped !== gloss) {
    const idx = findCi(sentence, stripped);
    if (idx >= 0) {
      return `${sentence.slice(0, idx)}____${sentence.slice(idx + stripped.length)}`;
    }
  }

  const span = findOverlapSpan(sentence, gloss);
  if (span) {
    return `${sentence.slice(0, span.start)}____${sentence.slice(span.end)}`;
  }

  return sentence;
}

function lengthScore(a: string, b: string): number {
  const ta = tokens(a).length;
  const tb = tokens(b).length;
  const tokenDiff = Math.abs(ta - tb);
  const charRel = Math.abs(a.length - b.length) / Math.max(a.length, b.length, 1);
  return Math.max(0, 42 - tokenDiff * 14) + Math.max(0, 18 - charRel * 45);
}

function distractorScore(item: VocabItem, other: VocabItem, textOf: (x: VocabItem) => string): number {
  const sameTheme = other.t === item.t;
  const sameFamily = familyOf(other.t) === familyOf(item.t);
  let score = 0;
  if (sameTheme) score += 120;
  else if (sameFamily) score += 28;
  else score -= 90;
  score += Math.max(0, 22 - Math.abs(other.d - item.d) * 2);
  score += lengthScore(textOf(item), textOf(other));
  return score;
}

function pickDistractors(
  item: VocabItem,
  pool: VocabItem[],
  textOf: (x: VocabItem) => string,
  n = 3,
): string[] {
  const correct = textOf(item).trim();
  const seen = new Set([correct.toLocaleLowerCase('tr-TR')]);
  const scored: { text: string; score: number }[] = [];

  for (const other of pool) {
    if (other.en === item.en && other.d === item.d) continue;
    const text = textOf(other).trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push({ text, score: distractorScore(item, other, textOf) });
  }

  scored.sort((a, b) => b.score - a.score);

  // Prefer same-theme / similar-length: take a short head, then shuffle for variety.
  const head = scored.slice(0, Math.max(n + 5, 8));
  const picked = shuffle(head).slice(0, n).map((x) => x.text);
  if (picked.length >= n) return picked;

  for (const row of scored) {
    if (picked.includes(row.text)) continue;
    picked.push(row.text);
    if (picked.length >= n) break;
  }
  return picked;
}

/** TR→EN: English target among same-theme, similar-length distractors. */
export function buildEnOptions(
  item: VocabItem,
  pool: VocabItem[],
): { options: string[]; correct: string } {
  const correct = item.en;
  const others = pickDistractors(item, pool, (x) => x.en, 3);
  return { options: shuffle([correct, ...others]), correct };
}

/** EN→TR: full Turkish sentence (or gloss) among confusable same-theme options. */
export function buildTrOptions(
  item: VocabItem,
  pool: VocabItem[],
): { options: string[]; correct: string } {
  const correct = item.exTr || item.tr;
  const others = pickDistractors(item, pool, (x) => x.exTr || x.tr, 3);
  return { options: shuffle([correct, ...others]), correct };
}
