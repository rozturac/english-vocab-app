import { useCallback, useEffect, useMemo, useState } from 'react';
import { DAYS, THEMES, VOCAB } from './data/vocab';
import { boldPhrase } from './lib/example';
import { answersMatch } from './lib/normalize';
import { stopSpeaking } from './lib/speech';
import {
  buildDailyQueue,
  cardId,
  getStats,
  loadProgress,
  markResult,
  resetProgress,
  saveProgress,
} from './lib/storage';
import type { ProgressState, VocabItem } from './types';
import { SpeakButton } from './components/SpeakButton';
import { StatsBar } from './components/StatsBar';
import './App.css';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trOptions(item: VocabItem, pool: VocabItem[]): string[] {
  const correct = item.tr;
  const others = shuffle(pool.filter((x) => x.tr !== correct))
    .slice(0, 3)
    .map((x) => x.tr);
  return shuffle([correct, ...others]);
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [day, setDay] = useState<number | ''>('');
  const [theme, setTheme] = useState('');
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const filter = useMemo(
    () => ({
      day: day === '' ? null : Number(day),
      theme: theme || null,
    }),
    [day, theme],
  );

  const rebuild = useCallback(
    (base?: ProgressState) => {
      const state = base ?? loadProgress();
      const { queue: q, state: next } = buildDailyQueue(state, VOCAB, filter);
      saveProgress(next);
      setProgress(next);
      setQueue(q);
      setIdx(0);
      setAnswered(false);
      setWasCorrect(null);
      setSelected(null);
      setShowTranslation(false);
      setSessionDone(q.length === 0);
      stopSpeaking();
    },
    [filter],
  );

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  const current = queue[idx] ?? null;
  const stats = useMemo(() => getStats(progress, VOCAB), [progress]);

  useEffect(() => {
    if (!current) return;
    setAnswered(false);
    setWasCorrect(null);
    setSelected(null);
    setShowTranslation(false);
    setOptions(trOptions(current, VOCAB));
  }, [current, idx]);

  const advance = useCallback(
    (correct: boolean) => {
      if (!current) return;
      const id = cardId(current);
      const next = markResult(progress, id, correct);
      saveProgress(next);
      setProgress(next);
      if (idx + 1 >= queue.length) {
        setSessionDone(true);
      } else {
        setIdx((i) => i + 1);
      }
    },
    [current, idx, progress, queue.length],
  );

  const chooseOption = useCallback(
    (opt: string) => {
      if (!current || answered) return;
      const ok = answersMatch(opt, current.tr);
      setSelected(opt);
      setWasCorrect(ok);
      setAnswered(true);
      setShowTranslation(true);
    },
    [answered, current],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && answered) {
        e.preventDefault();
        advance(!!wasCorrect);
      }
      if ((e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') && !answered) {
        const i = Number(e.key) - 1;
        if (options[i]) chooseOption(options[i]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, answered, chooseOption, options, wasCorrect]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cümleyle öğren</h1>
          <p className="sub">Vurgulu ifadenin Türkçe anlamını seç</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={() => setShowFilters((s) => !s)}>
            Filtre
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (confirm('Tüm ilerleme silinsin mi?')) {
                const s = resetProgress();
                rebuild(s);
              }
            }}
          >
            Sıfırla
          </button>
        </div>
      </header>

      <StatsBar
        streak={stats.streak}
        idx={sessionDone ? Math.max(queue.length - 1, 0) : idx}
        queueLen={queue.length}
        due={stats.due}
        showDetail={showDetail}
        onToggleDetail={() => setShowDetail((d) => !d)}
      />

      {showFilters && (
        <div className="filters">
          <label>
            Gün
            <select
              value={day}
              onChange={(e) => setDay(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Tümü</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  Gün {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tema
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="">Tümü</option>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn secondary" onClick={() => rebuild()}>
            Yenile
          </button>
        </div>
      )}

      {sessionDone || !current ? (
        <section className="card empty">
          <h2>Bu tur bitti</h2>
          <p>Bugünlük kartlar bitti. Filtreyi değiştirip yenileyebilirsin.</p>
          <button type="button" className="btn primary" onClick={() => rebuild()}>
            Yenile
          </button>
        </section>
      ) : (
        <section className="study">
          <div className="card quiz">
            <div className="prompt-label">Bu cümlede vurgulu ifade ne anlama geliyor?</div>
            <div className="sentence">{boldPhrase(current.ex, current.en)}</div>

            <div className="tool-row">
              <SpeakButton text={current.ex || current.en} label="Dinle" />
              <button
                type="button"
                className="btn ghost reveal-btn"
                onClick={() => setShowTranslation((s) => !s)}
              >
                {showTranslation ? 'Çeviriyi gizle' : 'Çeviriyi göster'}
              </button>
            </div>

            {showTranslation && (
              <div className="translation-panel">
                <div className="ex-tr">{current.exTr || current.tr}</div>
                <div className="gloss">
                  <span className="target">{current.en}</span>
                  <span className="arrow">→</span>
                  <span className="tr">{current.tr}</span>
                </div>
                {current.morph && <div className="morph">{current.morph}</div>}
              </div>
            )}

            <div className="options">
              {options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className={
                    'option' +
                    (answered
                      ? answersMatch(opt, current.tr)
                        ? ' correct'
                        : selected === opt
                          ? ' wrong'
                          : ''
                      : '')
                  }
                  disabled={answered}
                  onClick={() => chooseOption(opt)}
                >
                  <span className="num">{i + 1}</span>
                  {opt}
                </button>
              ))}
            </div>

            {answered && (
              <div className={wasCorrect ? 'feedback ok' : 'feedback bad'}>
                <div className="feedback-title">{wasCorrect ? 'Doğru ✓' : 'Yanlış ✗'}</div>
                {!wasCorrect && <div className="feedback-answer">Doğru: {current.tr}</div>}
                <div className="ex-tr">{current.exTr || current.tr}</div>
                {current.morph && <div className="morph">{current.morph}</div>}
              </div>
            )}
          </div>

          <div className="study-footer">
            <div className="actions">
              {answered ? (
                <button type="button" className="btn primary" onClick={() => advance(!!wasCorrect)}>
                  Sonraki
                </button>
              ) : (
                <p className="action-hint">Bir seçenek seç (1–4)</p>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">{VOCAB.length} cümle · ilerleme bu cihazda</footer>
    </div>
  );
}
