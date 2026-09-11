/** Normalize answers: case-insensitive, ignore punctuation/extra spaces */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answersMatch(input: string, expected: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (a === b) return true;
  // allow minor trailing ellipsis / parenthetical differences
  const stripParen = (x: string) => x.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return stripParen(a) === stripParen(b);
}
