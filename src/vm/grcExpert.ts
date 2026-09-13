/**
 * The GRC Senior Expert tutor.
 *
 * An AI-powered tutor that answers the learner's questions about the GRC Range
 * lab. It is modeled on the IAM Range's tutor: it always retrieves from the
 * knowledge base first, grounds the model prompt with the learner's actual
 * findings and risk register, and falls back to a deterministic offline
 * answer (quoting the retrieved article plus a Socratic question) when a
 * local Ollama model is not available.
 *
 * The tutor supports three teaching modes — socratic, explain, and
 * walkthrough — so the learner can choose how much guidance they want.
 */

import { ollamaAvailable, OLLAMA_GENERATE_URL, OLLAMA_MODEL } from '@/config/ollama';
import { searchArticles, type Article } from '@/config/knowledgeBase';
import { labContextForPrompt, getLab, getStep } from '@/vm/currentLab';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Teaching mode the learner selects for the tutor. */
export type ExpertMode = 'socratic' | 'explain' | 'walkthrough';

/** Human-readable label for each mode, shown in the UI. */
export const MODE_LABEL: Record<ExpertMode, string> = {
  socratic: 'Ask me questions',
  explain: 'Explain the concept',
  walkthrough: 'Walk me through it',
};

/** The live lab state the tutor answers against. */
export interface ExpertContext {
  /** Current compliance findings (id, title, severity, status). */
  findings: { id: string; title: string; severity: string; status: string }[];
  /** Current risk register (id, finding, inherentRisk). */
  risks: { id: string; finding: string; inherentRisk: number }[];
  /** Selected teaching mode. */
  mode: ExpertMode;
}

/** The tutor's response to a question. */
export interface ExpertAnswer {
  /** The answer text (plain text, no markdown). */
  text: string;
  /** Knowledge-base articles cited as grounding. */
  citations: Article[];
  /** Whether the answer came from Ollama or the offline fallback. */
  source: 'ollama' | 'offline';
}

/** Re-export the Ollama liveness check under the tutor's own name. */
export const expertAvailable = ollamaAvailable;

/* ------------------------------------------------------------------ *
 * Prompt construction
 * ------------------------------------------------------------------ */

/** The shared system instructions every mode starts from. */
const SYSTEM_PROMPT = [
  'You are a GRC Senior Expert built into a compliance audit training workstation.',
  'You teach Governance, Risk, and Compliance to people preparing for GRC analyst and auditor roles.',
  '',
  'CORE RULE — YOU ARE A GUIDE, NOT A SOLVER:',
  '- You NEVER give the learner the answer to a lab exercise, a finding, or a remediation step.',
  '- You ask focused questions that lead the learner to discover the answer themselves.',
  '- You confirm what they got right, correct misconceptions, and point them to the right tool or command —',
  '  but you do not type the command for them or tell them the exact finding.',
  '- If the learner is stuck, give a hint (where to look, what to check), not the solution.',
  '- If they ask "what is the answer", say you will help them find it, then ask a guiding question.',
  '',
  'Answer ONLY from the reference material provided below.',
  'Talk about the learner\'s actual findings and the lab they are working on, described below.',
  'Be concrete and operational. Prefer what to check and why over definitions.',
  'Never claim to have performed an action.',
  'Plain text. No markdown headings, no code fences.',
].join('\n');

/** Mode-specific instructions appended after the system prompt. */
const MODE_INSTRUCTIONS: Record<ExpertMode, string> = {
  socratic:
    'Ask ONE focused question that moves the learner towards the answer. Two or three sentences max. ' +
    'Never state the answer. If they are on a lab step, ask what they think the next action is and why.',
  explain:
    'Explain the underlying concept clearly, in a short paragraph. Say why it matters operationally. ' +
    'Do NOT give the specific answer to their lab exercise — explain the concept so they can apply it themselves.',
  walkthrough:
    'Point the learner to the right tool and the right area to look at, numbered, in order. ' +
    'Name the cmdlet or console for each step, but do NOT give the exact command or the exact finding. ' +
    'Say what to check afterwards to prove they did it themselves.',
};

/** Format the retrieved articles as grounding material for the prompt. */
function formatCitations(articles: Article[]): string {
  if (articles.length === 0) return 'No directly matching reference material was found.';
  return articles
    .map(
      (a, i) =>
        `Reference ${i + 1} [${a.id}] ${a.title} (topic: ${a.topic})\n${a.body}`,
    )
    .join('\n\n');
}

/** Format the current findings and risk register for the prompt. */
function formatContext(ctx: ExpertContext): string {
  const findings = ctx.findings.length
    ? ctx.findings
        .map((f) => `- ${f.id} [${f.severity}/${f.status}] ${f.title}`)
        .join('\n')
    : '- (no findings recorded)';
  const risks = ctx.risks.length
    ? ctx.risks
        .map((r) => `- ${r.id} (inherent risk ${r.inherentRisk}) ${r.finding}`)
        .join('\n')
    : '- (no risks recorded)';
  return `Current findings:\n${findings}\n\nCurrent risk register:\n${risks}`;
}

/** Build the full prompt sent to Ollama. */
function buildPrompt(question: string, ctx: ExpertContext, citations: Article[]): string {
  return [
    SYSTEM_PROMPT,
    MODE_INSTRUCTIONS[ctx.mode],
    '',
    '=== THE LEARNER\'S CURRENT LAB ===',
    labContextForPrompt(),
    '',
    '=== THE LEARNER\'S ENVIRONMENT ===',
    formatContext(ctx),
    '',
    '=== REFERENCE MATERIAL ===',
    formatCitations(citations),
    '',
    '=== THE LEARNER ASKS ===',
    question,
    '',
    'Answer (remember: guide, do not solve):',
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * Offline fallback
 * ------------------------------------------------------------------ */

/**
 * Produce a deterministic answer without Ollama.
 *
 * The fallback quotes the most relevant retrieved article and, in socratic
 * mode, ends with a focused question. In explain/walkthrough modes it gives a
 * short pointer drawn from the article body. This keeps the tutor useful
 * when the learner has not started the local model.
 */
export function offlineAnswer(question: string, ctx: ExpertContext): ExpertAnswer {
  const citations = searchArticles(question, 3);
  const top = citations[0];
  const labLine = labContextForPrompt();

  const lead = `Ollama is not running, so here is what the knowledge base says.`;
  const labIntro = labLine !== 'No lab is currently active.' ? `\n\n${labLine}` : '';

  let body: string;
  if (top) {
    if (ctx.mode === 'socratic') {
      body =
        `${lead}${labIntro}\n\nFrom "${top.title}": ${top.body.split('\n\n')[0] ?? top.body}\n\n` +
        `Given your findings, what is the first control you would check against this, and why?`;
    } else if (ctx.mode === 'walkthrough') {
      body =
        `${lead}${labIntro}\n\nFrom "${top.title}": ${top.body}\n\n` +
        `Start with the checks named above, then verify each against your current findings.`;
    } else {
      body = `${lead}${labIntro}\n\nFrom "${top.title}": ${top.body}`;
    }
  } else {
    body =
      `${lead}${labIntro}\n\nNo directly matching reference article was found for "${question}". ` +
      `Try rephrasing with a framework or control name (e.g. "PCI-DSS", "access control", "risk assessment").`;
  }

  return { text: body, citations, source: 'offline' };
}

/* ------------------------------------------------------------------ *
 * Ollama call
 * ------------------------------------------------------------------ */

/** Shape of the Ollama /api/generate JSON response (only the fields we read). */
interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

/**
 * Ask the GRC Senior Expert a question.
 *
 * Always retrieves from the knowledge base first. If a local Ollama is
 * available, the retrieved articles and the current lab state are fed into
 * the model prompt and the model's answer is returned. If Ollama is not
 * available (or times out), the deterministic offline answer is returned.
 *
 * @param question  The learner's question.
 * @param ctx       The current findings, risks, and selected mode.
 * @param opts      Optional timeout override for the Ollama call.
 */
export async function askExpert(
  question: string,
  ctx: ExpertContext,
  opts?: { timeoutMs?: number },
): Promise<ExpertAnswer> {
  const citations = searchArticles(question, 3);
  const timeoutMs = opts?.timeoutMs ?? 60000;

  // Try the generate call directly — no separate availability check.
  // The warm-up call may have Ollama busy loading the model, which would
  // cause a separate /api/tags probe to timeout even though Ollama is fine.
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(OLLAMA_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(question, ctx, citations),
        stream: false,
      }),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn('[GRC Expert] Ollama returned non-OK status:', res.status, res.statusText);
      return offlineAnswer(question, ctx);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    if (data.error) {
      console.warn('[GRC Expert] Ollama returned error:', data.error);
      return offlineAnswer(question, ctx);
    }

    const text = (data.response ?? '').trim();
    if (!text) {
      console.warn('[GRC Expert] Ollama returned empty response');
      return offlineAnswer(question, ctx);
    }

    return { text, citations, source: 'ollama' };
  } catch (err) {
    console.warn('[GRC Expert] Ollama fetch failed:', err);
    return offlineAnswer(question, ctx);
  }
}

/* ------------------------------------------------------------------ *
 * Suggested questions
 * ------------------------------------------------------------------ */

/**
 * Context-aware starter questions for the learner.
 *
 * The suggestions adapt to the current finding state so the learner always
 * has a relevant next question: prioritization when there are open critical
 * findings, remediation order when work remains, and an executive-briefing
 * prompt once everything is remediated.
 */
export function suggestedQuestions(ctx: ExpertContext): string[] {
  const questions: string[] = [];

  // Lab-aware suggestions take priority when a lab is active.
  const lab = getLab();
  const step = getStep();
  if (lab && step >= 0) {
    questions.push(`I'm stuck on step ${step + 1} of my lab. Can you give me a hint?`);
    questions.push('What should I be checking right now?');
    questions.push('Am I on the right track with this step?');
    return questions;
  }
  if (lab) {
    questions.push('What is the objective of this lab?');
    questions.push('Where should I start?');
    return questions;
  }

  const openFindings = ctx.findings.filter((f) => f.status !== 'Remediated');
  const openCritical = openFindings.filter((f) => f.severity === 'Critical');
  const allRemediated = ctx.findings.length > 0 && openFindings.length === 0;

  if (openCritical.length > 0) {
    questions.push('How do I prioritize these critical findings?');
  }

  if (openFindings.length > 0) {
    questions.push("What's the remediation order for these findings?");
  }

  // Always-relevant starter questions.
  questions.push('How do I map these findings to compliance frameworks?');
  questions.push('What does a risk assessment for these findings look like?');

  if (allRemediated) {
    questions.push('How do I write an executive briefing for the remediation results?');
  }

  return questions;
}
