/**
 * GRC Senior Expert chat window console for the GRC Range desktop.
 *
 * A chat interface for the AI-powered GRC tutor. Modeled on the IAM Range's
 * `tutorWindow.ts` but adapted for the GRC domain (compliance findings, risk
 * register, knowledge base citations).
 *
 * Layout:
 *  - Header: title, three mode-switch buttons, Ollama status indicator.
 *  - Transcript: scrollable list of message bubbles (user right/blue,
 *    expert left/dark). Each expert reply has a citations strip of clickable
 *    knowledge base chips.
 *  - Suggested questions: context-aware chips above the input.
 *  - Input: text field + "Ask" button.
 *
 * When Ollama is offline the expert quotes the knowledge base directly, so the
 * window degrades gracefully.
 */

import type { Article } from '@/config/knowledgeBase';
import type { GrcServices } from '@/vm/session';
import {
  askExpert,
  expertAvailable,
  suggestedQuestions,
  MODE_LABEL,
  type ExpertMode,
  type ExpertAnswer,
  type ExpertContext,
} from '@/vm/grcExpert';
import { warmUpModel } from '@/config/ollama';
import { getLab, getStep, advanceStep, retreatStep, onLabChange } from '@/vm/currentLab';
import { getTheme } from '@/ui/themes';

/** The ordered mode buttons shown in the header. */
const MODES: ExpertMode[] = ['socratic', 'explain', 'walkthrough'];

/** A single chat message in the transcript. */
interface ChatMessage {
  /** Who sent the message. */
  role: 'user' | 'expert';
  /** The message text. */
  text: string;
  /** Citations attached to an expert message (empty for user messages). */
  citations: Article[];
  /** Whether this is the "Thinking…" placeholder (replaced on answer). */
  pending?: boolean;
}

/**
 * Render the GRC Expert chat window into the given body element.
 *
 * @param body     The window body element to populate.
 * @param services The GRC service bundle (used to build the expert context).
 */
export function renderGrcExpertWindow(body: HTMLElement, services: GrcServices): void {
  const theme = getTheme();

  body.style.fontFamily = "'Segoe UI', sans-serif";
  body.style.background = theme.surface;
  body.style.color = theme.text;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  // Mutable window state ------------------------------------------------------
  let currentMode: ExpertMode = 'socratic';
  const messages: ChatMessage[] = [];
  let ollamaOnline = false;
  let probed = false;
  let busy = false;

  // Header --------------------------------------------------------------------
  const header = document.createElement('div');
  header.style.padding = '10px 16px';
  header.style.background = theme.bg;
  header.style.borderBottom = `1px solid ${theme.border}`;
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '12px';
  header.style.flexShrink = '0';

  const titleWrap = document.createElement('div');
  titleWrap.style.display = 'flex';
  titleWrap.style.flexDirection = 'column';
  titleWrap.style.gap = '2px';
  const title = document.createElement('div');
  title.textContent = 'GRC Senior Expert';
  title.style.fontWeight = '600';
  title.style.fontSize = '15px';
  const subtitle = document.createElement('div');
  subtitle.textContent = 'AI governance, risk & compliance tutor';
  subtitle.style.fontSize = '11px';
  subtitle.style.color = theme.textDim;
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);
  header.appendChild(titleWrap);

  // Mode switch buttons
  const modeWrap = document.createElement('div');
  modeWrap.style.display = 'flex';
  modeWrap.style.gap = '6px';
  modeWrap.style.marginLeft = '8px';
  const modeButtons: Record<ExpertMode, HTMLButtonElement> = {
    socratic: document.createElement('button'),
    explain: document.createElement('button'),
    walkthrough: document.createElement('button'),
  };

  function styleModeButton(btn: HTMLButtonElement, mode: ExpertMode): void {
    const active = currentMode === mode;
    btn.textContent = MODE_LABEL[mode];
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '6px';
    btn.style.border = `1px solid ${active ? theme.accent : theme.border}`;
    btn.style.background = active ? theme.accent : 'transparent';
    btn.style.color = active ? '#ffffff' : theme.text;
    btn.style.fontSize = '12px';
    btn.style.fontWeight = active ? '600' : '400';
    btn.style.cursor = 'pointer';
    btn.style.whiteSpace = 'nowrap';
    btn.style.transition = 'background 0.15s, border 0.15s';
  }

  for (const mode of MODES) {
    const btn = modeButtons[mode];
    styleModeButton(btn, mode);
    btn.addEventListener('mouseenter', () => {
      if (currentMode !== mode) {
        btn.style.background = theme.surfaceHover;
        btn.style.borderColor = theme.textDim;
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (currentMode !== mode) styleModeButton(btn, mode);
    });
    btn.addEventListener('click', () => {
      currentMode = mode;
      for (const m of MODES) styleModeButton(modeButtons[m], m);
      renderSuggestions();
    });
    modeWrap.appendChild(btn);
  }
  header.appendChild(modeWrap);

  // Ollama status indicator
  const status = document.createElement('div');
  status.style.marginLeft = 'auto';
  status.style.display = 'flex';
  status.style.alignItems = 'center';
  status.style.gap = '6px';
  status.style.fontSize = '12px';
  status.style.color = theme.textDim;
  const statusDot = document.createElement('span');
  statusDot.style.width = '8px';
  statusDot.style.height = '8px';
  statusDot.style.borderRadius = '50%';
  statusDot.style.flexShrink = '0';
  const statusText = document.createElement('span');
  status.appendChild(statusDot);
  status.appendChild(statusText);
  header.appendChild(status);

  function renderStatus(): void {
    if (!probed) {
      statusDot.style.background = theme.warning;
      statusText.textContent = 'Checking Ollama…';
      statusText.style.color = theme.textDim;
      return;
    }
    if (ollamaOnline) {
      statusDot.style.background = theme.success;
      statusText.textContent = 'Ollama connected';
      statusText.style.color = theme.success;
    } else {
      statusDot.style.background = theme.textDim;
      statusText.textContent = 'Offline — answers quote the docs';
      statusText.style.color = theme.textDim;
    }
  }

  body.appendChild(header);

  // Active lab banner (shown when a lab is active) ---------------------------
  const labBanner = document.createElement('div');
  labBanner.style.padding = '8px 16px';
  labBanner.style.background = theme.bg;
  labBanner.style.borderBottom = `1px solid ${theme.border}`;
  labBanner.style.display = 'none';
  labBanner.style.alignItems = 'center';
  labBanner.style.gap = '10px';
  labBanner.style.flexShrink = '0';
  labBanner.style.fontSize = '12px';

  const labIcon = document.createElement('span');
  labIcon.textContent = '🎓';
  labIcon.style.fontSize = '16px';
  labBanner.appendChild(labIcon);

  const labInfo = document.createElement('div');
  labInfo.style.flex = '1';
  labInfo.style.display = 'flex';
  labInfo.style.flexDirection = 'column';
  labInfo.style.gap = '2px';
  labBanner.appendChild(labInfo);

  const labTitle = document.createElement('div');
  labTitle.style.fontWeight = '600';
  labTitle.style.color = theme.text;
  labInfo.appendChild(labTitle);

  const labStep = document.createElement('div');
  labStep.style.color = theme.textDim;
  labStep.style.fontSize = '11px';
  labInfo.appendChild(labStep);

  // Step navigation buttons
  const prevStepBtn = document.createElement('button');
  prevStepBtn.textContent = '◀';
  prevStepBtn.title = 'Previous step';
  prevStepBtn.style.padding = '4px 8px';
  prevStepBtn.style.borderRadius = '4px';
  prevStepBtn.style.border = `1px solid ${theme.border}`;
  prevStepBtn.style.background = theme.surface;
  prevStepBtn.style.color = theme.text;
  prevStepBtn.style.cursor = 'pointer';
  prevStepBtn.style.fontSize = '11px';
  prevStepBtn.addEventListener('click', () => {
    retreatStep();
    renderLabBanner();
    renderSuggestions();
  });
  labBanner.appendChild(prevStepBtn);

  const nextStepBtn = document.createElement('button');
  nextStepBtn.textContent = '▶';
  nextStepBtn.title = 'Next step';
  nextStepBtn.style.padding = '4px 8px';
  nextStepBtn.style.borderRadius = '4px';
  nextStepBtn.style.border = `1px solid ${theme.border}`;
  nextStepBtn.style.background = theme.surface;
  nextStepBtn.style.color = theme.text;
  nextStepBtn.style.cursor = 'pointer';
  nextStepBtn.style.fontSize = '11px';
  nextStepBtn.addEventListener('click', () => {
    advanceStep();
    renderLabBanner();
    renderSuggestions();
  });
  labBanner.appendChild(nextStepBtn);

  body.appendChild(labBanner);

  function renderLabBanner(): void {
    const lab = getLab();
    const step = getStep();
    if (!lab) {
      labBanner.style.display = 'none';
      return;
    }
    labBanner.style.display = 'flex';
    labTitle.textContent = lab.title;
    if (step >= 0 && step < lab.steps.length) {
      labStep.textContent = `Step ${step + 1} of ${lab.steps.length}: ${lab.steps[step]}`;
    } else {
      labStep.textContent = `${lab.steps.length} steps · ${lab.estimatedTime}`;
    }
    prevStepBtn.disabled = step <= 0;
    nextStepBtn.disabled = step >= lab.steps.length - 1;
    prevStepBtn.style.opacity = step <= 0 ? '0.4' : '1';
    nextStepBtn.style.opacity = step >= lab.steps.length - 1 ? '0.4' : '1';
  }

  // Re-render the banner when the lab changes (e.g. generated in another window).
  onLabChange(() => {
    renderLabBanner();
    renderSuggestions();
  });
  renderLabBanner();

  const transcript = document.createElement('div');
  transcript.style.flex = '1';
  transcript.style.overflow = 'auto';
  transcript.style.padding = '16px';
  transcript.style.display = 'flex';
  transcript.style.flexDirection = 'column';
  transcript.style.gap = '12px';

  function bubbleFor(msg: ChatMessage): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = msg.role === 'user' ? 'flex-end' : 'flex-start';
    wrap.style.maxWidth = '80%';
    wrap.style.alignSelf = msg.role === 'user' ? 'flex-end' : 'flex-start';

    const bubble = document.createElement('div');
    bubble.style.padding = '10px 14px';
    bubble.style.borderRadius = '12px';
    bubble.style.fontSize = '13px';
    bubble.style.lineHeight = '1.5';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.wordBreak = 'break-word';

    if (msg.role === 'user') {
      bubble.style.background = theme.accent;
      bubble.style.color = '#ffffff';
      bubble.style.borderBottomRightRadius = '4px';
    } else {
      bubble.style.background = theme.bg;
      bubble.style.color = theme.text;
      bubble.style.border = `1px solid ${theme.border}`;
      bubble.style.borderBottomLeftRadius = '4px';
    }
    bubble.textContent = msg.text;
    wrap.appendChild(bubble);

    // Citations strip
    if (msg.role === 'expert' && msg.citations.length > 0 && !msg.pending) {
      const citeStrip = document.createElement('div');
      citeStrip.style.display = 'flex';
      citeStrip.style.flexWrap = 'wrap';
      citeStrip.style.gap = '6px';
      citeStrip.style.marginTop = '6px';

      const citeLabel = document.createElement('span');
      citeLabel.textContent = 'Sources:';
      citeLabel.style.fontSize = '11px';
      citeLabel.style.color = theme.textDim;
      citeLabel.style.alignSelf = 'center';
      citeStrip.appendChild(citeLabel);

      for (const cite of msg.citations) {
        const chip = document.createElement('button');
        chip.textContent = cite.title;
        chip.style.padding = '3px 10px';
        chip.style.borderRadius = '12px';
        chip.style.border = `1px solid ${theme.border}`;
        chip.style.background = theme.surface;
        chip.style.color = theme.accent;
        chip.style.fontSize = '11px';
        chip.style.cursor = 'pointer';
        chip.style.transition = 'background 0.15s';
        chip.addEventListener('mouseenter', () => {
          chip.style.background = theme.surfaceHover;
        });
        chip.addEventListener('mouseleave', () => {
          chip.style.background = theme.surface;
        });
        chip.addEventListener('click', () => showCitation(cite));
        citeStrip.appendChild(chip);
      }
      wrap.appendChild(citeStrip);
    }

    return wrap;
  }

  function renderTranscript(): void {
    transcript.innerHTML = '';
    for (const msg of messages) {
      transcript.appendChild(bubbleFor(msg));
    }
    transcript.scrollTop = transcript.scrollHeight;
  }

  body.appendChild(transcript);

  // Suggested questions -------------------------------------------------------
  const suggestions = document.createElement('div');
  suggestions.style.padding = '8px 16px';
  suggestions.style.background = theme.bg;
  suggestions.style.borderTop = `1px solid ${theme.border}`;
  suggestions.style.display = 'flex';
  suggestions.style.flexWrap = 'wrap';
  suggestions.style.gap = '6px';
  suggestions.style.flexShrink = '0';

  function renderSuggestions(): void {
    suggestions.innerHTML = '';
    const qs = suggestedQuestions(buildContext());
    for (const q of qs) {
      const chip = document.createElement('button');
      chip.textContent = q;
      chip.style.padding = '5px 12px';
      chip.style.borderRadius = '14px';
      chip.style.border = `1px solid ${theme.border}`;
      chip.style.background = theme.surface;
      chip.style.color = theme.text;
      chip.style.fontSize = '12px';
      chip.style.cursor = 'pointer';
      chip.style.transition = 'background 0.15s, border 0.15s';
      chip.addEventListener('mouseenter', () => {
        chip.style.background = theme.surfaceHover;
        chip.style.borderColor = theme.accent;
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = theme.surface;
        chip.style.borderColor = theme.border;
      });
      chip.addEventListener('click', () => {
        input.value = q;
        submit();
      });
      suggestions.appendChild(chip);
    }
  }

  body.appendChild(suggestions);

  // Input row -----------------------------------------------------------------
  const inputRow = document.createElement('div');
  inputRow.style.padding = '10px 16px';
  inputRow.style.background = theme.bg;
  inputRow.style.borderTop = `1px solid ${theme.border}`;
  inputRow.style.display = 'flex';
  inputRow.style.gap = '8px';
  inputRow.style.flexShrink = '0';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask the GRC Expert…';
  input.style.flex = '1';
  input.style.padding = '9px 12px';
  input.style.borderRadius = '6px';
  input.style.border = `1px solid ${theme.border}`;
  input.style.background = theme.surface;
  input.style.color = theme.text;
  input.style.fontSize = '13px';
  input.style.fontFamily = "'Segoe UI', sans-serif";
  input.style.outline = 'none';
  input.addEventListener('focus', () => {
    input.style.borderColor = theme.accent;
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = theme.border;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
  inputRow.appendChild(input);

  const askBtn = document.createElement('button');
  askBtn.textContent = 'Ask';
  askBtn.style.padding = '9px 20px';
  askBtn.style.borderRadius = '6px';
  askBtn.style.border = 'none';
  askBtn.style.background = theme.accent;
  askBtn.style.color = '#ffffff';
  askBtn.style.fontWeight = '600';
  askBtn.style.fontSize = '13px';
  askBtn.style.cursor = 'pointer';
  askBtn.style.transition = 'background 0.15s';
  askBtn.addEventListener('mouseenter', () => {
    askBtn.style.background = theme.accentHover;
  });
  askBtn.addEventListener('mouseleave', () => {
    askBtn.style.background = theme.accent;
  });
  askBtn.addEventListener('click', () => submit());
  inputRow.appendChild(askBtn);

  body.appendChild(inputRow);

  // Citation popover ----------------------------------------------------------
  let popover: HTMLElement | null = null;

  function showCitation(article: Article): void {
    closePopover();
    popover = document.createElement('div');
    popover.style.position = 'fixed';
    popover.style.bottom = '70px';
    popover.style.left = '50%';
    popover.style.transform = 'translateX(-50%)';
    popover.style.maxWidth = '520px';
    popover.style.width = '90%';
    popover.style.background = theme.surface;
    popover.style.border = `1px solid ${theme.border}`;
    popover.style.borderRadius = '8px';
    popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
    popover.style.padding = '16px';
    popover.style.zIndex = '1000';
    popover.style.fontFamily = "'Segoe UI', sans-serif";

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.marginBottom = '8px';

    const h = document.createElement('div');
    h.textContent = article.title;
    h.style.fontWeight = '600';
    h.style.fontSize = '14px';
    h.style.color = theme.accent;
    head.appendChild(h);

    const close = document.createElement('button');
    close.textContent = '\u00d7';
    close.style.background = 'transparent';
    close.style.border = 'none';
    close.style.color = theme.textDim;
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.style.lineHeight = '1';
    close.addEventListener('click', closePopover);
    head.appendChild(close);
    popover.appendChild(head);

    const topic = document.createElement('div');
    topic.textContent = `Topic: ${article.topic}`;
    topic.style.fontSize = '12px';
    topic.style.color = theme.textDim;
    topic.style.marginBottom = '10px';
    topic.style.textTransform = 'capitalize';
    popover.appendChild(topic);

    const bodyText = document.createElement('div');
    bodyText.textContent = article.body;
    bodyText.style.fontSize = '13px';
    bodyText.style.lineHeight = '1.6';
    bodyText.style.whiteSpace = 'pre-wrap';
    bodyText.style.color = theme.text;
    popover.appendChild(bodyText);

    document.body.appendChild(popover);
  }

  function closePopover(): void {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  // Submit flow ---------------------------------------------------------------
  function buildContext(): ExpertContext {
    return {
      findings: services.compliance
        .listFindings()
        .map((f) => ({ id: f.id, title: f.title, severity: f.severity, status: f.status })),
      risks: services.compliance
        .listRisks()
        .map((r) => ({ id: r.id, finding: r.finding, inherentRisk: r.inherentRisk })),
      mode: currentMode,
    };
  }

  function submit(): void {
    const q = input.value.trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    askBtn.disabled = true;
    askBtn.style.opacity = '0.6';

    messages.push({ role: 'user', text: q, citations: [] });
    const pendingIdx = messages.length;
    messages.push({ role: 'expert', text: 'Thinking…', citations: [], pending: true });
    renderTranscript();

    const ctx = buildContext();
    askExpert(q, ctx)
      .then((answer: ExpertAnswer) => {
        const pending = messages[pendingIdx];
        if (pending) {
          pending.text = answer.text;
          pending.citations = answer.citations;
          pending.pending = false;
        }
      })
      .catch(() => {
        const pending = messages[pendingIdx];
        if (pending) {
          pending.text = 'Sorry, I could not produce an answer. Please try again.';
          pending.pending = false;
        }
      })
      .finally(() => {
        busy = false;
        askBtn.disabled = false;
        askBtn.style.opacity = '1';
        renderTranscript();
      });
  }

  // Boot ----------------------------------------------------------------------
  // Welcome message from the expert.
  messages.push({
    role: 'expert',
    text:
      "Hello — I'm your GRC Senior Expert. I can help you understand the findings in this lab, " +
      'frame them for executives, write policies, and produce audit reports.\n\n' +
      'Pick a mode above, then ask a question or tap a suggested question below. ' +
      'If Ollama is running locally I will generate grounded answers; otherwise I will ' +
      'quote the knowledge base directly.',
    citations: [],
  });

  renderTranscript();
  renderSuggestions();
  renderStatus();

  // Probe Ollama availability on window open, and warm up the model.
  expertAvailable()
    .then((ok) => {
      ollamaOnline = ok;
      probed = true;
      renderStatus();
      // Pre-load the model so the first real question is fast.
      if (ok) void warmUpModel();
    })
    .catch(() => {
      ollamaOnline = false;
      probed = true;
      renderStatus();
    });
}
