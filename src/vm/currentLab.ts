/**
 * vm/currentLab.ts — shared state for the lab the learner is currently working on.
 *
 * The Lab Generator writes here when it creates a lab, and the GRC Senior Expert
 * reads from here so it can guide the learner through *that* lab rather than
 * answering in the abstract.
 *
 * A lab is "current" from the moment it is generated until the learner clears
 * it or generates a new one. The expert uses it to ask about the specific step
 * the learner is on, not the general topic.
 */
import type { GeneratedLab } from '@/vm/labGenerator';

/** The lab the learner is working on right now, or null if none is active. */
let currentLab: GeneratedLab | null = null;

/** The step the learner is currently on (0-indexed). -1 means not started. */
let currentStep = -1;

/** Listeners notified when the current lab changes. */
const listeners = new Set<(lab: GeneratedLab | null, step: number) => void>();

/** Set the current lab. Called by the Lab Generator window. */
export function setLab(lab: GeneratedLab | null): void {
  currentLab = lab;
  currentStep = lab ? 0 : -1;
  for (const fn of listeners) fn(currentLab, currentStep);
}

/** Get the current lab, or null if none is active. */
export function getLab(): GeneratedLab | null {
  return currentLab;
}

/** Get the current step index (0-indexed), or -1 if no lab is active. */
export function getStep(): number {
  return currentStep;
}

/** Advance to the next step. Returns true if there is a next step. */
export function advanceStep(): boolean {
  if (!currentLab) return false;
  if (currentStep < currentLab.steps.length - 1) {
    currentStep += 1;
    for (const fn of listeners) fn(currentLab, currentStep);
    return true;
  }
  return false;
}

/** Go back to the previous step. Returns true if there is a previous step. */
export function retreatStep(): boolean {
  if (!currentLab || currentStep <= 0) return false;
  currentStep -= 1;
  for (const fn of listeners) fn(currentLab, currentStep);
  return true;
}

/** Subscribe to lab/step changes. Returns an unsubscribe function. */
export function onLabChange(fn: (lab: GeneratedLab | null, step: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A compact description of the current lab for the expert's prompt. */
export function labContextForPrompt(): string {
  if (!currentLab) return 'No lab is currently active.';
  const stepNum = currentStep >= 0 ? currentStep + 1 : 0;
  const totalSteps = currentLab.steps.length;
  const stepText = currentStep >= 0 && currentStep < currentLab.steps.length
    ? `Current step ${stepNum}/${totalSteps}: ${currentLab.steps[currentStep]}`
    : `Lab has ${totalSteps} steps.`;
  return [
    `Active lab: "${currentLab.title}" (${currentLab.category}, ${currentLab.difficulty})`,
    `Objective: ${currentLab.objective}`,
    stepText,
  ].join('\n');
}
