import type { ReactNode } from 'react';

/** Bold the vocab phrase inside the example sentence (case-insensitive). */
export function boldPhrase(example: string, phrase: string): ReactNode {
  if (!example) return example;
  const base = phrase.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const candidates = [phrase, base].filter(Boolean);
  for (const p of candidates) {
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
  // try first slash part
  if (phrase.includes('/')) {
    for (const part of phrase.split('/').map((s) => s.trim())) {
      const idx = example.toLowerCase().indexOf(part.toLowerCase());
      if (idx >= 0) {
        return (
          <>
            {example.slice(0, idx)}
            <strong className="phrase">{example.slice(idx, idx + part.length)}</strong>
            {example.slice(idx + part.length)}
          </>
        );
      }
    }
  }
  return example;
}
