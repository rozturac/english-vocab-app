import type { VocabItem } from '../types';
import raw from './vocab.json';

export const VOCAB: VocabItem[] = raw as VocabItem[];

export const THEMES: string[] = Array.from(new Set(VOCAB.map((v) => v.t))).sort((a, b) =>
  a.localeCompare(b, 'tr'),
);

export const DAYS: number[] = Array.from(new Set(VOCAB.map((v) => v.d))).sort((a, b) => a - b);
