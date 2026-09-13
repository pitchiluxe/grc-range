/**
 * Landing screen — the first thing the user sees when the app loads.
 *
 * A professional marketing/landing page with GRC animations, feature highlights,
 * and a "Launch Lab" button that transitions to the login screen. Modeled on
 * the standalone landing.html but integrated into the app's DOM flow so it
 * appears before the Windows lock screen.
 */

/** Public API for the landing screen. */
export interface LandingScreen {
  /** Mount the landing page into the DOM. */
  present(): void;
  /** Remove the landing page from the DOM. */
  destroy(): void;
}

/** The id used for the root container element. */
const ROOT_ID = 'grc-landing-root';

/** The id used for the injected style element. */
const STYLE_ID = 'grc-landing-style';

/** The full CSS for the landing page. */
const LANDING_CSS = `
#grc-landing-root {
  position: fixed; inset: 0; z-index: 100000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d1117; color: #e6edf3; overflow-y: auto; overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
#grc-landing-root * { box-sizing: border-box; }

/* Animated background */
.grc-landing-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(47, 129, 247, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47, 129, 247, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: grc-grid-move 20s linear infinite;
}
@keyframes grc-grid-move {
  0% { background-position: 0 0; }
  100% { background-position: 50px 50px; }
}
.grc-landing-glow {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 20% 20%, rgba(47, 129, 247, 0.08), transparent),
    radial-gradient(ellipse 50% 50% at 80% 80%, rgba(163, 113, 247, 0.06), transparent);
}

/* Floating badges */
.grc-landing-badges { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.grc-landing-badge {
  position: absolute; padding: 8px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; border: 1px solid #30363d;
  background: rgba(22, 27, 34, 0.6); backdrop-filter: blur(8px);
  opacity: 0; animation: grc-float-badge 12s ease-in-out infinite;
}
@keyframes grc-float-badge {
  0%, 100% { opacity: 0; transform: translateY(20px); }
  20%, 80% { opacity: 0.5; transform: translateY(0); }
}

/* Nav */
.grc-landing-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
  background: rgba(13, 17, 23, 0.7); backdrop-filter: blur(16px) saturate(150%);
  border-bottom: 1px solid #21262d;
}
.grc-landing-logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
.grc-landing-nav-links { display: flex; gap: 24px; align-items: center; }
.grc-landing-nav-links a { color: #8b949e; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.grc-landing-nav-links a:hover { color: #e6edf3; }

/* Hero */
.grc-landing-hero {
  position: relative; z-index: 2; min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 80px 24px 40px;
}
.grc-landing-hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 20px;
  background: rgba(47, 129, 247, 0.1); border: 1px solid rgba(47, 129, 247, 0.3);
  font-size: 13px; color: #2f81f7; font-weight: 500; margin-bottom: 24px;
  animation: grc-fade-down 0.8s ease;
}
.grc-landing-hero-badge::before {
  content: ''; width: 8px; height: 8px; border-radius: 50%;
  background: #3fb950; animation: grc-pulse 2s ease infinite;
}
@keyframes grc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.grc-landing-shield { position: relative; width: 180px; height: 180px; margin-bottom: 32px; animation: grc-fade-up 0.8s ease 0.05s both; }
.grc-landing-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid rgba(47, 129, 247, 0.2);
  animation: grc-spin-ring 8s linear infinite;
}
.grc-landing-ring:nth-child(2) { inset: 15px; animation-duration: 6s; animation-direction: reverse; border-color: rgba(163, 113, 247, 0.15); }
.grc-landing-ring:nth-child(3) { inset: 30px; animation-duration: 4s; border-color: rgba(57, 197, 207, 0.1); }
@keyframes grc-spin-ring { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.grc-landing-hero h1 {
  font-size: clamp(36px, 6vw, 60px); font-weight: 800; line-height: 1.1;
  letter-spacing: -0.03em; max-width: 900px; margin-bottom: 20px;
  animation: grc-fade-up 0.8s ease 0.1s both;
}
.grc-landing-gradient {
  background: linear-gradient(135deg, #2f81f7, #a371f7, #39c5cf);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.grc-landing-hero p {
  font-size: clamp(16px, 2.5vw, 20px); color: #8b949e; max-width: 640px;
  margin-bottom: 36px; animation: grc-fade-up 0.8s ease 0.2s both;
}

/* CTA */
.grc-landing-cta { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; animation: grc-fade-up 0.8s ease 0.3s both; }
.grc-landing-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;
  text-decoration: none; cursor: pointer; border: none; transition: all 0.2s ease;
  font-family: inherit;
}
.grc-landing-btn-primary {
  background: #2f81f7; color: #fff;
  box-shadow: 0 4px 20px rgba(47, 129, 247, 0.3);
}
.grc-landing-btn-primary:hover { background: #1f6feb; transform: translateY(-2px); box-shadow: 0 6px 28px rgba(47, 129, 247, 0.4); }
.grc-landing-btn-secondary {
  background: #1c2330; color: #e6edf3; border: 1px solid #30363d;
}
.grc-landing-btn-secondary:hover { background: #161b22; border-color: #8b949e; transform: translateY(-2px); }

/* Stats */
.grc-landing-stats { display: flex; gap: 40px; margin-top: 48px; flex-wrap: wrap; justify-content: center; animation: grc-fade-up 0.8s ease 0.4s both; }
.grc-landing-stat { text-align: center; }
.grc-landing-stat-num { font-size: 28px; font-weight: 700; color: #e6edf3; }
.grc-landing-stat-label { font-size: 13px; color: #8b949e; margin-top: 4px; }

/* Sections */
.grc-landing-section { position: relative; z-index: 2; padding: 80px 24px; max-width: 1200px; margin: 0 auto; }
.grc-landing-section-title { text-align: center; margin-bottom: 16px; }
.grc-landing-section-title h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 700; letter-spacing: -0.02em; }
.grc-landing-section-title p { font-size: 16px; color: #8b949e; margin-top: 8px; max-width: 600px; margin-left: auto; margin-right: auto; }

/* Features grid */
.grc-landing-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 48px; }
.grc-landing-feature {
  padding: 28px; border-radius: 12px; background: #161b22;
  border: 1px solid #21262d; transition: all 0.3s ease;
}
.grc-landing-feature:hover { border-color: #30363d; transform: translateY(-4px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.grc-landing-feature-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
.grc-landing-feature h3 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.grc-landing-feature p { font-size: 14px; color: #8b949e; line-height: 1.6; }

/* Frameworks */
.grc-landing-frameworks { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 40px; }
.grc-landing-fw-chip {
  padding: 10px 20px; border-radius: 24px; font-size: 14px; font-weight: 600;
  background: #161b22; border: 1px solid #21262d;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s;
}
.grc-landing-fw-chip:hover { border-color: #2f81f7; transform: translateY(-2px); }

/* Footer */
.grc-landing-footer {
  position: relative; z-index: 2; text-align: center; padding: 40px 24px;
  border-top: 1px solid #21262d; color: #8b949e; font-size: 14px;
}
.grc-landing-footer a { color: #2f81f7; text-decoration: none; }

/* Contact */
.grc-landing-contact { display: flex; gap: 48px; align-items: flex-start; max-width: 1000px; margin: 48px auto 0; flex-wrap: wrap; }
.grc-landing-contact-info { flex: 1; min-width: 280px; text-align: center; }
.grc-landing-avatar { width: 140px; height: 140px; border-radius: 50%; margin: 0 auto 20px; border: 3px solid #2f81f7; box-shadow: 0 4px 24px rgba(47,129,247,0.3); object-fit: cover; }
.grc-landing-contact-info h3 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.grc-landing-contact-role { font-size: 14px; color: #8b949e; margin-bottom: 20px; }
.grc-landing-socials { display: flex; gap: 16px; justify-content: center; margin-top: 16px; }
.grc-landing-social { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1c2330; border: 1px solid #30363d; color: #8b949e; transition: all 0.2s; text-decoration: none; }
.grc-landing-social:hover { transform: translateY(-3px); border-color: #2f81f7; color: #2f81f7; }
.grc-landing-contact-form-wrap { flex: 1.5; min-width: 320px; }
.grc-landing-contact-form { display: flex; flex-direction: column; gap: 14px; padding: 32px; border-radius: 16px; background: #161b22; border: 1px solid #30363d; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.grc-landing-contact-form input, .grc-landing-contact-form textarea { padding: 12px 16px; border-radius: 8px; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; font-size: 14px; font-family: inherit; }
.grc-landing-contact-form input:focus, .grc-landing-contact-form textarea:focus { outline: none; border-color: #2f81f7; }
.grc-landing-contact-form textarea { resize: vertical; min-height: 120px; }
.grc-landing-contact-form button { padding: 14px 24px; border-radius: 10px; background: #2f81f7; color: #fff; border: none; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.grc-landing-contact-form button:hover { background: #1f6feb; transform: translateY(-1px); }
.grc-landing-contact-form button:disabled { opacity: 0.6; cursor: not-allowed; }
.grc-landing-contact-success { padding: 16px; border-radius: 8px; background: rgba(63,185,80,0.1); border: 1px solid rgba(63,185,80,0.3); color: #3fb950; text-align: center; font-size: 14px; display: none; }
.grc-landing-contact-error { padding: 16px; border-radius: 8px; background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3); color: #f85149; text-align: center; font-size: 14px; display: none; }

/* Animations */
@keyframes grc-fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes grc-fade-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

/* Mobile */
@media (max-width: 768px) {
  .grc-landing-nav { padding: 12px 16px; }
  .grc-landing-nav-links a:not(.grc-landing-nav-cta) { display: none; }
  .grc-landing-hero { padding: 70px 16px 24px; }
  .grc-landing-shield { width: 130px; height: 130px; }
  .grc-landing-stats { gap: 24px; }
  .grc-landing-stat-num { font-size: 22px; }
  .grc-landing-section { padding: 60px 16px; }
  .grc-landing-features { grid-template-columns: 1fr; }
  .grc-landing-badges { display: none; }
  .grc-landing-contact { flex-direction: column; gap: 32px; }
  .grc-landing-contact-form { padding: 24px 20px; }
}
@media (max-width: 480px) {
  .grc-landing-hero h1 { font-size: 32px; }
  .grc-landing-cta { flex-direction: column; width: 100%; }
  .grc-landing-btn { width: 100%; justify-content: center; }
}
`;

/** Floating compliance badge data. */
const BADGES = [
  { text: 'PCI-DSS', color: '#2f81f7', top: '12%', left: '8%', delay: 0 },
  { text: 'HIPAA', color: '#3fb950', top: '25%', left: '85%', delay: 1.5 },
  { text: 'GDPR', color: '#a371f7', top: '55%', left: '5%', delay: 3 },
  { text: 'ISO 27001', color: '#d29922', top: '70%', left: '88%', delay: 4.5 },
  { text: 'NIST CSF', color: '#39c5cf', top: '40%', left: '92%', delay: 6 },
  { text: 'SOC 2', color: '#f85149', top: '82%', left: '12%', delay: 7.5 },
];

/** Feature card data. */
const FEATURES = [
  { icon: '🧠', color: '#a371f7', title: 'AI GRC Senior Expert', desc: 'An Ollama-powered tutor that guides you through labs without giving answers. Socratic, explain, and walkthrough modes.' },
  { icon: '🖥️', color: '#2f81f7', title: 'Simulated Windows Desktop', desc: 'A full Windows Server 2022 desktop with File Explorer, Terminal, PowerShell ISE, Control Panel, and more.' },
  { icon: '🔍', color: '#3fb950', title: 'Audit Console', desc: 'Discover vulnerabilities across users, firewall, password policy, file ACLs, audit logs, and CIS benchmarks.' },
  { icon: '📋', color: '#d29922', title: 'Compliance Mapper', desc: 'Map every finding to PCI-DSS, HIPAA, GDPR, ISO 27001, NIST CSF, CIS, and SOC 2 with control citations.' },
  { icon: '📊', color: '#f85149', title: 'Risk Register', desc: '5×5 risk matrix with likelihood/impact scoring, control strategies, and residual risk tracking.' },
  { icon: '🔧', color: '#39c5cf', title: 'Remediation Console', desc: 'Fix ACLs, disable firewall rules, strengthen password policy, and remove unjustified admin accounts.' },
  { icon: '📦', color: '#6e7bf7', title: 'Evidence Pack', desc: 'Collect audit evidence, generate findings reports, and assemble a complete audit package.' },
  { icon: '🎓', color: '#3fb950', title: 'Dynamic Lab Generation', desc: 'AI generates custom lab exercises based on your current findings and risk register.' },
  { icon: '📄', color: '#a371f7', title: 'Policy Writing', desc: 'Draft access control and acceptable use policies aligned to your findings and controls.' },
];

/** Framework chip data. */
const FRAMEWORKS = [
  { name: 'PCI-DSS', color: '#2f81f7' },
  { name: 'HIPAA', color: '#3fb950' },
  { name: 'GDPR', color: '#a371f7' },
  { name: 'ISO 27001', color: '#d29922' },
  { name: 'NIST CSF', color: '#39c5cf' },
  { name: 'CIS Benchmarks', color: '#f85149' },
  { name: 'SOC 2 Type II', color: '#6e7bf7' },
];

/** The GitHub repo URL. */
const GITHUB_URL = 'https://github.com/pitchiluxe/grc-range';

/**
 * Create and present the landing screen.
 *
 * @param onLaunch Called when the user clicks "Launch Lab".
 * @returns A {@link LandingScreen} handle whose `destroy()` removes the UI.
 */
export function createLandingScreen(onLaunch: () => void): LandingScreen {
  injectStyles();

  const root = document.createElement('div');
  root.id = ROOT_ID;

  // ---- Background ----
  const grid = document.createElement('div');
  grid.className = 'grc-landing-grid';
  root.appendChild(grid);

  const glow = document.createElement('div');
  glow.className = 'grc-landing-glow';
  root.appendChild(glow);

  // ---- Floating badges ----
  const badgesEl = document.createElement('div');
  badgesEl.className = 'grc-landing-badges';
  for (const b of BADGES) {
    const el = document.createElement('div');
    el.className = 'grc-landing-badge';
    el.textContent = b.text;
    el.style.top = b.top;
    el.style.left = b.left;
    el.style.animationDelay = `${b.delay}s`;
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.color};margin-right:8px`;
    el.prepend(dot);
    badgesEl.appendChild(el);
  }
  root.appendChild(badgesEl);

  // ---- Nav ----
  const nav = document.createElement('nav');
  nav.className = 'grc-landing-nav';
  const logo = document.createElement('div');
  logo.className = 'grc-landing-logo';
  logo.innerHTML = `<svg width="32" height="32" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 28 L208 56 V128 C208 180 168 216 128 228 C88 216 48 180 48 128 V56 Z" fill="#1f6feb" stroke="#2f81f7" stroke-width="3"/>
    <path d="M100 128 L120 148 L168 96" fill="none" stroke="#3fb950" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  </svg> GRC Range`;
  nav.appendChild(logo);

  const navLinks = document.createElement('div');
  navLinks.className = 'grc-landing-nav-links';
  navLinks.innerHTML = `
    <a href="#features">Features</a>
    <a href="#frameworks">Frameworks</a>
    <a href="#download">Download</a>
    <a href="#contact">Contact</a>
    <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="grc-landing-nav-cta" style="padding:8px 18px;border-radius:8px;background:#2f81f7;color:#fff;font-weight:600">GitHub</a>
  `;
  nav.appendChild(navLinks);
  root.appendChild(nav);

  // ---- Hero ----
  const hero = document.createElement('section');
  hero.className = 'grc-landing-hero';

  const heroBadge = document.createElement('div');
  heroBadge.className = 'grc-landing-hero-badge';
  heroBadge.textContent = 'AI-Powered GRC Training with Ollama';
  hero.appendChild(heroBadge);

  // Animated shield
  const shield = document.createElement('div');
  shield.className = 'grc-landing-shield';
  shield.innerHTML = `
    <div class="grc-landing-ring"></div>
    <div class="grc-landing-ring"></div>
    <div class="grc-landing-ring"></div>
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <defs>
        <linearGradient id="grc-landing-shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2f81f7"/>
          <stop offset="100%" stop-color="#1f6feb"/>
        </linearGradient>
      </defs>
      <path d="M128 28 L208 56 V128 C208 180 168 216 128 228 C88 216 48 180 48 128 V56 Z" fill="url(#grc-landing-shield-grad)" stroke="#388bfd" stroke-width="2"/>
      <path d="M100 128 L120 148 L168 96" fill="none" stroke="#3fb950" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  hero.appendChild(shield);

  const h1 = document.createElement('h1');
  h1.innerHTML = 'Master <span class="grc-landing-gradient">Cybersecurity GRC</span><br>Through Hands-On Practice';
  hero.appendChild(h1);

  const heroP = document.createElement('p');
  heroP.textContent = 'A simulated Windows Server 2022 desktop environment for practicing compliance audits, risk management, and policy enforcement across 7 major frameworks — guided by an AI Senior Expert.';
  hero.appendChild(heroP);

  // CTA buttons
  const cta = document.createElement('div');
  cta.className = 'grc-landing-cta';

  const githubBtn = document.createElement('a');
  githubBtn.className = 'grc-landing-btn grc-landing-btn-primary';
  githubBtn.href = GITHUB_URL + '/releases/latest';
  githubBtn.target = '_blank';
  githubBtn.rel = 'noopener';
  githubBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/></svg> Download for Free`;
  cta.appendChild(githubBtn);

  const viewGithubBtn = document.createElement('a');
  viewGithubBtn.className = 'grc-landing-btn grc-landing-btn-secondary';
  viewGithubBtn.href = GITHUB_URL;
  viewGithubBtn.target = '_blank';
  viewGithubBtn.rel = 'noopener';
  viewGithubBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> View on GitHub`;
  cta.appendChild(viewGithubBtn);
  hero.appendChild(cta);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'grc-landing-stats';
  const statData = [
    { num: '7', label: 'Compliance Frameworks' },
    { num: '16+', label: 'Desktop Tools' },
    { num: 'AI', label: 'Senior Expert Tutor' },
    { num: '100%', label: 'Free & Open Source' },
  ];
  for (const s of statData) {
    const el = document.createElement('div');
    el.className = 'grc-landing-stat';
    el.innerHTML = `<div class="grc-landing-stat-num">${s.num}</div><div class="grc-landing-stat-label">${s.label}</div>`;
    stats.appendChild(el);
  }
  hero.appendChild(stats);
  root.appendChild(hero);

  // ---- Features section ----
  const featuresSection = document.createElement('section');
  featuresSection.id = 'features';
  featuresSection.className = 'grc-landing-section';
  featuresSection.innerHTML = `
    <div class="grc-landing-section-title">
      <h2>Everything You Need to Master GRC</h2>
      <p>A complete cybersecurity governance, risk, and compliance training environment in a single app.</p>
    </div>
  `;
  const featuresGrid = document.createElement('div');
  featuresGrid.className = 'grc-landing-features';
  for (const f of FEATURES) {
    const card = document.createElement('div');
    card.className = 'grc-landing-feature';
    card.innerHTML = `
      <div class="grc-landing-feature-icon" style="background:${f.color}22;color:${f.color}">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    `;
    featuresGrid.appendChild(card);
  }
  featuresSection.appendChild(featuresGrid);
  root.appendChild(featuresSection);

  // ---- Frameworks section ----
  const fwSection = document.createElement('section');
  fwSection.id = 'frameworks';
  fwSection.className = 'grc-landing-section';
  fwSection.innerHTML = `
    <div class="grc-landing-section-title">
      <h2>7 Compliance Frameworks</h2>
      <p>Map findings to the frameworks that matter in real audits.</p>
    </div>
  `;
  const fwList = document.createElement('div');
  fwList.className = 'grc-landing-frameworks';
  for (const fw of FRAMEWORKS) {
    const chip = document.createElement('div');
    chip.className = 'grc-landing-fw-chip';
    chip.innerHTML = `<span style="background:${fw.color};width:10px;height:10px;border-radius:50%;display:inline-block"></span> ${fw.name}`;
    fwList.appendChild(chip);
  }
  fwSection.appendChild(fwList);
  root.appendChild(fwSection);

  // ---- Download section ----
  const dlSection = document.createElement('section');
  dlSection.id = 'download';
  dlSection.className = 'grc-landing-section';
  dlSection.innerHTML = `
    <div class="grc-landing-section-title">
      <h2>Download GRC Range</h2>
      <p>Free and open source. Available for Windows, macOS, and Linux.</p>
    </div>
    <div style="max-width:560px;margin:48px auto 0;padding:40px;border-radius:16px;background:#161b22;border:1px solid #30363d;box-shadow:0 8px 40px rgba(0,0,0,0.4);text-align:center">
      <h3 style="font-size:24px;font-weight:700;margin-bottom:12px">Get the Installer</h3>
      <p style="color:#8b949e;margin-bottom:24px">Download the latest release with auto-update support. The app runs fully offline — your data never leaves your machine.</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <a href="${GITHUB_URL}/releases/latest" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:10px;background:#1c2330;border:1px solid #30363d;color:#e6edf3;text-decoration:none;font-size:14px;font-weight:500;transition:all 0.2s">
          <span style="font-size:24px">🪟</span>
          <span style="flex:1;text-align:left"><div style="font-weight:600">Windows Installer (.exe)</div><div style="font-size:12px;color:#8b949e">Auto-updates · 64-bit · ~85 MB</div></span>
        </a>
        <a href="${GITHUB_URL}/releases/latest" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:10px;background:#1c2330;border:1px solid #30363d;color:#e6edf3;text-decoration:none;font-size:14px;font-weight:500;transition:all 0.2s">
          <span style="font-size:24px">🍎</span>
          <span style="flex:1;text-align:left"><div style="font-weight:600">macOS Installer (.dmg)</div><div style="font-size:12px;color:#8b949e">Auto-updates · Universal · ~90 MB</div></span>
        </a>
        <a href="${GITHUB_URL}/releases/latest" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:10px;background:#1c2330;border:1px solid #30363d;color:#e6edf3;text-decoration:none;font-size:14px;font-weight:500;transition:all 0.2s">
          <span style="font-size:24px">🐧</span>
          <span style="flex:1;text-align:left"><div style="font-weight:600">Linux AppImage</div><div style="font-size:12px;color:#8b949e">Auto-updates · x64 · ~85 MB</div></span>
        </a>
      </div>
      <p style="margin-top:20px;font-size:13px;color:#8b949e">Or run locally with <code style="background:#0d1117;padding:2px 6px;border-radius:4px;font-size:12px">npm install && npm run dev</code></p>
    </div>
  `;
  root.appendChild(dlSection);

  // ---- Contact section ----
  const contactSection = document.createElement('section');
  contactSection.id = 'contact';
  contactSection.className = 'grc-landing-section';
  contactSection.innerHTML = `
    <div class="grc-landing-section-title">
      <h2>Get in Touch</h2>
      <p>Questions about GRC Range? Want to collaborate? Send a message.</p>
    </div>
    <div class="grc-landing-contact">
      <div class="grc-landing-contact-info">
        <img src="Erick.jpg" alt="Erick Omari" class="grc-landing-avatar" />
        <h3>Erick Omari</h3>
        <div class="grc-landing-contact-role">Founder · Cybersecurity GRC Specialist · Pitchiluxe LLC</div>
        <div class="grc-landing-socials">
          <a href="https://www.linkedin.com/in/erickomari" target="_blank" rel="noopener" class="grc-landing-social" title="LinkedIn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
          </a>
          <a href="https://twitter.com/eomari" target="_blank" rel="noopener" class="grc-landing-social" title="Twitter / X">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://github.com/pitchiluxe" target="_blank" rel="noopener" class="grc-landing-social" title="GitHub">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          </a>
        </div>
      </div>
      <div class="grc-landing-contact-form-wrap">
        <form class="grc-landing-contact-form" id="grc-contact-form">
          <input type="text" name="name" placeholder="Your Name" required />
          <input type="email" name="email" placeholder="Your Email" required />
          <input type="text" name="subject" placeholder="Subject" required />
          <textarea name="message" placeholder="Your Message" required></textarea>
          <button type="submit" id="grc-contact-submit">Send Message</button>
          <div class="grc-landing-contact-success" id="grc-contact-success">✓ Message sent! I'll get back to you soon.</div>
          <div class="grc-landing-contact-error" id="grc-contact-error">✗ Something went wrong. Please try again or reach out on social media.</div>
        </form>
      </div>
    </div>
  `;
  root.appendChild(contactSection);

  // Wire up the contact form
  const contactForm = contactSection.querySelector('#grc-contact-form') as HTMLFormElement;
  const contactSubmit = contactSection.querySelector('#grc-contact-submit') as HTMLButtonElement;
  const contactSuccess = contactSection.querySelector('#grc-contact-success') as HTMLElement;
  const contactError = contactSection.querySelector('#grc-contact-error') as HTMLElement;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    contactSubmit.disabled = true;
    contactSubmit.textContent = 'Sending...';
    contactSuccess.style.display = 'none';
    contactError.style.display = 'none';

    const data = new FormData(contactForm);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      subject: data.get('subject'),
      message: data.get('message'),
    };

    try {
      const response = await fetch('https://formsubmit.co/ajax/ZXJpY2tvbWFyaTI0M0BnbWFpbC5jb20=', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...payload,
          _template: 'table',
          _subject: 'GRC Range Contact: ' + payload.subject,
        }),
      });
      if (response.ok) {
        contactSuccess.style.display = 'block';
        contactForm.reset();
      } else {
        contactError.style.display = 'block';
      }
    } catch {
      const email = atob('ZXJpY2tvbWFyaTI0M0BnbWFpbC5jb20=');
      const body = encodeURIComponent('Name: ' + payload.name + '\nEmail: ' + payload.email + '\n\n' + payload.message);
      const subject = encodeURIComponent('GRC Range Contact: ' + payload.subject);
      window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
      contactSuccess.style.display = 'block';
      contactForm.reset();
    }
    contactSubmit.disabled = false;
    contactSubmit.textContent = 'Send Message';
  });

  // ---- Footer ----
  const footer = document.createElement('footer');
  footer.className = 'grc-landing-footer';
  footer.innerHTML = `
    <p>GRC Range — Open Source Cybersecurity GRC Training Lab</p>
    <p style="margin-top:8px"><a href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a> · <a href="${GITHUB_URL}/releases" target="_blank" rel="noopener">Releases</a> · MIT License</p>
    <p style="margin-top:8px;font-size:12px">Built for GRC analysts, auditors, and security professionals.</p>
  `;
  root.appendChild(footer);

  document.body.appendChild(root);

  return {
    present() {
      // Already mounted by createLandingScreen.
    },
    destroy() {
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}

/** Inject the landing page CSS (idempotent). */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = LANDING_CSS;
  document.head.appendChild(style);
}
