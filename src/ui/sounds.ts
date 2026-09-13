/**
 * Sound effects for the GRC Range desktop shell.
 *
 * All sounds are synthesized at runtime with the Web Audio API — no audio
 * files are loaded. Each function creates a short oscillator-based tone and
 * lets it decay naturally. The AudioContext is created lazily on first use
 * (browsers require a user gesture before audio can play, so we defer
 * creation until the first sound is actually triggered).
 */

/** Lazily-created, reused AudioContext. */
let audioCtx: AudioContext | null = null;

/**
 * Return the shared AudioContext, creating it on first call.
 *
 * Browsers suspend the context until a user gesture occurs; the first call
 * will typically happen inside a click or keydown handler, which satisfies
 * that requirement.
 */
function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctor();
  }
  // Resume if the browser auto-suspended the context.
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single tone with a gentle exponential decay.
 *
 * @param freq   - Oscillator frequency in Hz.
 * @param dur    - Duration in seconds.
 * @param type   - Oscillator waveform.
 * @param gain   - Peak gain (0–1).
 * @param startAt - Offset from "now" in seconds (for sequencing notes).
 */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  startAt = 0,
): void {
  const ctx = getCtx();
  const now = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  // Attack → decay envelope.
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

/**
 * A short ascending two-note chime played on successful logon.
 *
 * The notes rise from C5 (523 Hz) to E5 (659 Hz), giving a bright,
 * welcoming feel similar to the Windows logon sound.
 */
export function logonChime(): void {
  tone(523.25, 0.18, 'sine', 0.12, 0);
  tone(659.25, 0.28, 'sine', 0.12, 0.12);
}

/**
 * A short descending two-note chime played on logoff / sign-out.
 *
 * The notes fall from E5 (659 Hz) to C5 (523 Hz), mirroring the logon chime.
 */
export function logoffChime(): void {
  tone(659.25, 0.18, 'sine', 0.12, 0);
  tone(523.25, 0.28, 'sine', 0.12, 0.12);
}

/**
 * A short low-pitched beep for errors and failed actions.
 *
 * Uses a square wave at 220 Hz for a harsh, attention-grabbing tone.
 */
export function errorBeep(): void {
  tone(220, 0.15, 'square', 0.08, 0);
}

/**
 * A very short, soft click for button presses and UI interactions.
 *
 * A brief high-frequency sine blip that is barely noticeable but provides
 * subtle tactile feedback.
 */
export function clickSound(): void {
  tone(880, 0.04, 'sine', 0.05, 0);
}
