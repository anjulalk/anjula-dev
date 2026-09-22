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

- One accent per screen. Clay is the site's; moss and gold only appear where they carry meaning,
  the ambient page wash below being the one decorative use of moss.
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
| `--text-reading` | 1.125 | 1.75rem line | Page and app copy |
| `--text-xl` | 1.25 | 1.45 | Section headings, card titles |
| `--text-2xl` | 1.5 | 1.35 | Page headings |
| `--text-4xl` | 2.25 | 1.15 | Article titles |
| `--text-6xl` | 3.75 | 1.02 | A single hero figure, rarely |

Page and app copy is 1.125rem on a **1.75rem line** (leading-7). The blog's article prose is 1rem on
that same 1.75rem line, which is what lands its headings exactly on the `--text-2xl` (1.5rem) and
`--text-xl` (1.25rem) steps; do not raise it without rescaling the headings with it. Body copy sits
at `--ink-700`; headings jump to `--ink`. Nothing between `--text-sm` and `--text-reading` is used
except `--text-base`, so 13px and 15px text do not exist in the system.

Rules:

- Sans for chrome, serif for prose, as above. Do not set a serif on a control or a sans on an
  article paragraph.
- Headings are sentence case, weight 600 to 700. Never heavier than 700.
- Letterspacing: `-0.011em` on serif headings, `0.07em` on uppercase mono or sans eyebrows.
- Numbers that are compared sit in mono with tabular figures.
- Do not mix a fourth family in. Emoji are allowed in content, not in chrome.
- A header title is chrome, not a nameplate: Inter 600 at `--text-xl`, with the menu at Inter 500 and
  `--text-sm`. A serif title reads smaller than the sans menu beside it.
- A wordmark may be two tones: the name in `--ink` and one closing part (a surname, or the domain
  suffix) in `--clay`. Exactly two, chrome only, never inside body copy. fxtrack sets `fx` in ink and
  `track` in clay; anjula.dev sets the first name in ink and the surname in clay.
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
- Hairline rules (`1px solid var(--line)`) do the separating work. No shadows or glows, and the
  ambient wash below is the only gradient.

Spacing is a 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Nothing in between.

## Page shell

Every project shares one shell: a centred 80rem column with wide gutters, a header, an intro, the
content, then a footer. The blog is the reference; the apps adopt the same regions and sizes.

| Region | Vertical space | What it holds |
| --- | --- | --- |
| Header | `1.5rem`, `2.5rem` from 640px | Brand left, menu right |
| Intro | follows the header | Lede, then a supporting line |
| Content | sections `3rem` to `4rem` apart | Reading column, 65ch |
| Footer | `2.5rem` | Copyright and attribution left, appearance control right |

The shell is `--container` wide (80rem), centred, with `--gutter` padding: `1.5rem` on phones,
`3.5rem` from 640px, `6rem` from 768px, `8rem` from 1024px.

### Header

Structure: one flex row, `justify-content: space-between`. The brand sits left, the menu right. From
640px the row is vertically centred. On phones it wraps, the brand takes its own full-width line, and
the menu becomes a left-aligned row beneath it.

| Element | Family | Size | Weight | Colour |
| --- | --- | --- | --- | --- |
| Wordmark | Inter | `--text-xl` 1.25rem | 600 | `--ink`, closing part `--clay` |
| Menu | Inter | `--text-sm` 0.875rem | 500 | `--ink`, hover `--clay` |
| Header meta | Inter | `--text-sm` 0.875rem | 400 | `--ink-500` |

Spacing: `padding-block` `1.5rem`, `2.5rem` from 640px. Menu items sit `1.75rem` apart from 640px
(the inline-end margin), `0.125rem` after the last. On phones the menu row uses a `1.25rem` column
gap and a `0.25rem` row gap.

### Intro

The block directly under the header, before the first content section. It is two lines: a lede and a
supporting sentence.

- Lede: one sentence, `--text-reading` (1.125rem on a 1.75rem line), in `--ink`.
- Supporting line: `--text-reading`, `--ink-700`, `margin-top` `1.25rem`, `max-width` 42rem.

On the blog the intro is prose, so it is Source Serif 4 at 1rem on a 1.75rem line: an `h1` on the
`--text-4xl` step (2.25rem) and a paragraph.

An article opens with its own intro: the title at `--text-4xl` (2.25rem), weight 700, `--ink`,
`margin-bottom` 2rem; a meta line at `--text-base` (1rem), `--ink-500`, `margin-bottom` 2.5rem; then
the feature image at `--radius-lg`, `margin-bottom` 1.5rem.

### Footer

Structure: one flex row, `justify-content: space-between`, `align-items: center`. The left column
holds the copyright and, under it, the disclaimer or attribution; the right holds the appearance
control.

The footer is chrome, so it is Inter throughout.

| Element | Size | Colour |
| --- | --- | --- |
| Copyright | `--text-sm` 0.875rem | `--ink-500` |
| Attribution or disclaimer | `--text-xs` 0.75rem | `--ink-500` |
| Appearance control | `--text-sm`, 3rem square | `--ink-700`, hover `--clay` |

Spacing: `padding-block` `2.5rem`. The apps add `3rem` above the footer. No hairline divides the
footer from the page.

## Surfaces and shape

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 0.375rem | Chips, badges, small controls |
| `--radius` | 0.625rem | Buttons, inputs, small cards |
| `--radius-lg` | 0.875rem | Cards, media, panels |
| `--radius-full` | 9999px | Avatars, pill buttons, tag pills |

- Borders are `1px solid var(--line)`. A surface may use `--hair` for internal division.
- The page background is paper plus the ambient wash, the system's one gradient. Its token,
  geometry and rules are in **Ambient wash** below.
- Media (photos, diagrams) gets `--radius-lg`; avatars and portraits are `--radius-full`.
- `--radius-card` is an alias for `--radius-lg`, and is the name fxtrack uses for its panels.
- Elevation is a background step (`--card` on `--paper`), not a shadow. The blog uses no shadow at
  all. An app card may take the single soft `--shadow-card` for a raised surface, and nothing else
  in the system is allowed one.

## Ambient wash

The page is paper, and the ambient wash is the light on it: two very soft radial glows in the top
corners, under every page. It is the system's only gradient, and it is what makes a flat `--paper`
read as a sheet in a room rather than a screen.

It is published as one token, `--wash-ambient`, which holds the whole `background-image`, composed
from two glow tokens so a project can retune one without copying the other:

| Layer | Token | Geometry | Light | Dark | Fade |
| --- | --- | --- | --- | --- | --- |
| Clay glow | `--wash-glow-clay` | `900px 480px` ellipse at `8% -10%` | `--clay` `#c1603c` at 5% | `--clay` `#e7966e` at 5% | to transparent at 62% |
| Moss glow | `--wash-glow-moss` | `760px 420px` ellipse at `92% -4%` | `--moss` `#78876a` at 4% | `--moss` `#98a688` at 4% | to transparent at 58% |

- The centres sit above the top edge (`-10%`, `-4%`) so only the soft lower half is in frame, as if
  the light source were just off screen.
- Clay paints over moss; both sit over `--paper`. Layer order barely shows at these alphas, but it
  is fixed so the corners never flip.
- The glow tokens reference `--clay` and `--moss`. Because `.dark` remaps those two to their lighter
  steps, the wash follows the mode with no second definition and no `dark:` variant in markup.

Apply it to the page element, not to every surface:

```css
body {
  background-color: var(--paper);
  background-image: var(--wash-ambient);
  background-attachment: fixed;
  background-repeat: no-repeat;
}
```

`tokens.css` ships the same four declarations as the `.ambient` helper. `background-attachment:
fixed` pins the glows to the viewport, so scrolling slides content under a steady light instead of
dragging the light down the page.

Rules:

- One gradient only. Never a second gradient, a glow or a shadow on the page.
- The wash is page chrome. Never paint it on a card, chip, media frame or input. Those sit flat on
  `--card` or `--wash`.
- Never raise an alpha above 5%. It is a hint of colour, not a colour field. If a mode needs more
  presence, change the token once here, not in one project.
- The 5% ceiling keeps every pairing intact: text still meets the palette's 4.5:1 floor against the
  effective page, in both modes.
- The default social card carries the same two hues at card scale (clay 12%, moss 10%), because a
  single 1200x630 image has no scrolling page to light. It is generated by
  `scripts/make-brand-assets.mjs`; when the wash hues change, rerun it.

## Wordmark

A project's name is set in two tones: the name in `--ink`, one closing part in `--clay`. It is
chrome, so it stays Inter and never appears in body copy.

| Project | Markup | Tones |
| --- | --- | --- |
| anjula.dev | `Anjula <span class="wordmark-accent">Karunarathne</span>` | first name ink, surname clay |
| fxtrack | `fx<span class="text-clay-strong">track</span>` | head ink, tail clay |
| cardstock | `card<span class="text-clay-strong">stock</span>` | head ink, tail clay |

- Split once, at a real boundary: the first space, or the join between a head and a known suffix.
  Two tones exactly, never three, never a gradient or an outline.
- The accent tone is clay, so it steps with the mode: `#c1603c` in light, `#e7966e` in dark. On
  anjula.dev the accent is the `wordmark-accent` class; the Tailwind projects use `text-clay-strong`,
  which resolves to the same value.
- The wordmark is a header control, not a nameplate: Inter 600 at `--text-xl` (1.25rem), above a menu
  at Inter 500 and `--text-sm`. Never serif, never heavier than 600.
- Never accent the whole word, never reach for moss or gold, and never split a one-word name into
  more than two parts.

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
4. Give the shell the paper background plus the ambient wash (`--wash-ambient`), `--container`,
   `--gutter` and `--measure`.
5. Set the wordmark in two tones if the project shows a name: the name in ink, the closing part in
   clay.
6. Add `--shadow-card` only if the project raises cards; the blog does not.
7. Check the palette pairings you actually use, in both modes, before shipping.

Projects following the system:

| Project | How it consumes it |
| --- | --- |
| anjula.dev | Hugo/Congo scheme in `assets/css/schemes/paper.css` and `assets/css/custom.css`, values mirroring the tokens |
| fxtrack | Tailwind v4 `@theme` in `packages/web/src/style.css`, values mirroring the tokens |
| cardstock | Tailwind v4 `@theme` in `packages/web/src/style.css`, values mirroring the tokens |
