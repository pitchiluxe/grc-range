# GRC Range — Cybersecurity GRC Training Lab

A simulated Windows Server 2022 desktop environment for practicing Governance, Risk, and Compliance (GRC) audits, risk assessment, and remediation across 7 major frameworks.

## Download

Download the latest installer from the [releases page](https://github.com/pitchiluxe/grc-range/releases/latest).

- **Windows**: `GRC Range Setup.exe` (NSIS installer with auto-update)
- **macOS**: `GRC Range.dmg`
- **Linux**: `GRC Range.AppImage`

## Features

- **Simulated Windows Desktop** — Full Windows Server 2022 environment with 16+ tools
- **AI GRC Senior Expert** — Ollama-powered tutor that guides without giving answers
- **Dynamic Lab Generation** — AI generates custom labs based on your findings
- **7 Compliance Frameworks** — PCI-DSS, HIPAA, GDPR, ISO 27001, NIST CSF, CIS, SOC 2
- **Audit Console** — Discover vulnerabilities across users, firewall, passwords, ACLs
- **Risk Register** — 5x5 risk matrix with likelihood/impact scoring
- **Remediation Console** — Fix ACLs, disable firewall rules, strengthen policies
- **Evidence Pack** — Collect audit evidence and generate reports
- **PowerShell Terminal** — Working terminal with GRC commands

## Quick Start

### Option 1: Download the Installer
1. Go to [releases](https://github.com/pitchiluxe/grc-range/releases/latest)
2. Download the installer for your platform
3. Run the installer and launch "GRC Range"
4. Sign in with `admin` / `admin`

### Option 2: Run from Source
```bash
git clone https://github.com/pitchiluxe/grc-range.git
cd grc-range
npm install
npm run dev
```
Open `http://localhost:5175` and sign in with `admin` / `admin`.

### Optional: Enable AI (Ollama)
The GRC Senior Expert and Lab Generator work offline, but for AI-powered responses:
```bash
# Install Ollama from https://ollama.com
ollama pull llama3.2
```
The app will auto-detect Ollama on `127.0.0.1:11434`.

## Lab Phases

1. **Setup & Discovery** — Verify seeded non-compliant data
2. **Audit & Mapping** — Discover findings and map to frameworks
3. **Risk Assessment** — Build a risk register with 5x5 matrix
4. **Remediation** — Fix the findings
5. **Executive Briefing** — Frame findings for a CFO
6. **Policy Writing** — Draft access control and acceptable use policies
7. **Audit Report** — Generate a formal findings report

## Tech Stack

- **Vite + TypeScript** — Fast, type-safe frontend
- **Electron** — Cross-platform desktop app with auto-update
- **Ollama** — Local LLM for AI tutoring (optional, offline fallback included)
- **Vanilla DOM** — No React/Vue overhead, direct DOM manipulation

## License

MIT — Free and open source.
