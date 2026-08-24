import { useEffect, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export function VoiceBar({ onSubmit, busy }) {
  const [text, setText] = useState('');
  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  function handleSubmit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
    reset();
  }

  function toggleMic() {
    if (listening) {
      stop();
    } else {
      start();
    }
  }

  return (
    <div>
      <form className="voice-bar" onSubmit={handleSubmit}>
        {supported && (
          <button
            type="button"
            className="voice-bar__mic"
            onClick={toggleMic}
            data-listening={listening}
            aria-label={listening ? 'Stop listening' : 'Speak a command'}
            aria-pressed={listening}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
              <path d="M12 18v3" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <input
          className="voice-bar__input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? 'Listening…' : 'Say or type a command, e.g. "add two bottles of milk"'}
          aria-label="Shopping command"
        />
        <button type="submit" className="voice-bar__send" disabled={!text.trim() || busy}>
          Send
        </button>
      </form>
      <p className="voice-bar__hint">
        {supported
          ? 'Tap the mic and speak, or type — add, remove, and "bought" commands are understood.'
          : 'Voice input isn\u2019t supported in this browser — type a command instead.'}
      </p>
    </div>
  );
}
