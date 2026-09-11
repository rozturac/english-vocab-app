import { useCallback, useEffect, useMemo, useState } from 'react';
import { DAYS, THEMES, VOCAB } from './data/vocab';
import { blankPhrase, boldPhrase } from './lib/example';
import { answersMatch } from './lib/normalize';
import { speakEnglish, stopSpeaking } from './lib/speech';
import {
  buildDailyQueue,
  cardId,
  getStats,
  loadProgress,
  markResult,
  resetProgress,
  saveProgress,
} from './lib/storage';
import type { ProgressState, StudyMode, VocabItem } from './types';
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

function mcOptions(item: VocabItem, pool: VocabItem[], field: 'en' | 'tr'): string[] {
  const correct = item[field];
  const others = shuffle(pool.filter((x) => x[field] !== correct))
    .slice(0, 3)
    .map((x) => x[field]);
  return shuffle([correct, ...others]);
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [mode, setMode] = useState<StudyMode>('flash');
  const [day, setDay] = useState<number | ''>('');
  const [theme, setTheme] = useState('');
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
      setFlipped(false);
      setTyped('');
      setAnswered(false);
      setWasCorrect(null);
      setSelected(null);
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
    setFlipped(false);
    setTyped('');
    setAnswered(false);
    setWasCorrect(null);
    setSelected(null);
    if (mode === 'mc') {
      setOptions(mcOptions(current, VOCAB, 'en'));
    } else if (mode === 'listen') {
      setOptions(mcOptions(current, VOCAB, 'tr'));
      const t = window.setTimeout(() => speakEnglish(current.ex || current.en), 250);
      return () => window.clearTimeout(t);
    }
  }, [current, mode, idx]);

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

  const submitTyped = useCallback(() => {
    if (!current || answered) return;
    const ok = answersMatch(typed, current.en);
    setWasCorrect(ok);
    setAnswered(true);
    if (ok) speakEnglish(current.ex || current.en);
  }, [answered, current, typed]);

  const chooseOption = useCallback(
    (opt: string) => {
      if (!current || answered) return;
      const expected = mode === 'listen' ? current.tr : current.en;
      const ok = answersMatch(opt, expected);
      setSelected(opt);
      setWasCorrect(ok);
      setAnswered(true);
      if (mode !== 'listen') speakEnglish(current.ex || current.en);
    },
    [answered, current, mode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Enter' && mode === 'type') {
          e.preventDefault();
          if (answered) advance(!!wasCorrect);
          else submitTyped();
        }
        return;
      }
      if (e.key === ' ' && mode === 'flash') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'flash') {
          if (!flipped) setFlipped(true);
          else advance(true);
        } else if (answered) {
          advance(!!wasCorrect);
        } else if (mode === 'type') {
          submitTyped();
        }
      }
      if (
        (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') &&
        (mode === 'mc' || mode === 'listen') &&
        !answered
      ) {
        const i = Number(e.key) - 1;
        if (options[i]) chooseOption(options[i]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, answered, chooseOption, flipped, mode, options, submitTyped, wasCorrect]);

  const modes: { id: StudyMode; label: string }[] = [
    { id: 'flash', label: 'Kart' },
    { id: 'type', label: 'Boşluk' },
    { id: 'mc', label: 'Seç' },
    { id: 'listen', label: 'Dinle' },
  ];

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cümleyle öğren</h1>
          <p className="sub">Hedef ifade cümlede kalın · basit çalışma</p>
        </div>
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
      </header>

      <StatsBar
        streak={stats.streak}
        idx={sessionDone ? Math.max(queue.length - 1, 0) : idx}
        queueLen={queue.length}
        due={stats.due}
      />

      <div className="mode-row">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? 'chip active' : 'chip'}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <button type="button" className="chip ghost" onClick={() => setShowFilters((s) => !s)}>
          Filtre
        </button>
      </div>

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
          <p>Vadesi gelen veya yeni kart kalmadı. Filtreyi değiştirip yenileyebilirsin.</p>
          <button type="button" className="btn primary" onClick={() => rebuild()}>
            Yenile
          </button>
        </section>
      ) : (
        <section className="study">
          {mode === 'flash' && (
            <button
              type="button"
              className={`card flash ${flipped ? 'revealed' : ''}`}
              onClick={() => setFlipped((f) => !f)}
            >
              {!flipped ? (
                <>
                  <div className="prompt-label">Cümleyi oku</div>
                  <div className="sentence">{boldPhrase(current.ex, current.en)}</div>
                  <div className="hint">Anlam için dokun</div>
                </>
              ) : (
                <>
                  <div className="prompt-label">Anlam</div>
                  <div className="target">{current.en}</div>
                  <div className="tr">{current.tr}</div>
                  {current.morph && <div className="morph">{current.morph}</div>}
                  <div className="ex muted">{boldPhrase(current.ex, current.en)}</div>
                </>
              )}
            </button>
          )}

          {mode === 'type' && (
            <div className="card quiz">
              <div className="prompt-label">Boşluğu doldur</div>
              <div className="tr soft">{current.tr}</div>
              <div className="sentence cloze">{blankPhrase(current.ex, current.en)}</div>
              <input
                className="type-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="İfade..."
                autoFocus
                disabled={answered}
              />
              {answered && (
                <div className={wasCorrect ? 'feedback ok' : 'feedback bad'}>
                  {wasCorrect ? 'Doğru' : 'Yanlış'}
                  <div className="target">{current.en}</div>
                  <div className="ex">{boldPhrase(current.ex, current.en)}</div>
                  {current.morph && <div className="morph">{current.morph}</div>}
                  <SpeakButton text={current.ex || current.en} />
                </div>
              )}
            </div>
          )}

          {mode === 'mc' && (
            <div className="card quiz">
              <div className="prompt-label">Doğru ifadeyi seç</div>
              <div className="tr soft">{current.tr}</div>
              <div className="sentence cloze">{blankPhrase(current.ex, current.en)}</div>
              <div className="options">
                {options.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    className={
                      'option' +
                      (answered
                        ? answersMatch(opt, current.en)
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
                  {wasCorrect ? 'Doğru' : `Doğru: ${current.en}`}
                  <div className="ex">{boldPhrase(current.ex, current.en)}</div>
                  {current.morph && <div className="morph">{current.morph}</div>}
                  <SpeakButton text={current.ex || current.en} />
                </div>
              )}
            </div>
          )}

          {mode === 'listen' && (
            <div className="card quiz">
              <div className="prompt-label">Cümleyi dinle → Türkçe seç</div>
              <div className="listen-row">
                <SpeakButton text={current.ex || current.en} label="Tekrar dinle" />
              </div>
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
                  {wasCorrect ? 'Doğru' : `Doğru: ${current.tr}`}
                  <div className="target">{current.en}</div>
                  <div className="ex">{boldPhrase(current.ex, current.en)}</div>
                  {current.morph && <div className="morph">{current.morph}</div>}
                </div>
              )}
            </div>
          )}

          <div className="actions">
            {mode === 'flash' && (
              <>
                <SpeakButton text={current.ex || current.en} />
                <button type="button" className="btn secondary" onClick={() => advance(false)}>
                  Bilmiyorum
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    if (!flipped) setFlipped(true);
                    else advance(true);
                  }}
                >
                  {flipped ? 'Biliyorum' : 'Göster'}
                </button>
              </>
            )}
            {mode === 'type' && !answered && (
              <button type="button" className="btn primary" onClick={submitTyped}>
                Kontrol
              </button>
            )}
            {(mode === 'type' || mode === 'mc' || mode === 'listen') && answered && (
              <button type="button" className="btn primary" onClick={() => advance(!!wasCorrect)}>
                Sonraki
              </button>
            )}
          </div>
        </section>
      )}

      <footer className="footer">{VOCAB.length} cümle · ilerleme bu cihazda</footer>
    </div>
  );
}
