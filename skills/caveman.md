# Caveman — Complete Reference

> **why use many token when few do trick**
> GitHub: https://github.com/JuliusBrussee/caveman
> License: MIT

---

## Overview

Caveman makes AI coding agents respond in compressed caveman-style prose — cuts **~65–75% output tokens** while keeping full technical accuracy. Ships as Claude Code plugin, Codex plugin, Gemini CLI extension, skill/rule files for 40+ agents (Cursor, Windsurf, Cline, Copilot, opencode, etc.).

---

## Quick Install

**macOS / Linux / WSL / Git Bash:**
```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```

**Windows (PowerShell 5.1+):**
```powershell
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

Needs Node ≥18. Auto-detects installed agents. ~30 seconds.

**Manual from clone:**
```bash
git clone https://github.com/JuliusBrussee/caveman.git
cd caveman
node bin/install.js --all
```

---

## Commands / Skills

| Skill | What |
|---|---|
| `/caveman [lite\|full\|ultra\|wenyan]` | Compress every reply. Levels stick until session end. |
| `/caveman-commit` | Conventional Commit messages, ≤50 char subject. Why over what. |
| `/caveman-review` | One-line PR comments: `L42: 🔴 bug: user null. Add guard.` |
| `/caveman-stats` | Real session token usage + lifetime savings + USD. |
| `/caveman-compress <file>` | Rewrite memory file (e.g. CLAUDE.md) into caveman-speak. Cuts ~46% input tokens. |
| `caveman-shrink` | MCP middleware — wraps any MCP server, compresses tool descriptions. |
| `cavecrew-*` | Caveman subagents (investigator/builder/reviewer). ~60% fewer tokens. |

**Natural language triggers:** "talk like caveman", "caveman mode", "activate caveman", "less tokens", "be brief".  
**Stop:** "stop caveman", "normal mode", "disable caveman".

---

## Intensity Levels

| Level | Behavior |
|---|---|
| **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight. |
| **full** (default) | Drop articles, fragments OK, short synonyms. Classic caveman. No tool-call narration, no decorative tables/emoji, no long error dumps unless asked. |
| **ultra** | Abbreviate prose words (DB/auth/config/req/res/fn/impl) — never real code symbols. Strip conjunctions, arrows for causality (X → Y). |
| **wenyan-lite** | Semi-classical Chinese. Drop filler, keep grammar structure, classical register. |
| **wenyan-full** | Maximum classical terseness. Fully 文言文. 80–90% character reduction. |
| **wenyan-ultra** | Extreme abbreviation with classical Chinese feel. |

### Examples

**"Why React component re-render?"**
- **lite:** "Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`."
- **full:** "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
- **ultra:** "Inline obj prop → new ref → re-render. `useMemo`."
- **wenyan-full:** "每繪新生對象參照，故重繪；以 useMemo 包之則免。"

---

## Core Rules (from SKILL.md)

Respond terse like smart caveman. All technical substance stay. Only fluff die.

**Drop:** articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). No tool-call narration, no decorative tables/emoji, no dumping long raw error logs unless asked — quote shortest decisive line. Standard well-known tech acronyms OK (DB/API/HTTP); never invent new abbreviations.

**Technical terms exact. Code blocks unchanged. Errors quoted exact.**

**Pattern:** `[thing] [action] [reason]. [next step].`

### Language preservation
Preserve user's dominant language. User write Portuguese → reply Portuguese caveman. Compress the *style*, not the language. Always keep technical terms, code, API names, CLI commands, commit-type keywords (feat/fix/...), and exact error strings verbatim.

### No self-reference
Never name or announce the style. No "caveman mode on", "me caveman think", no third-person tags. Output caveman-only — never normal answer plus "Caveman:" recap. Exception: user explicitly asks what the mode is.

### Auto-Clarity (drop caveman for)
- Security warnings
- Irreversible action confirmations
- Multi-step sequences where fragment ambiguity risks misread
- Compression creates technical ambiguity
- User asks to clarify or repeats question

Resume caveman after clear part done.

### Boundaries
Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persists until changed or session end.

---

## Per-Agent Install Commands

| Agent | Install command | Auto-activates? |
|---|---|---|
| **Claude Code** | `claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman` | Yes (hooks) |
| **Gemini CLI** | `gemini extensions install https://github.com/JuliusBrussee/caveman` | Yes (context file) |
| **opencode** | `npx -y github:JuliusBrussee/caveman -- --only opencode` | Yes (plugin + AGENTS.md) |
| **OpenClaw** | `npx -y github:JuliusBrussee/caveman -- --only openclaw` | Yes (workspace skill + SOUL.md) |
| **Codex CLI** | `npx skills add JuliusBrussee/caveman -a codex` | Per-session: `/caveman` |
| **Cursor** | `npx skills add JuliusBrussee/caveman -a cursor` | Per-session; `--with-init` for always-on |
| **Windsurf** | `npx skills add JuliusBrussee/caveman -a windsurf` | Per-session; `--with-init` for always-on |
| **Cline** | `npx skills add JuliusBrussee/caveman -a cline` | Per-session; `--with-init` for always-on |
| **GitHub Copilot** | `npx -y github:JuliusBrussee/caveman -- --only copilot --with-init` | Repo-wide via `--with-init` |
| **Continue, Kilo, Roo, Augment, Aider, Bob, Crush, Devin, Droid, ForgeCode, Goose, iFlow, Kiro, Mistral, OpenHands, Qwen, Rovo Dev, Tabnine, Trae, Warp, Replit, Junie, Qoder, Antigravity (+ 30+)** | `npx skills add JuliusBrussee/caveman -a <profile>` | No — say `/caveman` per session |

---

## Benchmarks

Average **65% output reduction** across 10 prompts (range 22–87%):

| Task | Normal | Caveman | Saved |
|---|---|---|---|
| Explain React re-render bug | 1180 | 159 | 87% |
| Fix auth middleware token expiry | 704 | 121 | 83% |
| Set up PostgreSQL connection pool | 2347 | 380 | 84% |
| Explain git rebase vs merge | 702 | 292 | 58% |
| Refactor callback to async/await | 387 | 301 | 22% |
| Architecture: microservices vs monolith | 446 | 310 | 30% |
| Review PR for security issues | 678 | 398 | 41% |
| Docker multi-stage build | 1042 | 290 | 72% |
| Debug PostgreSQL race condition | 1200 | 232 | 81% |
| Implement React error boundary | 3454 | 456 | 87% |
| **Average** | **1214** | **294** | **65%** |

### caveman-compress memory file savings

| File | Original | Compressed | Saved |
|---|---|---|---|
| claude-md-preferences.md | 706 | 285 | 59.6% |
| project-notes.md | 1145 | 535 | 53.3% |
| claude-md-project.md | 1122 | 636 | 43.3% |
| todo-list.md | 627 | 388 | 38.1% |
| mixed-with-code.md | 888 | 560 | 36.9% |
| **Average** | **898** | **481** | **46%** |

> Caveman only affects output tokens — thinking/reasoning tokens untouched.

---

## Repository Structure

```
caveman/
├── README.md                    # Front door (product pitch)
├── INSTALL.md                   # Per-agent install commands
├── CONTRIBUTING.md              # Dev guide
├── CLAUDE.md                    # Maintainer instructions
├── AGENTS.md / GEMINI.md        # Autodiscovery files (must stay at root)
│
├── install.sh / install.ps1     # 30-line shims -> bin/install.js
│
├── bin/
│   ├── install.js               # Single source for all 30+ agents (PROVIDERS array)
│   └── lib/
│       ├── settings.js          # JSONC-tolerant settings.json reader/writer
│       └── openclaw.js          # OpenClaw install/uninstall helper
│
├── skills/                      # ALL skills, single source of truth
│   ├── caveman/{SKILL.md, README.md}
│   ├── caveman-commit/{SKILL.md, README.md}
│   ├── caveman-review/{SKILL.md, README.md}
│   ├── caveman-help/{SKILL.md, README.md}
│   ├── caveman-stats/{SKILL.md, README.md}
│   ├── caveman-compress/{SKILL.md, README.md, scripts/}
│   └── cavecrew/{SKILL.md, README.md}
│
├── agents/                      # cavecrew subagents
│   ├── cavecrew-investigator.md
│   ├── cavecrew-builder.md
│   └── cavecrew-reviewer.md
│
├── commands/                    # Codex/Gemini TOML command stubs
│
├── src/
│   ├── hooks/                   # Claude Code hooks
│   │   ├── caveman-config.js          # Shared config module
│   │   ├── caveman-activate.js        # SessionStart hook
│   │   ├── caveman-mode-tracker.js    # UserPromptSubmit hook
│   │   ├── caveman-stats.js           # Stats computation
│   │   ├── caveman-statusline.sh      # Statusline badge (Linux/macOS)
│   │   ├── caveman-statusline.ps1     # Statusline badge (Windows)
│   │   └── package.json               # CommonJS marker
│   ├── rules/
│   │   ├── caveman-activate.md        # Auto-activation rule body
│   │   └── caveman-openclaw-bootstrap.md  # OpenClaw SOUL.md snippet
│   ├── tools/
│   │   └── caveman-init.js            # Per-repo rule writer
│   ├── plugins/
│   │   └── opencode/
│   │       ├── plugin.js              # opencode native plugin
│   │       └── commands/              # Six slash-command prompt templates
│   └── mcp-servers/                   # caveman-shrink MCP middleware
│
├── .claude-plugin/              # Claude Code plugin manifest
├── plugins/caveman/             # Claude Code plugin distribution (CI-mirrored)
│   ├── skills/                  # <- from skills/
│   └── agents/                  # <- from agents/
│
├── dist/                        # Build artifacts (gitignored)
├── tests/                       # All tests (Node + Python)
├── benchmarks/                  # Token measurements
├── evals/                       # Three-arm eval harness
├── docs/                        # User-facing docs
└── .github/workflows/           # CI sync
```

---

## Hook System (Claude Code)

Three hooks communicate via flag file at `$CLAUDE_CONFIG_DIR/.caveman-active`:

1. **SessionStart hook** (`caveman-activate.js`): Runs once per session. Writes active mode to flag file, emits ruleset as hidden stdout, checks settings.json for statusline config.

2. **UserPromptSubmit hook** (`caveman-mode-tracker.js`): Reads JSON from stdin. Handles slash-command activation (`/caveman`, `/caveman-commit`, etc.), natural-language activation/deactivation, and per-turn reinforcement (emits small reminder to keep caveman style).

3. **Statusline badge** (`caveman-statusline.sh`/`.ps1`): Reads flag file, outputs colored badge `[CAVEMAN]` or `[CAVEMAN:ULTRA]` for Claude Code statusline. Appends lifetime-savings suffix (`⛏ 12.4k`) after `/caveman-stats` runs.

**Shared module** (`caveman-config.js`): Exports `getDefaultMode()` (env var -> repo-local config -> user config -> 'full'), `findRepoConfigPath()`, and `safeWriteFlag()` (symlink-safe flag write with O_NOFOLLOW).

---

## Installer Flags

| Flag | What |
|---|---|
| `--all` | Plugin + hooks + statusline + per-repo rules in `$PWD` |
| `--minimal` | Plugin/extension only. No hooks, no MCP shrink, no per-repo rules. |
| `--only <id>` | One agent only. Repeatable. |
| `--dry-run` | Print every command. Write nothing. |
| `--with-init` | Drop always-on rule files into current repo + OpenClaw SOUL.md if detected. |
| `--with-mcp-shrink="<cmd>"` | Register caveman-shrink MCP proxy wrapping the given upstream server. |
| `--no-mcp-shrink` | Skip MCP-shrink registration (default). |
| `--with-hooks` / `--no-hooks` | Force on/off Claude Code hook installer. |
| `--skip-skills` | Don't run npx-skills auto-detect fallback. |
| `--config-dir <path>` | Claude Code config dir for hooks + settings.json. |
| `--non-interactive` | Never prompt; use defaults. |
| `--list` | Print full agent matrix and exit. |
| `--force` | Re-run even if already installed. |
| `--uninstall` | Remove everything. |

---

## Caveman Ecosystem

| Repo | What |
|---|---|
| [caveman](https://github.com/JuliusBrussee/caveman) | Output compression — *why use many token when few do trick* |
| [caveman-code](https://github.com/JuliusBrussee/caveman-code) | Full terminal coding agent, caveman top to bottom |
| [cavemem](https://github.com/JuliusBrussee/cavemem) | Cross-agent memory |
| [cavekit](https://github.com/JuliusBrussee/cavekit) | Spec-driven build loop |
| [cavegemma](https://github.com/JuliusBrussee/finetune-caveman) | Gemma 4 31B fine-tuned on caveman pairs |

---

## Sibling Skills

From [JuliusBrussee/skills](https://github.com/JuliusBrussee/skills):
- **grill-me** — Agent grills your plan before you build wrong thing
- **interface-kit** — Build UI that looks good, loads fast, works for everyone
- **junior-to-senior** — Adversarial review pass
- **loop-factory** — Spec-driven task loop

Install all: `npx skills@latest add JuliusBrussee/skills`

---

## Key Maintainer Rules

- Edit `skills/<name>/SKILL.md` for behavior changes. Never edit synced copies under `plugins/caveman/skills/`.
- Edit `src/rules/caveman-activate.md` for auto-activation rule changes.
- Edit `bin/install.js` `PROVIDERS` array to add new agent support.
- Benchmark and eval numbers must be real. Never fabricate or estimate.
- Hook files must silent-fail on all filesystem errors. Never let hook crash block session start.
- Any flag file write must go through `safeWriteFlag()` — direct `fs.writeFileSync` on predictable paths reopens symlink-clobber attack surface.
- Hooks must respect `CLAUDE_CONFIG_DIR` env var, not hardcode `~/.claude`.
- `bin/install.js` is the only installer source. `install.sh`/`install.ps1` are 30-line shims that delegate to it.
- Settings.json reads/writes must go through `bin/lib/settings.js` (`readSettings()`/`validateHookFields()`).
- README is a product artifact — optimize for non-technical readers, preserve caveman voice.
- CI sync workflow copies skills -> plugins/caveman/skills/ on main push.
