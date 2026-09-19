# Design system

One system across **anjula.dev**, **fxtrack** and anything built later, so the projects read as a
family: same palette, same type, same spacing, same content width. The values live in
`static/design/tokens.css` (published at <https://anjula.dev/design/tokens.css>) and the Tailwind
form in `static/design/tailwind-theme.css`.

The look is a printed page: warm ivory paper, ink text, one clay accent, hairline rules, no gloss.

## Palette

Neutrals carry a little yellow, never blue. Values are the tested ones: every pairing below is at
least 4.5:1 in its mode, and the muted steps sit at 4.6:1 against their own background.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#faf8f3` | `#282622` | Page background |
| `--card` | `#ffffff` | `#2f2d29` | Raised surfaces, tables, inputs |
| `--wash` | `#f4f2ec` | `#33312c` | Subtle fills: code blocks, table headers, chips |
| `--hair` | `#f0ede4` | `#3a3833` | Whisper dividers inside a surface |
| `--line` | `#dfdbd0` | `#5b564c` | Borders, rules, separators |
| `--ink` | `#44403a` | `#f4f2ec` | Headings and primary text |
| `--ink-700` | `#5f5a51` | `#cdc8bb` | Body copy |
| `--ink-500` | `#767064` | `#948e80` | Secondary text, captions, metadata |
| `--ink-400` | `#948e80` | `#767064` | Faint labels, decorative icons |
| `--clay` | `#c1603c` | `#e7966e` | The accent: links, rules, marks, focus |
| `--clay-strong` | `#9e4a2d` | `#d97757` | Accent on hover, accent text on paper |
| `--clay-soft` | `#e7966e` | `#c1603c` | Accent washes and fills |
| `--moss` | `#78876a` | `#98a688` | Second accent, used sparingly |
| `--positive` | `#157a58` | `#6cc4a1` | Good news, up, cheaper |
| `--negative` | `#b3323f` | `#e08d92` | Bad news, down, more expensive |
| `--gold` | `#8a6309` | `#d3b45c` | Warning, "check this" |

Rules:

- One accent per screen. Clay is the site's; moss and gold only appear where they carry meaning.
- Never place `--ink-500` or lighter on `--wash`; move up a step instead.
- Colour is never the only signal. Pair it with a word, an arrow or a shape.

A project may add domain aliases on top, never new values. fxtrack is the example: `brand` is clay,
`buy` is clay-strong, `sell` is positive, `up`/`down` are positive/negative. An alias exists so the
markup says what a number means, and each one still resolves to a token in this table.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Interface | **Inter** | Everything chrome: navigation, **links**, buttons, controls, tables, metadata, labels, headers, footers |
| Reading | **Source Serif 4** | Prose only: article bodies, project write-ups, page copy, descriptions |
| Code | **JetBrains Mono** | Code, identifiers, figures that must not jiggle |

**Sans is the default, serif is the exception.** A link, a caption, a date, a footer paragraph, a
table cell or a form control is Inter. Serif is reserved for continuous prose, where a reader follows
sentences rather than scanning. A link inside an article inherits the article's serif, because that
is reading text; a link anywhere else is Inter.

Two ways to get that outcome, both fine:

- anjula.dev (the reference): the page is Inter, and `article .prose` switches to serif.
- fxtrack: the page is serif, and chrome carries a `.ui` class that switches it back to Inter.

Scale (rem, with the line height to use):

| Token | Size | Leading | Use |
| --- | --- | --- | --- |
| `--text-xs` | 0.75 | 1.5 | Eyebrows, footnotes, badges |
| `--text-sm` | 0.875 | 1.55 | Metadata, captions, controls |
| `--text-base` | 1 | 1.6 | Interface body |
| `--text-reading` | 1.125 | 1.75rem line | Long form prose and page copy |
| `--text-xl` | 1.25 | 1.45 | Section headings, card titles |
| `--text-2xl` | 1.5 | 1.35 | Page headings |
| `--text-4xl` | 2.25 | 1.15 | Article titles |
| `--text-6xl` | 3.75 | 1.02 | A single hero figure, rarely |

Reading text is 1.125rem on a **1.75rem line** (leading-7), which is what the blog uses and
therefore what every project uses. Body copy sits at `--ink-700`; headings jump to `--ink`. Nothing
between `--text-sm` and `--text-reading` is used, so 13px and 15px text do not exist in the system.

Rules:

- Sans for chrome, serif for prose, as above. Do not set a serif on a control or a sans on an
  article paragraph.
- Headings are sentence case, weight 600 to 700. Never heavier than 700.
- Letterspacing: `-0.011em` on serif headings, `0.07em` on uppercase mono or sans eyebrows.
- Numbers that are compared sit in mono with tabular figures.
- Do not mix a fourth family in. Emoji are allowed in content, not in chrome.
- A header title is chrome, not a nameplate: Inter 600 at `--text-xl`, with the menu at Inter 500 and
  `--text-sm`. A serif title reads smaller than the sans menu beside it.
- Footers are chrome: Inter, small (`--text-sm`), in `--ink-500`, with no rule dividing them from the
  page. Neither project draws a hairline above its footer.

Only these weights are loaded: Inter 400, 500 and 600; JetBrains Mono 400 and 500; Source Serif 4
400, 600 and 700 upright, plus 400 italic. No sans in the system uses 700, so interface text never
gets heavier than 600. The theme asks the article title for extrabold, and with no 800 in the loaded
set it renders at 700, which is the real ceiling.

The one request both projects share:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap
```

## Layout

The blog, anjula.dev, is the reference: its content area, gutters and reading measure are the
accepted ones, and every other project adopts them.

- `--container: 80rem` is the outer content area, centred, with `--gutter` padding: `1.5rem` on
  phones, `3.5rem` from 640px, `6rem` from 768px, `8rem` from 1024px.
- `--measure: 65ch` is the reading column. Prose never exceeds it; full-bleed only for media.
- App screens (fxtrack) fill the same container and gutters, so the two sites line up when opened
  side by side.
- Sections are separated by `--space-12` to `--space-16`, not by heavy rules.
- Hairline rules (`1px solid var(--line)`) do the separating work. No shadows, no glows.

Spacing is a 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Nothing in between.

## Surfaces and shape

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 0.375rem | Chips, badges, small controls |
| `--radius` | 0.625rem | Buttons, inputs, small cards |
| `--radius-lg` | 0.875rem | Cards, media, panels |
| `--radius-full` | 9999px | Avatars, pill buttons, tag pills |

- Borders are `1px solid var(--line)`. A surface may use `--hair` for internal division.
- Media (photos, diagrams) gets `--radius-lg`; avatars and portraits are `--radius-full`.
- `--radius-card` is an alias for `--radius-lg`, and is the name fxtrack uses for its panels.
- Elevation is a background step (`--card` on `--paper`), not a shadow. The blog uses no shadow at
  all. An app card may take the single soft `--shadow-card` for a raised surface, and nothing else
  in the system is allowed one.

## Motion

- `--dur-fast: 150ms` for hover and focus, `--dur: 240ms` for reveals and collapses.
- `--ease: cubic-bezier(0.4, 0, 0.2, 1)` everywhere, unless the motion is physical (a fall), where
  gravity easing (`q²`) is correct.
- New panels appear with `--ease-reveal` (`cubic-bezier(0.22, 1, 0.36, 1)`), a short rise and fade.
- Respect `prefers-reduced-motion`: skip ambient animation entirely.

## Voice

Prose is plain and direct: short sentences, no em-dashes, sentence case headings, first person
where it is my experience. Applies to copy on every project, not just the blog.

## Adopting this in a new project

1. Copy `tokens.css` into the project (or link it) and set `font-family` from the three tokens.
2. Tailwind v4: paste `tailwind-theme.css` into the stylesheet, after `@import 'tailwindcss'`.
3. Load Source Serif 4, Inter and JetBrains Mono from the single request above, with `display=swap`.
4. Add the paper background, `--container`, `--gutter` and `--measure` to the shell.
5. Add `--shadow-card` only if the project raises cards; the blog does not.
6. Check the palette pairings you actually use, in both modes, before shipping.

Projects following the system:

| Project | How it consumes it |
| --- | --- |
| anjula.dev | Hugo/Congo scheme in `assets/css/schemes/paper.css`, values mirroring the tokens |
| fxtrack | Tailwind v4 `@theme` in `packages/web/src/style.css`, values mirroring the tokens |
