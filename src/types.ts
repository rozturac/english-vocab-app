export type VocabItem = {
  d: number;
  t: string;
  en: string;
  tr: string;
  ex: string;
};

export type StudyMode = 'flash' | 'type' | 'mc' | 'listen';

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
