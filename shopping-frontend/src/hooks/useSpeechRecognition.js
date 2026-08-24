import { useEffect, useRef, useState } from 'react';

// Thin wrapper around the browser's SpeechRecognition API. Falls back
// gracefully (supported: false) on browsers that don't implement it --
// the voice bar still works fine as a plain text input in that case.
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = Boolean(SpeechRecognition);

  useEffect(() => {
    if (!supported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [supported]);

  function start() {
    if (!supported || listening) return;
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  }

  function stop() {
    if (!supported) return;
    recognitionRef.current.stop();
    setListening(false);
  }

  function reset() {
    setTranscript('');
  }

  return { supported, listening, transcript, start, stop, reset };
}
