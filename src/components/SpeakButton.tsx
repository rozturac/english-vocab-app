import { useEffect, useState } from 'react';
import { speakEnglish, stopSpeaking } from '../lib/speech';

type Props = { text: string; label?: string; className?: string };

export function SpeakButton({ text, label = 'Dinle', className }: Props) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  return (
    <button
      type="button"
      className={
        (className ? `btn speak ${className}` : 'btn speak') + (playing ? ' playing' : '')
      }
      onClick={(e) => {
        e.stopPropagation();
        if (playing) {
          stopSpeaking();
          setPlaying(false);
          return;
        }
        setPlaying(true);
        speakEnglish(text);
        // speechSynthesis has no reliable end event across browsers; approximate by length
        const ms = Math.min(12000, Math.max(1800, text.split(/\s+/).length * 420));
        window.setTimeout(() => setPlaying(false), ms);
      }}
      aria-label={playing ? 'Durdur' : label}
      aria-pressed={playing}
      title={playing ? 'Durdur' : label}
    >
      {playing ? '⏹ Çalıyor…' : `🔊 ${label}`}
    </button>
  );
}
