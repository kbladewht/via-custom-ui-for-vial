let keycapAudioContext: AudioContext | undefined;
const pendingKeycapNotes: number[] = [];

export function discardPendingKeycapAudio() {
  pendingKeycapNotes.length = 0;
}

function flushPendingKeycapNotes() {
  const notes = pendingKeycapNotes.splice(0);
  notes.forEach((noteIndex, index) => {
    window.setTimeout(() => playKeycapLandingSound(noteIndex), index * 120);
  });
}

export function prepareKeycapAudio(isUserGesture = false) {
  try {
    if (!keycapAudioContext && !isUserGesture) {
      // Avoid initializing AudioContext automatically before the first user gesture
      return;
    }
    keycapAudioContext ??= new AudioContext();
    if (keycapAudioContext.state === "suspended") {
      void keycapAudioContext.resume().then(flushPendingKeycapNotes);
    } else {
      flushPendingKeycapNotes();
    }
  } catch {
    keycapAudioContext = undefined;
  }
}

export function playKeycapLandingSound(noteIndex: number) {
  if (!keycapAudioContext || keycapAudioContext.state !== "running") {
    if (!pendingKeycapNotes.includes(noteIndex)) pendingKeycapNotes.push(noteIndex);
    return;
  }

  const start = keycapAudioContext.currentTime;
  const notes = [261.63, 293.66, 329.63, 392, 440, 523.25];
  const frequency = notes[noteIndex % notes.length];
  const melody = keycapAudioContext.createOscillator();
  const shimmer = keycapAudioContext.createOscillator();
  const melodyGain = keycapAudioContext.createGain();
  const shimmerGain = keycapAudioContext.createGain();
  melody.type = "sine";
  shimmer.type = "triangle";
  melody.frequency.setValueAtTime(frequency, start);
  shimmer.frequency.setValueAtTime(frequency * 2, start);
  melodyGain.gain.setValueAtTime(0.0001, start);
  melodyGain.gain.exponentialRampToValueAtTime(0.035, start + 0.012);
  melodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  shimmerGain.gain.setValueAtTime(0.0001, start);
  shimmerGain.gain.exponentialRampToValueAtTime(0.009, start + 0.012);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
  melody.connect(melodyGain);
  shimmer.connect(shimmerGain);
  melodyGain.connect(keycapAudioContext.destination);
  shimmerGain.connect(keycapAudioContext.destination);
  melody.start(start);
  shimmer.start(start);
  melody.stop(start + 0.17);
  shimmer.stop(start + 0.12);
}
