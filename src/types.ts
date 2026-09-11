export type VocabItem = {
  d: number;
  t: string;
  en: string;
  tr: string;
  /** English example sentence (target phrase appears inside). */
  ex: string;
  /** Full natural Turkish translation of `ex`. */
  exTr: string;
  /** Optional short morphology tip */
  morph?: string;
};

/** Leitner box 0–5; higher = better known */
export type CardProgress = {
  box: number;
  due: string; // YYYY-MM-DD
  correct: number;
  wrong: number;
  last?: string;
};

export type ProgressState = {
  cards: Record<string, CardProgress>;
  streak: number;
  lastStudyDate: string | null;
  dailyNewIds: string[];
  dailyDate: string | null;
};
