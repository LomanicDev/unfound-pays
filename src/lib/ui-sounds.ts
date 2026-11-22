let audioContext: AudioContext | undefined;

function getAudioContext() {
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  wave: OscillatorType = "sine",
  endFrequency = frequency,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    endFrequency,
    startAt + duration,
  );
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.01);
}

export type UiSound =
  | "tap"
  | "navigation"
  | "open"
  | "close"
  | "save"
  | "edit"
  | "delete"
  | "export"
  | "toggle"
  | "selection"
  | "key"
  | "swipe";

export function playUiSound(kind: UiSound) {
  try {
    const context = getAudioContext();
    const now = context.currentTime;

    switch (kind) {
      case "navigation":
        tone(context, 360, now, 0.07, 0.016, "sine", 520);
        break;
      case "open":
        tone(context, 480, now, 0.08, 0.018, "triangle", 720);
        break;
      case "close":
        tone(context, 650, now, 0.07, 0.014, "sine", 390);
        break;
      case "save":
        tone(context, 590, now, 0.11, 0.02, "sine");
        tone(context, 790, now + 0.055, 0.14, 0.018, "triangle");
        break;
      case "edit":
        tone(context, 480, now, 0.06, 0.014, "triangle", 600);
        break;
      case "delete":
        tone(context, 230, now, 0.12, 0.019, "triangle", 150);
        break;
      case "export":
        tone(context, 740, now, 0.1, 0.014, "sine");
        tone(context, 980, now + 0.045, 0.13, 0.013, "sine");
        break;
      case "toggle":
        tone(context, 520, now, 0.045, 0.014, "triangle", 620);
        break;
      case "selection":
        tone(context, 840, now, 0.024, 0.009, "sine");
        break;
      case "key":
        tone(context, 680, now, 0.025, 0.009, "sine");
        break;
      case "swipe":
        tone(context, 280, now, 0.12, 0.015, "sine", 640);
        break;
      default:
        tone(context, 430, now, 0.035, 0.012, "sine", 500);
    }
  } catch {
    // Audio is optional; the interface continues to work if it is unavailable.
  }
}
