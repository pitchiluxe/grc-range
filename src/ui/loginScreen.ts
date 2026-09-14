/**
 * Windows 11 / Server 2022 style lock screen and sign-in prompt.
 *
 * The login screen has two phases:
 *
 *  1. **Lock screen** — a full-screen dark gradient with a large clock and
 *     date in the upper third. Clicking anywhere or pressing any key
 *     dismisses the lock screen and reveals the sign-in panel.
 *  2. **Sign-in panel** — a centered, glassmorphism card with a user avatar,
 *     username field (pre-filled with "admin"), password field, sign-in
 *     button, error area, and a password hint. On success the `onSuccess`
 *     callback fires; on failure the panel shakes and the error message is
 *     shown in red.
 *
 * All DOM is built with `createElement` / `style` — no external CSS files.
 * The Segoe UI font family and dark theme match the Windows Server 2022
 * aesthetic.
 */

import type { LoginSession } from '@/vm/loginSession';
import { logonChime, errorBeep, clickSound } from './sounds';

/** Public API for the login screen. */
export interface LoginScreen {
  /** Mount the lock screen into the DOM and start the clock. */
  present(): void;
  /** Remove the lock screen from the DOM and stop the clock. */
  destroy(): void;
}

/** The id used for the injected style element. */
const STYLE_ID = 'grc-login-style';

/** The id used for the root container element. */
const ROOT_ID = 'grc-login-root';

/**
 * Create and present the login screen.
 *
 * @param login    - The login session to authenticate against.
 * @param onSuccess - Called when the user successfully signs in.
 * @returns A {@link LoginScreen} handle whose `destroy()` removes the UI.
 */
export function createLoginScreen(
  login: LoginSession,
  onSuccess: () => void,
): LoginScreen {
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  let dismissed = false;

  // Inject the scoped CSS for the lock screen.
  injectStyles();

  // Root container.
  const root = document.createElement('div');
  root.id = ROOT_ID;

  // ---- Lock screen layer (clock + date, click/key to dismiss) -----------
  const lockLayer = document.createElement('div');
  lockLayer.className = 'grc-lock-layer';

  // Company wordmark at the top.
  const wordmark = document.createElement('div');
  wordmark.className = 'grc-wordmark';
  wordmark.textContent = 'GRC RANGE';

  const clockContainer = document.createElement('div');
  clockContainer.className = 'grc-lock-clock';

  const timeEl = document.createElement('div');
  timeEl.className = 'grc-lock-time';

  const dateEl = document.createElement('div');
  dateEl.className = 'grc-lock-date';

  clockContainer.appendChild(timeEl);
  clockContainer.appendChild(dateEl);
  lockLayer.appendChild(wordmark);
  lockLayer.appendChild(clockContainer);

  // "Press any key or click to continue" hint at the bottom.
  const hintEl = document.createElement('div');
  hintEl.className = 'grc-lock-hint';
  hintEl.textContent = 'Press any key or click to continue';
  lockLayer.appendChild(hintEl);

  // Footer with product version.
  const footerEl = document.createElement('div');
  footerEl.className = 'grc-login-footer';
  footerEl.textContent = 'GRC Range v1.0.0  \u00B7  Cybersecurity Training Lab';
  lockLayer.appendChild(footerEl);

  root.appendChild(lockLayer);

  // ---- Sign-in panel layer ---------------------------------------------
  const panelLayer = document.createElement('div');
  panelLayer.className = 'grc-panel-layer';

  const panel = document.createElement('div');
  panel.className = 'grc-panel';

  // Panel wordmark (smaller, above avatar).
  const panelWordmark = document.createElement('div');
  panelWordmark.className = 'grc-panel-wordmark';
  panelWordmark.textContent = 'GRC RANGE';

  // User avatar (circle with initials).
  const avatar = document.createElement('div');
  avatar.className = 'grc-avatar';
  avatar.textContent = 'A';

  // Username label (shows the pre-filled user).
  const userLabel = document.createElement('div');
  userLabel.className = 'grc-user-label';
  userLabel.textContent = 'admin';

  // Username input.
  const userInput = document.createElement('input');
  userInput.type = 'text';
  userInput.className = 'grc-input';
  userInput.value = 'admin';
  userInput.placeholder = 'Username';
  userInput.setAttribute('autocomplete', 'username');

  // Password input.
  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.className = 'grc-input';
  passInput.placeholder = 'Password';
  passInput.setAttribute('autocomplete', 'current-password');

  // Error message area.
  const errorEl = document.createElement('div');
  errorEl.className = 'grc-error';

  // Sign-in button.
  const signInBtn = document.createElement('button');
  signInBtn.className = 'grc-signin-btn';
  signInBtn.textContent = 'Sign in';
  signInBtn.type = 'button';

  // Password hint.
  const passHint = document.createElement('div');
  passHint.className = 'grc-pass-hint';
  passHint.textContent = 'Hint: The default password is "admin"';

  // Assemble the panel.
  panel.appendChild(panelWordmark);
  panel.appendChild(avatar);
  panel.appendChild(userLabel);
  panel.appendChild(userInput);
  panel.appendChild(passInput);
  panel.appendChild(errorEl);
  panel.appendChild(signInBtn);
  panel.appendChild(passHint);
  panelLayer.appendChild(panel);
  root.appendChild(panelLayer);

  // ---- Clock update -----------------------------------------------------
  function updateClock(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    timeEl.textContent = `${displayHours}:${minutes} ${ampm}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  }

  // ---- Dismiss the lock screen to reveal the sign-in panel --------------
  function dismissLock(): void {
    if (dismissed) return;
    dismissed = true;
    lockLayer.classList.add('grc-fade-out');
    panelLayer.classList.add('grc-fade-in');
    // Focus the password field after the transition.
    setTimeout(() => passInput.focus(), 300);
  }

  // ---- Attempt sign-in --------------------------------------------------
  function attemptSignIn(): void {
    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Please enter a username and password.';
      shakePanel();
      errorBeep();
      return;
    }

    const result = login.signIn(username, password);
    if (result.ok) {
      clickSound();
      logonChime();
      // Brief fade-out before handing control to the desktop.
      root.classList.add('grc-login-fade-out');
      setTimeout(() => {
        destroy();
        onSuccess();
      }, 400);
    } else {
      errorEl.textContent = result.message ?? 'Sign-in failed.';
      shakePanel();
      errorBeep();
      passInput.value = '';
      passInput.focus();
    }
  }

  /** Trigger the shake animation on the panel. */
  function shakePanel(): void {
    panel.classList.remove('grc-shake');
    // Force reflow so the animation restarts.
    void panel.offsetWidth;
    panel.classList.add('grc-shake');
  }

  // ---- Event listeners --------------------------------------------------
  function onLockClick(): void {
    dismissLock();
  }

  function onLockKey(): void {
    dismissLock();
  }

  function onSignInClick(): void {
    attemptSignIn();
  }

  function onPassKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptSignIn();
    }
  }

  function onUserKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      passInput.focus();
    }
  }

  // ---- Mount ------------------------------------------------------------
  function present(): void {
    // Reset state left over from a previous sign-in on this same instance
    // (the login screen is created once and re-presented after every
    // sign-out). Without this, the `grc-login-fade-out` class added by a
    // prior successful sign-in — whose animation ends with `forwards`,
    // permanently holding opacity at 0 — stays on `root` and the screen
    // re-mounts invisible.
    root.classList.remove('grc-login-fade-out');
    dismissed = false;
    lockLayer.classList.remove('grc-fade-out');
    panelLayer.classList.remove('grc-fade-in');
    errorEl.textContent = '';
    passInput.value = '';

    document.body.appendChild(root);
    updateClock();
    clockTimer = setInterval(updateClock, 1000);

    lockLayer.addEventListener('click', onLockClick);
    document.addEventListener('keydown', onLockKey, { once: true });
    signInBtn.addEventListener('click', onSignInClick);
    passInput.addEventListener('keydown', onPassKey);
    userInput.addEventListener('keydown', onUserKey);
  }

  // ---- Unmount ----------------------------------------------------------
  function destroy(): void {
    if (clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    lockLayer.removeEventListener('click', onLockClick);
    signInBtn.removeEventListener('click', onSignInClick);
    passInput.removeEventListener('keydown', onPassKey);
    userInput.removeEventListener('keydown', onUserKey);
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  return { present, destroy };
}

/* -------------------------------------------------------------------------- */
/* Scoped CSS injection                                                        */
/* -------------------------------------------------------------------------- */

/** Inject the login-screen CSS (idempotent). */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
/* ---- Root container ----------------------------------------------------- */

#grc-login-root {
  position: fixed;
  inset: 0;
  z-index: 100000;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
#grc-login-root.grc-login-fade-out {
  animation: grc-login-fade-out 0.4s ease forwards;
}
@keyframes grc-login-fade-out {
  to { opacity: 0; }
}

/* ---- Lock screen layer -------------------------------------------------- */

.grc-lock-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(47, 129, 247, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(31, 111, 235, 0.06) 0%, transparent 50%),
    linear-gradient(135deg, #0a0e17 0%, #131a2a 40%, #0d1117 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 10vh;
  cursor: pointer;
  transition: opacity 0.4s ease;
  z-index: 2;
}
.grc-lock-layer.grc-fade-out {
  opacity: 0;
  pointer-events: none;
}

.grc-wordmark {
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.35em;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  margin-bottom: 6vh;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);
}
.grc-wordmark::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 2px;
  background: rgba(47, 129, 247, 0.6);
  vertical-align: middle;
  margin-right: 12px;
  border-radius: 1px;
}
.grc-wordmark::after {
  content: '';
  display: inline-block;
  width: 24px;
  height: 2px;
  background: rgba(47, 129, 247, 0.6);
  vertical-align: middle;
  margin-left: 12px;
  border-radius: 1px;
}

.grc-lock-clock {
  text-align: center;
  color: #ffffff;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
}
.grc-lock-time {
  font-size: 96px;
  font-weight: 200;
  letter-spacing: -0.03em;
  line-height: 1;
}
.grc-lock-date {
  font-size: 22px;
  font-weight: 300;
  margin-top: 10px;
  opacity: 0.85;
  letter-spacing: 0.02em;
}

.grc-lock-hint {
  position: absolute;
  bottom: 10vh;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.04em;
  animation: grc-hint-pulse 2s ease-in-out infinite;
}
@keyframes grc-hint-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.75; }
}

.grc-login-footer {
  position: absolute;
  bottom: 3vh;
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

/* ---- Sign-in panel layer ------------------------------------------------ */

.grc-panel-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
  z-index: 1;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(47, 129, 247, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(31, 111, 235, 0.06) 0%, transparent 50%),
    linear-gradient(135deg, #0a0e17 0%, #131a2a 40%, #0d1117 100%);
}
.grc-panel-layer.grc-fade-in {
  opacity: 1;
  pointer-events: auto;
}

/* ---- Glassmorphism panel ------------------------------------------------ */

.grc-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 44px 32px;
  border-radius: 14px;
  background: rgba(22, 27, 34, 0.75);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  width: 360px;
  animation: grc-panel-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes grc-panel-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.grc-panel.grc-shake {
  animation: grc-shake 0.4s ease;
}
@keyframes grc-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}

/* ---- Panel wordmark ---------------------------------------------------- */

.grc-panel-wordmark {
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  margin-bottom: 2px;
}

/* ---- Avatar ------------------------------------------------------------- */

.grc-avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f81f7, #1f6feb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 600;
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(47, 129, 247, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.15);
}

/* ---- User label --------------------------------------------------------- */

.grc-user-label {
  font-size: 18px;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 2px;
  letter-spacing: 0.01em;
}

/* ---- Inputs ------------------------------------------------------------- */

.grc-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(13, 17, 23, 0.65);
  color: #e6edf3;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-sizing: border-box;
}
.grc-input:focus {
  border-color: #2f81f7;
  box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.2);
  background: rgba(13, 17, 23, 0.85);
}
.grc-input::placeholder {
  color: rgba(139, 148, 158, 0.5);
}

/* ---- Error message ------------------------------------------------------ */

.grc-error {
  font-size: 13px;
  color: #f85149;
  min-height: 18px;
  text-align: center;
  width: 100%;
  font-weight: 500;
}

/* ---- Sign-in button ----------------------------------------------------- */

.grc-signin-btn {
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: 0.02em;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f81f7, #1f6feb);
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.06s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 14px rgba(47, 129, 247, 0.3);
}
.grc-signin-btn:hover {
  background: linear-gradient(135deg, #3a91ff, #2a7af0);
  box-shadow: 0 6px 20px rgba(47, 129, 247, 0.4);
}
.grc-signin-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(47, 129, 247, 0.3);
}

/* ---- Password hint ------------------------------------------------------ */

.grc-pass-hint {
  font-size: 11px;
  color: rgba(139, 148, 158, 0.45);
  text-align: center;
  margin-top: 2px;
  letter-spacing: 0.02em;
}
  `;
  document.head.appendChild(style);
}
