/**
 * main.ts — boots the GRC Range workstation.
 *
 * Order matters: the lock screen comes first, and the desktop is only built
 * once someone has authenticated. What they see depends on who they are —
 * IT, Security, and Audit staff get the audit tooling; everyone else gets
 * a standard corporate desktop.
 */
import { createDesktopOverlay, type WindowDef } from '@/ui/desktopOverlay';
import { createLoginScreen } from '@/ui/loginScreen';
import { session, type GrcServices } from '@/vm/session';
import { login } from '@/vm/loginSession';
import { logoffChime } from '@/ui/sounds';
import { applyTheme } from '@/ui/themes';
import { installAppChrome } from '@/ui/appChrome';
import { appsForDepartment } from '@/config/desktopProfiles';
import { PRODUCT } from '@/config/product';

// Console windows
import { renderFileExplorerWindow } from '@/ui/consoles/fileExplorerWindow';
import { renderAuditConsoleWindow } from '@/ui/consoles/auditConsole';
import { renderComplianceMapperWindow } from '@/ui/consoles/complianceMapper';
import { renderRiskRegisterWindow } from '@/ui/consoles/riskRegister';
import { renderRemediationConsoleWindow } from '@/ui/consoles/remediationConsole';
import { renderTerminalWindow } from '@/ui/consoles/terminalWindow';
import { renderScriptEditorWindow } from '@/ui/consoles/scriptEditorWindow';
import { renderNotepadWindow } from '@/ui/consoles/notepadWindow';
import { renderBrowserWindow } from '@/ui/consoles/browserWindow';
import { renderSettingsWindow } from '@/ui/consoles/settingsWindow';
import { renderControlPanelWindow } from '@/ui/consoles/controlPanelWindow';
import { renderRecycleBinWindow } from '@/ui/consoles/recycleBinWindow';
import { renderCalculatorWindow } from '@/ui/consoles/calculatorWindow';
import { renderManualWindow } from '@/ui/consoles/manualWindow';
import { renderEvidencePackWindow } from '@/ui/consoles/evidencePackWindow';
import { renderSecOpsDashboardWindow } from '@/ui/consoles/secOpsDashboard';
import { renderGrcExpertWindow } from '@/ui/consoles/grcExpertWindow';
import { renderLabGeneratorWindow } from '@/ui/consoles/labGeneratorWindow';

// Before anything paints: apply theme and shared chrome.
applyTheme();
installAppChrome();

// ---------------------------------------------------------------------------
// All applications the desktop can show.
// ---------------------------------------------------------------------------
const ALL_APPS: WindowDef[] = [
  {
    id: 'audit-console',
    title: 'Audit Console',
    icon: '🔍',
    width: 960,
    height: 640,
    render: (s, b) => renderAuditConsoleWindow(b, s),
  },
  {
    id: 'compliance-mapper',
    title: 'Compliance Mapper',
    icon: '📋',
    width: 920,
    height: 620,
    render: (s, b) => renderComplianceMapperWindow(b, s),
  },
  {
    id: 'risk-register',
    title: 'Risk Register',
    icon: '⚠️',
    width: 880,
    height: 640,
    render: (s, b) => renderRiskRegisterWindow(b, s),
  },
  {
    id: 'remediation-console',
    title: 'Remediation Console',
    icon: '🔧',
    width: 820,
    height: 600,
    render: (s, b) => renderRemediationConsoleWindow(b, s),
  },
  {
    id: 'evidence-pack',
    title: 'Evidence Pack',
    icon: '📦',
    width: 780,
    height: 600,
    render: (s, b) => renderEvidencePackWindow(b, s),
  },
  {
    id: 'secops-dashboard',
    title: 'SecOps Dashboard',
    icon: '🛡️',
    width: 800,
    height: 560,
    render: (s, b) => renderSecOpsDashboardWindow(b, s),
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: '>_',
    width: 760,
    height: 520,
    render: (s, b) => renderTerminalWindow(b, s),
  },
  {
    id: 'script-editor',
    title: 'PowerShell ISE',
    icon: '📜',
    width: 900,
    height: 640,
    render: (s, b) => renderScriptEditorWindow(b, s),
  },
  {
    id: 'explorer',
    title: 'File Explorer',
    icon: '📁',
    width: 760,
    height: 540,
    render: (s, b) => renderFileExplorerWindow(b, s),
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: '📝',
    width: 560,
    height: 480,
    render: (_s, b) => renderNotepadWindow(b, _s),
  },
  {
    id: 'browser',
    title: 'Browser',
    icon: '🌐',
    width: 900,
    height: 640,
    render: (_s, b) => renderBrowserWindow(b, _s),
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    width: 640,
    height: 520,
    render: (s, b) => renderSettingsWindow(b, s),
  },
  {
    id: 'control-panel',
    title: 'Control Panel',
    icon: '🎛️',
    width: 680,
    height: 520,
    render: (s, b) => renderControlPanelWindow(b, s),
  },
  {
    id: 'manual',
    title: 'GRC Range Manual',
    icon: '📖',
    width: 900,
    height: 660,
    render: (_s, b) => renderManualWindow(b, _s),
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '🧮',
    width: 320,
    height: 440,
    render: (_s, b) => renderCalculatorWindow(b, _s),
  },
  {
    id: 'recycle-bin',
    title: 'Recycle Bin',
    icon: '🗑️',
    width: 600,
    height: 400,
    render: (_s, b) => renderRecycleBinWindow(b, _s),
  },
  {
    id: 'grc-expert',
    title: 'GRC Senior Expert',
    icon: '🧠',
    width: 720,
    height: 600,
    render: (s, b) => renderGrcExpertWindow(b, s),
  },
  {
    id: 'lab-generator',
    title: 'Lab Generator',
    icon: '🎓',
    width: 780,
    height: 640,
    render: (s, b) => renderLabGeneratorWindow(b, s),
  },
];

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const appEl = document.getElementById('app');
if (!appEl) throw new Error('[grc] #app container is missing from index.html');

const desktop = createDesktopOverlay(ALL_APPS);

/** Show the desktop for the signed-in user, filtered by their department. */
function showDesktop(): void {
  const dept = login.department || 'IT';
  const allowedIds = new Set<string>(appsForDepartment(dept));
  const visibleApps = ALL_APPS.filter((a) => allowedIds.has(a.id));
  // Re-create the desktop with the filtered app set so the Start menu and
  // desktop icons only show what this department should see.
  const filteredDesktop = createDesktopOverlay(visibleApps);
  filteredDesktop.show(session as GrcServices, dept, login.user?.username);
  filteredDesktop.onExit = signOut;
}

function signOut(): void {
  logoffChime();
  login.signOut();
  loginScreen.present();
}

const loginScreen = createLoginScreen(login, showDesktop);

loginScreen.present();

/** Dev/test hook. */
(
  window as unknown as {
    __grc: { session: typeof session; login: typeof login; signOut: () => void; reset: () => void };
  }
).__grc = {
  session,
  login,
  signOut,
  reset: () => {
    session.reset();
    if (login.isSignedIn) showDesktop();
  },
};
