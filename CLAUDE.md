# Working on this project

This is Mehboob Ali's portfolio site. Before changing anything, read this whole file —
most of it exists because an earlier draft *did* look like AI slop, we caught it, and
fixed it. Don't reintroduce what got removed.

## The one real rule

Everything on this page has to earn its place by being specifically, verifiably true
about this one person. Not "a software engineer" — this software engineer. The test for
any new section, line, or visual element: could this sentence/image describe a hundred
other portfolios with a find-and-replace on the name? If yes, cut it or make it more
specific. Specificity is the actual defense against looking AI-generated — not a style
rule, a content rule.

## Design system — treat as fixed, not a starting point

- **Colors:** ink `#0F1319`, surface `#202834`, surface-2 `#2A3342`, line `#404A5A`,
  line-strong `#556274`, quiet text `#8590A2`, paper (body text) `#F0EDE6`, signal (the
  ONE accent) `#E0A84E`. Don't add a second accent color.
  The first version of this palette had surface at 1.09:1 against ink and line at 1.42:1.
  Both are below the contrast where an eye resolves an edge, so every card and divider on
  the page was invisible and the whole thing read as flat text on black. The hues did not
  change; the lightness steps did. **When you add a color, compute its ratio first.**
  Structural edges need ~2:1 minimum, meaningful ones 3:1 (WCAG 1.4.11), and any text
  colour has to clear 4.5:1 against *both* ink and surface, because `quiet` is used on both.
  Don't switch to purple/violet gradients or glassmorphism. That's the single most
  recognizable "AI generated this in five minutes" tell right now, along with frosted-glass
  cards and floating gradient blobs. This palette was chosen specifically to not be that.
- **Type:** Fraunces (display/headlines), IBM Plex Sans (body), IBM Plex Mono (labels,
  data, meta). Not Inter. Not Poppins. Those are the fonts every template defaults to;
  picking something with real character was a deliberate choice, keep it.
- **The signature element** is the node-graph motif (quiet mesh + one highlighted path).
  It's not decoration — it's a literal callback to the CMDB relationship-graph work,
  which is the single most differentiated thing in the case studies. If you extend the
  visual language elsewhere on the site, extend *that* concept rather than inventing a
  new decorative motif. Don't add a second unrelated visual gimmick on top of it.
- **Motion:** one scroll-reveal treatment, applied consistently, respecting
  `prefers-reduced-motion`, content visible by default even if JS fails. Do not add
  animation to individual elements just because it's easy to add. If you're not sure
  whether a new animation is restrained or excessive, it's excessive.

## Explicitly banned, because they're the current tells for "AI built this"

- Skill "proficiency" bars or percentage ratings (React 90%, etc.) — meaningless, nobody
  can honestly quantify this, and it's a dead giveaway of a template.
- Fake or generic testimonials, client logo carousels, "trusted by" sections with no
  real clients behind them.
- A chatbot widget, an "ask me anything" AI assistant bolted onto the page, or any
  feature added because it's trendy rather than because a visitor needs it.
- Particle/canvas background effects unconnected to anything real about the person.
- Emoji as section markers or bullet icons.
- A "my process" 4-step diagram that could apply to literally any engineer.
- Stock photography, generic icon-grid "tech stack" walls with no context per icon.
- More than 2-3 case studies. Depth over breadth — a recruiter reads three real ones,
  not ten shallow ones.

## Voice — the specific mistakes we already made and fixed

- **No em dash as a sentence crutch.** Early drafts used " — " to join a setup clause to
  a payoff clause, in nearly every paragraph. It's individually fine and in aggregate is
  the single most recognizable LLM-prose tell. If you catch yourself writing "X — Y",
  rewrite as two sentences, or a colon, or restructure. One stray em dash in the whole
  site is fine. A pattern of them is not.
- **No identical paragraph shapes across sections that describe similar things.** The
  three case studies used to all be exactly 3 paragraphs following problem → cause →
  result. Even without banned words, identical rhythm repeated three times reads as
  templated. Vary length, vary structure, let some end on a short fragment.
- **No corporate buzzwords:** leverage, seamless, robust, cutting-edge, unlock, empower,
  passionate, innovative solutions. If a sentence would fit a job posting, rewrite it as
  something an actual engineer would say out loud.
- **Plain, specific, sometimes a little dry, is the target voice.** Not casual-trying-
  too-hard, not corporate-polished either. "It runs in under an hour now" beats both
  "Reduced execution time by 92%!" and "the runtime was significantly improved."

## Source of truth for content

Every fact on this site (feature counts, ship rates, team sizes, the SOC 2/WCAG
mentions, project details) came from a real analysis of five years of this person's
actual work history, cross-checked against public company blogs where possible. Don't
invent new numbers, achievements, or projects to fill out a section. If a section needs
more content to feel complete, that's a sign to either find another real fact or leave
the section shorter — not to generate a plausible-sounding filler stat.

## Before you ship a change

Read it back and ask: does this sound like something the person would actually say, or
does it sound like the median answer to "write a portfolio bio"? If you're not sure,
it's the second one — go find the specific, slightly odd, real detail instead.
