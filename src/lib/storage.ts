import type { CardProgress, ProgressState, VocabItem } from '../types';
import { addDaysISO, todayISO } from './dates';

const KEY = 'english-vocab-progress-v1';
const DAILY_NEW = 8;

/** Leitner intervals (days until next review) by box after a correct answer */
const INTERVALS = [1, 2, 4, 7, 14, 30];

export function cardId(item: VocabItem): string {
  return `${item.d}::${item.en}`;
}

function defaultState(): ProgressState {
  return {
    cards: {},
    streak: 0,
    lastStudyDate: null,
    dailyNewIds: [],
    dailyDate: null,
  };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ProgressState;
    return { ...defaultState(), ...parsed, cards: parsed.cards || {} };
  } catch {
    return defaultState();
  }
}

export function saveProgress(state: ProgressState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function touchStreak(state: ProgressState): ProgressState {
  const today = todayISO();
  if (state.lastStudyDate === today) return state;
  const yesterday = addDaysISO(today, -1);
  const streak =
    state.lastStudyDate === yesterday ? state.streak + 1 : state.lastStudyDate ? 1 : 1;
  return { ...state, streak, lastStudyDate: today };
}

function ensureCard(state: ProgressState, id: string): CardProgress {
  const existing = state.cards[id];
  if (existing) return existing;
  return { box: 0, due: todayISO(), correct: 0, wrong: 0 };
}

export function markResult(
  state: ProgressState,
  id: string,
  correct: boolean,
): ProgressState {
  const today = todayISO();
  const prev = ensureCard(state, id);
  let box = prev.box;
  if (correct) {
    box = Math.min(5, box + 1);
  } else {
    box = 0;
  }
  const interval = INTERVALS[box] ?? 30;
  const next: CardProgress = {
    box,
    due: addDaysISO(today, correct ? interval : 0),
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    last: today,
  };
  const cards = { ...state.cards, [id]: next };
  return touchStreak({ ...state, cards });
}

export function getStats(state: ProgressState, items: VocabItem[]) {
  const today = todayISO();
  let learned = 0;
  let due = 0;
  let seen = 0;
  for (const it of items) {
    const id = cardId(it);
    const c = state.cards[id];
    if (!c) continue;
    seen += 1;
    if (c.box >= 4) learned += 1;
    if (c.due <= today) due += 1;
  }
  // also count unseen? due for daily comes from session builder
  return { learned, due, seen, streak: state.streak, total: items.length };
}

/** Build today's study queue: due reviews + up to 8 new cards */
export function buildDailyQueue(
  state: ProgressState,
  items: VocabItem[],
  filter?: { day?: number | null; theme?: string | null },
): { queue: VocabItem[]; state: ProgressState } {
  const today = todayISO();
  let filtered = items;
  if (filter?.day) filtered = filtered.filter((x) => x.d === filter.day);
  if (filter?.theme) filtered = filtered.filter((x) => x.t === filter.theme);

  const due: VocabItem[] = [];
  const unseen: VocabItem[] = [];

  for (const it of filtered) {
    const id = cardId(it);
    const c = state.cards[id];
    if (!c) unseen.push(it);
    else if (c.due <= today) due.push(it);
  }

  // stable-ish order: earlier days first for new
  unseen.sort((a, b) => a.d - b.d || a.en.localeCompare(b.en));
  due.sort((a, b) => {
    const ca = state.cards[cardId(a)]!;
    const cb = state.cards[cardId(b)]!;
    return ca.due.localeCompare(cb.due) || a.d - b.d;
  });

  let nextState = state;
  let newIds = state.dailyNewIds;
  if (state.dailyDate !== today) {
    newIds = unseen.slice(0, DAILY_NEW).map(cardId);
    nextState = { ...state, dailyDate: today, dailyNewIds: newIds };
  } else {
    // keep assigned daily new that are still unseen / in filter
    const idSet = new Set(newIds);
    const still = unseen.filter((x) => idSet.has(cardId(x)));
    const need = DAILY_NEW - still.length;
    if (need > 0) {
      const extras = unseen.filter((x) => !idSet.has(cardId(x))).slice(0, need);
      newIds = [...still.map(cardId), ...extras.map(cardId)];
      nextState = { ...state, dailyNewIds: newIds };
    } else {
      newIds = still.map(cardId);
    }
  }

  const newSet = new Set(newIds);
  const news = unseen.filter((x) => newSet.has(cardId(x)));
  // due reviews not already in news
  const dueOnly = due.filter((x) => !newSet.has(cardId(x)));
  // Mix reviews + new cards so sessions are not sequential by day/order.
  const queue = shuffleItems([...dueOnly, ...news]);
  return { queue, state: nextState };
}

function shuffleItems<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function resetProgress(): ProgressState {
  const s = defaultState();
  saveProgress(s);
  return s;
}
