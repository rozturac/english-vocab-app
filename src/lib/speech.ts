let preferred: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const enUs = voices.find((v) => /en-US/i.test(v.lang) && /google|microsoft|samantha|alex/i.test(v.name));
  const en = voices.find((v) => /en-US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  return enUs || en || null;
}

export function speakEnglish(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  preferred = preferred || pickVoice();
  if (!preferred) {
    // voices may load async
    window.speechSynthesis.onvoiceschanged = () => {
      preferred = pickVoice();
    };
  }
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
