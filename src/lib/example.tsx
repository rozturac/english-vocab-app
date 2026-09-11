import type { ReactNode } from 'react';

function candidates(phrase: string): string[] {
  const base = phrase.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const list = [phrase, base].filter(Boolean);
  if (phrase.includes('/')) {
    for (const part of phrase.split('/').map((s) => s.trim())) {
      if (part) list.push(part);
    }
  }
  return list;
}

/** Bold the vocab phrase inside the example sentence (case-insensitive). */
export function boldPhrase(example: string, phrase: string): ReactNode {
  if (!example) return example;
  for (const p of candidates(phrase)) {
    const idx = example.toLowerCase().indexOf(p.toLowerCase());
    if (idx >= 0) {
      return (
        <>
          {example.slice(0, idx)}
          <strong className="phrase">{example.slice(idx, idx + p.length)}</strong>
          {example.slice(idx + p.length)}
        </>
      );
    }
  }
  return example;
}

/** Replace the target phrase with a blank for cloze quizzes. */
export function blankPhrase(example: string, phrase: string): string {
  if (!example) return example;
  for (const p of candidates(phrase)) {
    const idx = example.toLowerCase().indexOf(p.toLowerCase());
    if (idx >= 0) {
      const blank = '______';
      return example.slice(0, idx) + blank + example.slice(idx + p.length);
    }
  }
  return `${example} (______)`;
}
