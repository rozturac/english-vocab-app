import { speakEnglish } from '../lib/speech';

type Props = { text: string; label?: string; className?: string };

export function SpeakButton({ text, label = 'Seslendir', className }: Props) {
  return (
    <button
      type="button"
      className={className ? `btn speak ${className}` : 'btn speak'}
      onClick={(e) => {
        e.stopPropagation();
        speakEnglish(text);
      }}
      aria-label={label}
      title={label}
    >
      🔊 {label}
    </button>
  );
}
