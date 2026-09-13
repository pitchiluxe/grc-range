/**
 * Ollama local-LLM configuration for the GRC Range.
 *
 * The GRC Senior Expert tutor prefers a local Ollama model so the lab can run
 * fully offline and the learner's data never leaves the workstation. When
 * Ollama is not running, the tutor falls back to a deterministic offline answer
 * built from the knowledge base (see `@/vm/grcExpert`).
 *
 * This module mirrors the IAM Range's `ollama.ts`: a small set of constants
 * plus a single liveness check (`ollamaAvailable`) that the UI calls fresh on
 * every question to decide which path to take.
 */

/** Where Ollama listens by default. */
export const OLLAMA_HOST = 'http://127.0.0.1:11434';

/** The model the GRC expert asks for. Small on purpose — runs on a laptop without GPU. */
export const OLLAMA_MODEL = 'llama3.2';

/** Where to get it. */
export const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download';

/** The command Settings tells the learner to run. */
export const OLLAMA_PULL_COMMAND = `ollama pull ${OLLAMA_MODEL}`;

export const OLLAMA_TAGS_URL = `${OLLAMA_HOST}/api/tags`;
export const OLLAMA_GENERATE_URL = `${OLLAMA_HOST}/api/generate`;

/** Whether a local Ollama is answering right now. Asked fresh every time. */
export async function ollamaAvailable(timeoutMs = 3000): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(OLLAMA_TAGS_URL, { signal: ctl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Pre-load the model into memory so the first real question is fast.
 *
 * Ollama loads the model on first use, which can take 8-10 seconds. By sending
 * a tiny prompt when the window opens, we start the load in the background.
 * The result is discarded — this is a warm-up, not a real query.
 */
export async function warmUpModel(): Promise<void> {
  try {
    const ctl = new AbortController();
    // Give it up to 30s to load — we don't want to block the UI, and the
    // AbortController lets the request be dropped if the user navigates away.
    const timer = setTimeout(() => ctl.abort(), 30000);
    await fetch(OLLAMA_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: 'ok',
        stream: false,
        options: { num_predict: 1, temperature: 0 },
      }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
  } catch {
    // Warm-up is best-effort — ignore errors.
  }
}
