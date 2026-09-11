import { useCallback, useEffect, useMemo, useState } from 'react';
import { DAYS, THEMES, VOCAB } from './data/vocab';
import { boldPhrase } from './lib/example';
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

type StudyDir = 'tr2en' | 'en2tr';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** EN→TR: prefer full Turkish sentence options when 3 distractors exist. */
function buildTrOptions(item: VocabItem, pool: VocabItem[]): { options: string[]; correct: string } {
  if (item.exTr) {
    const others = shuffle(pool.filter((x) => x.exTr && x.exTr !== item.exTr))
      .slice(0, 3)
      .map((x) => x.exTr);
    if (others.length === 3) {
      return { options: shuffle([item.exTr, ...others]), correct: item.exTr };
    }
  }
  const others = shuffle(pool.filter((x) => x.tr !== item.tr))
    .slice(0, 3)
    .map((x) => x.tr);
  return { options: shuffle([item.tr, ...others]), correct: item.tr };
}

/** TR→EN: pick English target phrase among distractors from other items' en. */
function buildEnOptions(item: VocabItem, pool: VocabItem[]): { options: string[]; correct: string } {
  const others = shuffle(pool.filter((x) => x.en !== item.en))
    .slice(0, 3)
    .map((x) => x.en);
  return { options: shuffle([item.en, ...others]), correct: item.en };
}

export default function App() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [day, setDay] = useState<number | ''>('');
  const [theme, setTheme] = useState('');
  const [dir, setDir] = useState<StudyDir>('tr2en');
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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
    stopSpeaking();
    const built =
      dir === 'tr2en' ? buildEnOptions(current, VOCAB) : buildTrOptions(current, VOCAB);
    setOptions(built.options);
    setCorrectAnswer(built.correct);
  }, [current, idx, dir]);

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
      const ok = opt === correctAnswer;
      setSelected(opt);
      setWasCorrect(ok);
      setAnswered(true);
    },
    [answered, correctAnswer, current],
  );

  const switchDir = useCallback((next: StudyDir) => {
    if (next === dir) return;
    setDir(next);
    setAnswered(false);
    setWasCorrect(null);
    setSelected(null);
    stopSpeaking();
  }, [dir]);

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

  const subtitle =
    dir === 'tr2en'
      ? 'Türkçe cümleyi oku, doğru İngilizce ifadeyi seç'
      : 'İngilizce cümleyi oku, doğru Türkçe çeviriyi seç';

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cümleyle öğren</h1>
          <p className="sub">{subtitle}</p>
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

      <div className="dir-tabs" role="tablist" aria-label="Çalışma yönü">
        <button
          type="button"
          role="tab"
          aria-selected={dir === 'tr2en'}
          className={'dir-tab' + (dir === 'tr2en' ? ' active' : '')}
          onClick={() => switchDir('tr2en')}
        >
          TR → EN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={dir === 'en2tr'}
          className={'dir-tab' + (dir === 'en2tr' ? ' active' : '')}
          onClick={() => switchDir('en2tr')}
        >
          EN → TR
        </button>
      </div>

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
            {dir === 'tr2en' ? (
              <>
                <div className="prompt-label">Bu Türkçe cümleye karşılık gelen İngilizce ifade hangisi?</div>
                <div className="sentence tr-prompt">{current.exTr || current.tr}</div>
              </>
            ) : (
              <>
                <div className="prompt-label">Bu cümlede vurgulu ifade ne anlama geliyor?</div>
                <div className="sentence">{boldPhrase(current.ex, current.en)}</div>
                <div className="tool-row">
                  <SpeakButton text={current.ex || current.en} label="Dinle" />
                </div>
              </>
            )}

            <div className="options">
              {options.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className={
                    'option' +
                    (answered
                      ? opt === correctAnswer
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
                  <span className="opt-text">{opt}</span>
                </button>
              ))}
            </div>

            {answered && (
              <div className={wasCorrect ? 'feedback ok' : 'feedback bad'}>
                <div className="feedback-title">{wasCorrect ? 'Doğru ✓' : 'Yanlış ✗'}</div>
                {!wasCorrect && (
                  <div className="feedback-answer">Doğru: {correctAnswer}</div>
                )}
                {dir === 'tr2en' ? (
                  <>
                    <div className="sentence reveal-en">{boldPhrase(current.ex, current.en)}</div>
                    <div className="tool-row">
                      <SpeakButton text={current.ex || current.en} label="Dinle" />
                    </div>
                    <div className="gloss">
                      <span className="target">{current.en}</span>
                      <span className="arrow">→</span>
                      <span className="tr">{current.tr}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ex-tr">{current.exTr || current.tr}</div>
                    <div className="gloss">
                      <span className="target">{current.en}</span>
                      <span className="arrow">→</span>
                      <span className="tr">{current.tr}</span>
                    </div>
                  </>
                )}
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
