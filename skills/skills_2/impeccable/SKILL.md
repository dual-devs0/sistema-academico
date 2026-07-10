---
name: impeccable
description: "Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks."
argument-hint: "[{{command_hint}}] [target]"
user-invocable: true
allowed-tools:
  - Bash(npx impeccable *)
license: Apache 2.0. Based on Anthropic's frontend-design skill. See NOTICE.md for attribution.
---

Designs and iterates production-grade frontend interfaces. Real working code, committed design choices, exceptional craft.

## Setup

Before any design work or file edits:

1. Load context (PRODUCT.md / DESIGN.md) via the loader script.
2. Identify the register and load the matching register reference (brand.md or product.md).
3. **If the user invoked a sub-command (e.g. `craft`, `shape`, `audit`), load its reference file too.** This is non-negotiable: `craft` without `craft.md` loaded means you'll skip the shape-and-confirm step the user expects.

Skipping these produces generic output that ignores the project.

### 1. Context gathering

Two files, case-insensitive. The loader looks at the project root by default and falls back to `.agents/context/` and `docs/` if the root is clean. Override with `IMPECCABLE_CONTEXT_DIR=path/to/dir` (absolute or relative to cwd).

- **PRODUCT.md**: required. Users, brand, tone, anti-references, strategic principles.
- **DESIGN.md**: optional, strongly recommended. Colors, typography, elevation, components.

Load both in one call:

```bash
node {{scripts_path}}/load-context.mjs
```

Consume the full JSON output. Never pipe through `head`, `tail`, `grep`, or `jq`. The output's `contextDir` field tells you where the files were resolved from.

If the output is already in this session's conversation history, don't re-run. Exceptions requiring a fresh load: you just ran `{{command_prefix}}impeccable teach` or `{{command_prefix}}impeccable document` (they rewrite the files), or the user manually edited one.

`{{command_prefix}}impeccable live` already warms context via `live.mjs`. If you've run `live.mjs`, don't also run `load-context.mjs` this session.

If PRODUCT.md is missing, empty, or placeholder (`[TODO]` markers, <200 chars): run `{{command_prefix}}impeccable teach`, then resume the user's original task with the fresh context. If the original task was `{{command_prefix}}impeccable craft`, resume into `{{command_prefix}}impeccable shape` before any implementation work.

If DESIGN.md is missing: nudge once per session (*"Run `{{command_prefix}}impeccable document` for more on-brand output"*), then proceed.

### 2. Register

Every design task is **brand** (marketing, landing, campaign, long-form content, portfolio: design IS the product) or **product** (app UI, admin, dashboard, tool: design SERVES the product).

Identify before designing. Priority: (1) cue in the task itself ("landing page" vs "dashboard"); (2) the surface in focus (the page, file, or route being worked on); (3) `register` field in PRODUCT.md. First match wins.

If PRODUCT.md lacks the `register` field (legacy), infer it once from its "Users" and "Product Purpose" sections, then cache the inferred value for the session. Suggest the user run `{{command_prefix}}impeccable teach` to add the field explicitly.

Load the matching reference: [reference/brand.md](reference/brand.md) or [reference/product.md](reference/product.md). The shared design laws below apply to both.

## Shared design laws

Apply to every design, both registers. Match implementation complexity to the aesthetic vision: maximalism needs elaborate code, minimalism needs precision. Interpret creatively. Vary across projects; never converge on the same choices. {{model}} is capable of extraordinary work. Don't hold back.

### 0. Brief inference (read the room)

Before touching code, **infer what the user actually wants**. Jumping to a default aesthetic is the #1 cause of generic output.

1. **Page kind** — landing (SaaS / consumer / agency / event), portfolio (dev / designer / studio), editorial / blog, product UI (dashboard / settings / tool), redesign (preserve vs overhaul).
2. **Vibe words** — "minimalist", "Linear-style", "brutalist", "premium consumer", "playful", "serious B2B", "editorial", "dark tech".
3. **Audience** — B2B procurement panel vs design-conscious consumer vs recruiter scanning a portfolio. The audience picks the aesthetic, not your taste.
4. **Quiet constraints** — accessibility-first, public-sector, regulated, trust-first commerce, kids' products. These OVERRIDE aesthetic preference.

Output a **one-line Design Read** before generating: *"Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<aesthetic family>."*

If the brief is ambiguous, ask exactly **one** clarifying question — never a multi-question dump.

### 1. The three dials

After the Design Read, set three dials (1–10). Every decision below is gated by these. Do not ask the user to edit this file — overrides happen conversationally.

| Dial | Range | Low (1–3) | Mid (4–7) | High (8–10) |
|---|---|---|---|---|
| **DESIGN_VARIANCE** | 1–10 | Symmetrical grids, centered | Offset, varied aspect ratios | Masonry, fractional grids, massive empty zones |
| **MOTION_INTENSITY** | 1–10 | CSS hover/active only | Fluid CSS transitions, cascades | Scroll-triggered, parallax, GSAP/Motion choreography |
| **VISUAL_DENSITY** | 1–10 | Art gallery: huge gaps, airy | Standard web app spacing | Cockpit: tight, mono numbers, no card boxes |

**Baseline for brand:** `8 / 6 / 4`. **Baseline for product:** `5 / 3 / 6`.

**Dial inference quick map:**

| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| Minimalist / clean / calm / Linear-style | 5–6 | 3–4 | 2–3 |
| Premium consumer / luxury / brand | 7–8 | 5–7 | 3–4 |
| Playful / experimental / agency | 9–10 | 8–10 | 3–4 |
| Trust-first / public-sector / regulated | 3–4 | 2–3 | 4–5 |
| Product UI / dashboard / tool | 4–6 | 3–4 | 6–8 |

### Color

- Use OKLCH. Reduce chroma as lightness approaches 0 or 100; high chroma at extremes looks garish.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005–0.01 is enough).
- Pick a **color strategy** before picking colors. Four steps on the commitment axis:
  - **Restrained**: tinted neutrals + one accent ≤10%. Product default; brand minimalism.
  - **Committed**: one saturated color carries 30–60% of the surface. Brand default for identity-driven pages.
  - **Full palette**: 3–4 named roles, each used deliberately. Brand campaigns; product data viz.
  - **Drenched**: the surface IS the color. Brand heroes, campaign pages.
- The "one accent ≤10%" rule is Restrained only. Committed / Full palette / Drenched exceed it on purpose. Don't collapse every design to Restrained by reflex.
- **The LILA rule:** "AI Purple/Blue glow" aesthetic is discouraged as default. Use neutral bases (Zinc/Slate/Stone) with singular accents (Emerald, Electric Blue, Deep Rose, Burnt Orange). Override only if the brief explicitly names purple.
- **Premium-consumer palette ban:** The LLM default of warm beige/cream + brass/clay/oxblood + espresso dark text is BANNED as default reach. Rotate among: cold luxury (silver-grey + chrome), forest (deep green + bone + amber), cobalt + cream, terracotta + slate, or pure monochrome + one saturated pop. Override only when the brand brief literally names those colors.
- **COLOR CONSISTENCY LOCK:** Once an accent is chosen, use it on the WHOLE page. A warm-grey site does not get a blue CTA in section 7. Pick one accent, lock it, audit every component.
- **SHAPE CONSISTENCY LOCK:** Pick ONE corner-radius scale and stick to it. Options: all-sharp (0), all-soft (12–16px), all-pill (full radius for interactive). Mixed systems only with a documented rule followed everywhere.

### Theme

Dark vs. light is never a default. Not dark "because tools look cool dark." Not light "to be safe."

Before choosing, write one sentence of physical scene: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, it's not concrete enough. Add detail until it does.

"Observability dashboard" does not force an answer. "SRE glancing at incident severity on a 27-inch monitor at 2am in a dim room" does. Run the sentence, not the category.

The page has ONE theme. Sections do not invert. No light-mode-warm-paper section sandwiched between dark sections. Exception: a deliberate one-per-page "Theme Switch on Scroll" device.

### Typography

- Cap body line length at 65–75ch.
- Hierarchy through scale + weight contrast (≥1.25 ratio between steps). Avoid flat scales.
- **Inter is discouraged as default sans.** Prefer Geist, Outfit, Cabinet Grotesk, Satoshi, or a brand-appropriate alternative. Inter is acceptable when the brief explicitly asks for neutral/standard or for public-sector/accessibility-first projects.
- **SERIF DISCIPLINE:** Serif is very discouraged as default. "It feels creative/premium" is not a reason. Serif is acceptable only when: the brand brief literally names a serif font, OR the aesthetic is genuinely editorial/luxury/publication. **Banned as defaults:** Fraunces, Instrument Serif (the two LLM-favorite display serifs).
- **ITALIC DESCENDER CLEARANCE:** When italic is used in display type with descender letters (`y g j p q`), `leading-none` will clip. Use `leading-[1.1]` minimum and `pb-1` on the wrapper.
- **Display/Headlines:** `text-4xl md:text-6xl tracking-tighter leading-none`.
- **Body/Paragraphs:** `text-base text-gray-600 leading-relaxed max-w-[65ch]` (brand) or `text-sm leading-normal` (product).

### Layout

- Vary spacing for rhythm. Same padding everywhere is monotony.
- Cards are the lazy answer. Use them only when they're truly the best affordance. Nested cards are always wrong.
- Don't wrap everything in a container. Most things don't need one.
- **HERO RULES (brand register):** Hero MUST fit initial viewport. Headline max 2 lines on desktop, subtext max 20 words. CTAs visible without scroll. Hero top padding max `pt-24`. Navigation max 80px, single line at desktop.
- **HERO STACK:** Max 4 text elements: (1) eyebrow OR brand strip (pick zero or one), (2) headline, (3) subtext, (4) CTAs (1 primary + max 1 secondary). **Banned in hero:** tiny tagline below CTAs, trust micro-strip, pricing teaser, feature bullets, social-proof avatars. "Used by" logo wall goes UNDER the hero, never inside.
- **EYEBROW RESTRAINT:** Eyebrows (small uppercase label above section headers) — max 1 per 3 sections. Hero counts as 1. A page with 9 sections may use at most 3 eyebrows total. If section A has one, the next 2 cannot.
- **BENTO CELL COUNT:** A bento grid has EXACTLY as many cells as you have content for. No empty cells. Re-shape the grid; do not paste a blank tile.
- **ZIGZAG ALTERNATION CAP:** Max 2 sections of alternating image+text split in a row. The 3rd consecutive one is a fail. Break with full-width, bento, marquee, or different layout.
- **SECTION-LAYOUT REPETITION BAN:** Once a layout family is used for a section, it can appear at most ONCE on the page. A landing page with 8 sections must use at least 4 different layout families.
- **SPLIT-HEADER BAN:** "Left big headline + right small explainer paragraph" as a section header is banned as default. Stack them vertically instead.
- **MOBILE OVERRIDE:** Asymmetric layouts above `md:` MUST collapse to strict single-column (`w-full`, `px-4`) on viewports < 768px.

### Motion

- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic.
- Animate ONLY `transform` and `opacity`. Never `top`, `left`, `width`, `height`.
- **Any motion above MOTION_INTENSITY > 3 MUST honor `prefers-reduced-motion`.** In Motion: `useReducedMotion()`. In CSS: `@media (prefers-reduced-motion: no-preference)`.
- **Motion must be motivated.** Before adding any animation, answer: "what does this communicate?" Valid: hierarchy, storytelling, feedback, state transition. Invalid: "it looked cool."
- **Banned:** `window.addEventListener("scroll", ...)`, custom scroll progress via `window.scrollY` in React state, `requestAnimationFrame` loops touching React state.
- Use Motion's `useScroll()`, GSAP's `ScrollTrigger`, IntersectionObserver, or CSS `scroll-driven animations`.

### Absolute bans

Match-and-refuse. If you're about to write any of these, rewrite the element with different structure.

- **Side-stripe borders.** `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, callouts, or alerts. Never intentional. Rewrite with full borders, background tints, leading numbers/icons, or nothing.
- **Gradient text.** `background-clip: text` combined with a gradient background. Decorative, never meaningful. Use a single solid color. Emphasis via weight or size.
- **Glassmorphism as default.** Blurs and glass cards used decoratively. Rare and purposeful, or nothing.
- **The hero-metric template.** Big number, small label, supporting stats, gradient accent. SaaS cliché.
- **Identical card grids.** Same-sized cards with icon + heading + text, repeated endlessly.
- **Modal as first thought.** Modals are usually laziness. Exhaust inline / progressive alternatives first.
- **Duplicate CTA intent.** Two CTAs with the same intent on one page ("Contact us" + "Get in touch" = same). Pick ONE label and use it everywhere.
- **Placeholder-as-label in forms.** Ever.
- **Div-based fake screenshots.** Hand-built product previews with `<div>` rectangles is a tell. Use real screenshots, generated images, or actual component previews.
- **Custom mouse cursors.** Outdated, accessibility-hostile, perf-hostile.
- **Pure black (`#000`).** Use off-black, zinc-950, or charcoal.
- **Oversaturated accents.** Desaturate to blend with neutrals.

### Copy

- Every word earns its place. No restated headings, no intros that repeat the title.
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. Also not `--`.
- **COPY SELF-AUDIT:** Before shipping, re-read every visible string. Flag anything: grammatically broken, unclear referents, AI-hallucinated wordplay, fake-craftsman labels, mock-poetic micro-meta. Rewrite every flagged string.
- **Fake-precise numbers banned.** `92%`, `4.1×`, `48k` — either come from real data or are explicitly labeled as mock.
- **One copy register per page.** Don't mix technical mono, editorial prose, and marketing punch unless the brand voice requires it.
- **Quotes/testimonials:** Max 3 lines body. Attribution: name + role + company. Never name only ("- Sarah").

### The AI slop test

If someone could look at this interface and say "AI made that" without doubt, it's failed. Cross-register failures are the absolute bans above. Register-specific failures live in each reference.

**Category-reflex check.** Run at two altitudes; the second one catches what the first one misses.

- **First-order:** if someone could guess the theme + palette from the category alone ("observability → dark blue", "healthcare → white + teal", "finance → navy + gold", "crypto → neon on black"), it's the first training-data reflex. Rework the scene sentence and color strategy until the answer isn't obvious from the domain.
- **Second-order:** if someone could guess the aesthetic family from category-plus-anti-references ("AI workflow tool that's not SaaS-cream → editorial-typographic", "fintech that's not navy-and-gold → terminal-native dark mode"), it's the trap one tier deeper. The first reflex was avoided; the second wasn't. Rework until both answers are not obvious. The brand register's [reflex-reject aesthetic lanes](reference/brand.md) list catches the currently-saturated families.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `craft [feature]` | Build | Shape, then build a feature end-to-end | [reference/craft.md](reference/craft.md) |
| `shape [feature]` | Build | Plan UX/UI before writing code | [reference/shape.md](reference/shape.md) |
| `teach` | Build | Set up PRODUCT.md and DESIGN.md context | [reference/teach.md](reference/teach.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [reference/document.md](reference/document.md) |
| `extract [target]` | Build | Pull reusable tokens and components into design system | [reference/extract.md](reference/extract.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [reference/critique.md](reference/critique.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive) | [reference/audit.md](reference/audit.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [reference/polish.md](reference/polish.md) |
| `bolder [target]` | Refine | Amplify safe or bland designs | [reference/bolder.md](reference/bolder.md) |
| `quieter [target]` | Refine | Tone down aggressive or overstimulating designs | [reference/quieter.md](reference/quieter.md) |
| `distill [target]` | Refine | Strip to essence, remove complexity | [reference/distill.md](reference/distill.md) |
| `harden [target]` | Refine | Production-ready: errors, i18n, edge cases | [reference/harden.md](reference/harden.md) |
| `onboard [target]` | Refine | Design first-run flows, empty states, activation | [reference/onboard.md](reference/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [reference/animate.md](reference/animate.md) |
| `colorize [target]` | Enhance | Add strategic color to monochromatic UIs | [reference/colorize.md](reference/colorize.md) |
| `typeset [target]` | Enhance | Improve typography hierarchy and fonts | [reference/typeset.md](reference/typeset.md) |
| `layout [target]` | Enhance | Fix spacing, rhythm, and visual hierarchy | [reference/layout.md](reference/layout.md) |
| `delight [target]` | Enhance | Add personality and memorable touches | [reference/delight.md](reference/delight.md) |
| `overdrive [target]` | Enhance | Push past conventional limits | [reference/overdrive.md](reference/overdrive.md) |
| `clarify [target]` | Fix | Improve UX copy, labels, and error messages | [reference/clarify.md](reference/clarify.md) |
| `adapt [target]` | Fix | Adapt for different devices and screen sizes | [reference/adapt.md](reference/adapt.md) |
| `optimize [target]` | Fix | Diagnose and fix UI performance | [reference/optimize.md](reference/optimize.md) |
| `live` | Iterate | Visual variant mode: pick elements in the browser, generate alternatives | [reference/live.md](reference/live.md) |

Plus two management commands: `pin <command>` and `unpin <command>`, detailed below.

### Routing rules

1. **No argument**: render the table above as the user-facing command menu, grouped by category. Ask what they'd like to do.
2. **First word matches a command**: load its reference file and follow its instructions. Everything after the command name is the target.
3. **First word doesn't match**: general design invocation. Apply the setup steps, shared design laws, and the loaded register reference, using the full argument as context.

Setup (context gathering, register) is already loaded by then; sub-commands don't re-invoke `{{command_prefix}}impeccable`.

If the first word is `craft`, setup still runs first, but [reference/craft.md](reference/craft.md) owns the rest of the flow. If setup invokes `teach` as a blocker, finish teach, refresh context, then resume the original command and target.

## Pin / Unpin

**Pin** creates a standalone shortcut so `{{command_prefix}}<command>` invokes `{{command_prefix}}impeccable <command>` directly. **Unpin** removes it. The script writes to every harness directory present in the project.

```bash
node {{scripts_path}}/pin.mjs <pin|unpin> <command>
```

Valid `<command>` is any command from the table above. Report the script's result concisely. Confirm the new shortcut on success, relay stderr verbatim on error.
