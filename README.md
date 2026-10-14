# Shelf Shot Studio

Turn raw app screenshots into store-ready marketing images for Google Play and the App Store.
Everything runs in the browser: no backend, no account, screenshots never leave your machine.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000 (slower: Next compiles each page the first time you open it)
npm run preview    # production build + server, the real speed of the app
npm test           # unit tests (Vitest)
npm run e2e        # browser tests (Playwright): Chrome, Safari (WebKit), Firefox, plus phone/tablet/Mac profiles; own server on :3100
npm run lint && npm run typecheck
npm run thumbnails # re-draw public/templates/*.png after adding or restyling a template
npm run fonts      # re-copy fonts from @fontsource after editing scripts/sync-fonts.mjs
```

## Folder structure

```
src/
  app/           Next.js App Router. (wizard)/ holds one route per step: /upload /targets /template /customize /export
  components/
    ui/          shadcn/ui primitives (generated, don't hand-edit)
    shared/      small reusable form pieces (Field, Notice, SelectField, ColorInput)
    layout/      Wizard shell, ThemeToggle
    templates/   Template step pieces: category list, template grid, per-screenshot target picker
    steps/       one component per wizard step (Upload, Targets, Template, Customize, Export)
    editor/      pieces of the Customize step (brand, background, fit, screenshot position, languages)
    builder/     the visual template builder: drag-and-drop canvas (CanvasOverlay + canvasMath), undo history, side panels, AI/JSON import
    preview/     live preview (SlideCanvas calls the renderer)
  config/        storePresets.ts (every store size), steps.ts (wizard routes), securityHeaders.ts
  export/        which sizes to export (outputs.ts) and the ZIP download (exportZip.ts)
  localization/  languages list and per-language slide text
  renderer/      ALL drawing logic: renderSlide, frames, text, fit, PNG encoder, worker
  store/         Zustand stores: the open project (useProject), the project list (useProjects), IndexedDB storage (projectRegistry)
  templates/     the 47 built-in templates as JSON, the loader/validator, and the AI prompt generator (masterPrompt + promptDesigns)
  validation/    lint rules (Google Play wording), size/aspect warnings, step unlocking rules
  lib/           generic helpers (cn, image cache, theme)
  types.ts       shared types
e2e/             Playwright tests
scripts/         sync-fonts.mjs
```

Rendering logic never lives in React components; components only call into `src/renderer/`.

## How it works

- **One renderer:** `renderSlide()` draws both the preview (small canvas) and the export (full size).
  Every measurement is a percentage of canvas width, so they cannot drift.
- **Export:** a Web Worker (`src/export/renderInWorker.ts`) loops languages × slides × sizes on an `OffscreenCanvas`, encodes each result
  as an RGB PNG (no alpha channel), and the main thread zips them (JSZip). Browsers without OffscreenCanvas in workers (some Safari builds)
  use `renderOnMainThread.ts` instead: same renderer, same output.
- **Saving** (`src/store/projectRegistry.ts`, `blobStorage.ts`): settings are saved in the background the moment they change
  (always the latest state, so typing never waits on the disk). Each screenshot is stored once under its own IndexedDB key (as a Blob, or as raw bytes in
  browsers that cannot store Blobs, such as some Safari builds), so changing a headline never rewrites your images.
- **Localization** (`src/localization/`): this localises the text _on the images_, not the app UI, so no
  i18n library (next-intl, i18next) is used. Each slide keeps its base text plus a `translations` map
  per language; `localizeSlide()` swaps the text before rendering. Script handling lives in
  `src/renderer/language.ts`: fallback fonts (Noto Sans family), right-to-left layout for Arabic, and
  per-character line breaking for Chinese/Japanese.
- **Projects:** like chat apps, you can create, rename, switch and delete projects (header button). Each project
  is saved under its own IndexedDB key; removing a project's last screenshot resets that project's settings.
- **Steps are routes, and they are guarded:** steps unlock in order (a screenshot, then a target size).
  `furthestStep()` in `src/validation/steps.ts` drives both the disabled step buttons and a route guard in
  `Wizard.tsx`, so typing `/export` in the address bar before finishing earlier steps redirects back.
- **Security:** `src/config/securityHeaders.ts` sets a strict Content-Security-Policy (same-origin only, no framing,
  no plugins), `nosniff`, a referrer policy, a permissions policy and HSTS in production. Uploads are only
  decoded as images, ZIP paths come from fixed folders (user labels never reach a path), and template JSON
  is parsed with `JSON.parse` (never evaluated).
- **Theme:** light/dark via a `dark` class on `<html>` (set before first paint, saved in localStorage).

## Templates, categories and colors

- Every template has a `category` (see `src/templates/categories.ts`): General, Education, Office & Business, Food &
  Spicy, Fitness & Gym, Health & Hospital, Kids & Cartoon and Games. The Template step shows the categories on the
  left and the chosen category's templates on the right. Templates you build yourself are filed under "My templates".
- **General** templates are the all-purpose designs. Every color in them comes from the brand color, so they suit any
  app and recolor harmoniously when the brand color changes. The themed categories keep their own hand-picked palette.
  Switching on **Match all templates to my brand color** (Customize step) rotates the colorful parts of every themed
  template to the brand hue (each themed template records its main `themeColor`), keeping neutrals and the design.
- The "Design for" row picks **All screenshots** (the project default) or a single screenshot. A single screenshot stores
  its own `templateId`; screenshots without one use the default. Export renders each slide with its own template.

### Where colors come from

- **Brand color** (Customize step): the project-wide main color. Templates reference it with tokens that the renderer
  expands (`src/renderer/brand.ts`): `{brand}`, `{brand-light}`, `{brand-pale}`, `{brand-dark}`, `{brand-deep}`,
  `{brand-glow}`, `{brand-shift}` and `{brand-pop}` (a complementary accent). Change the brand color once and every slide
  follows.
- **Background / text color** (Customize step): saved per screenshot _and per design_ (`slide.styles[templateId]`) inside
  the project, so switching that screenshot to another template shows that template with its own look, and switching
  back restores your choice. It never edits the template. Shapes marked `"paintsBackground": true` (big split halves and bands) are replaced by the
  chosen background, so the choice works on every template. "Template default" undoes it, "Apply to all" copies it.

## Adding a template

You can build one in the app (Template step → _Edit: <current template>_: pick a starting design, then drag things on the
live preview, and use the Advanced tab for raw JSON), generate one with AI (_Create with AI / JSON_), or add a built-in one:

1. Copy a file in `src/templates/` and edit it. Layers (`text`, `device`, `bullets`, `shape`, `callout`) use `x`, `y`, `w`,
   `fontSize` as percentages of canvas width. Layers draw in list order, so put shapes first to sit behind the text and phone.
   - `shape`: `circle`, `roundRect` or `polygon` (`points`) with a solid, gradient or `radial` (soft glow) `fill`, plus
     `opacity`, `rotate`, `shadow`, `stroke` + `strokeWidth` (outlines and rings, `fill` may be omitted), `dash`, `blend`
     (`screen`, `overlay`, `multiply`, `lighter`, `soft-light`) and `hideOnWide`. Set `"yUnit": "height"` to measure y from
     the canvas height, which keeps full-canvas splits and diagonals correct at every size.
   - `text` extras: `rotate`, `uppercase`, `shadow`, `opacity`, and `stroke` + `strokeWidth` for outlined lettering
     (`"color": "transparent"` gives outline-only text). Text below 50% opacity counts as decoration, not tagline.
   - `device` looks: `rotate`, `skewX` / `skewY` (isometric tilt), `depth` + `depthAngle` + `depthColor` (an extruded edge),
     `dim`, `frameStyle` (`dark`, `silver`, `gold`, `titanium`, `white`), `rim` (a neon edge), `gloss` (glass shine) and
     `show` (`self`, `prev` or `next`: which screenshot appears on this phone, so a row of phones can tell a story).
   - `cuts` slices a phone along lines for split-phone looks: each cut is `{ x1, y1, x2, y2, keep }` with the line given
     as fractions of the phone body and `keep` set to `"left"` or `"right"` of the line direction. Use device layers with
     opposite `keep` values, move them apart with `x` / `y` / `rotate`, and each piece shows its part of the screenshot.
     `cutGlow` draws a colored edge along the cut (see `slice-duo.json`, `split-reveal.json`).
   - `callout` is a feature card (a rounded box with a bold title and a short description), for Play Store style
     listings. Give it `index` (0 to 2), `x`, `y`, `w` and `fontSize` (its height is automatic), plus optional `look`
     (`glass`, `solid`, `outline`, `accent`), `icon` (`none`, `number`, `tick`), `fill`, `color`, `accentColor`,
     `radius`, `rotate` and `align`. The text is not in the template: card `index` shows `slide.bullets[index]`, written
     as `"Title|Description"` (the Customize step has a Title and a Description field per card, and a card with no
     text is hidden). Keep cards clear of the phone so they never hide the screenshot (see `card-row.json`,
     `card-stack.json`, `card-rail.json`).
2. Tablets get an automatic layout (tablet frame, widened and re-centered phones). Add `tabletOverrides` /
   `wideOverrides` (keyed by layer id, role or type) only when a design needs something special.
3. Set its `"category"`, import it in `src/templates/index.ts`, set `"thumbnail": "/templates/<id>.png"` and run
   `npm run thumbnails`. The unit tests render it at every preset
   automatically and check its size, alpha channel and preview-versus-export match.

## The template builder canvas

The builder's preview is editable. Click an item to select it, drag it to move it, pull its handles to resize or rotate it,
and use the red ✕ to delete it. Arrow keys nudge (Shift for bigger steps), Delete removes, Ctrl+D duplicates and
Ctrl+Z / Ctrl+Y undo and redo. Items snap to the canvas and to each other (hold Alt to turn snapping off). The **Add** bar
above the preview adds circles, squares, glows, rings, bands, phones and feature cards.

- The renderer reports where it drew every layer (`RenderReport.boxes`), so the overlay lines up with real text heights
  and shrunk phones. `components/builder/canvasMath.ts` holds the pure maths (move, scale, width, rotate, snap and
  exact hit-testing, so rings, diagonal bands and the visible half of a cut phone are only clickable where they are drawn).
- Big soft shapes (glows, background bands) are not click targets; pick them from the layers list under the preview.
- Only the phone layout is editable. Tablet and wide layouts are derived from it.
- Dragging a phone sets `bleed: true` on it so it moves rigidly instead of being squashed to fit above the bottom edge.

## Create with AI

_Create with AI / JSON_ copies a prompt for ChatGPT, Claude or Gemini and imports the JSON it returns. There are three
styles: **Wow / Complex** (split-screen cuts or 3-D), **Clean / Simple**, and **Feature cards**. Each click builds a new design
(`src/templates/promptDesigns.ts`): it generates many candidates, keeps one that is far from every existing template
(built-in and custom), and checks that the screenshot stays fully visible and that no card covers a phone. Pasted JSON
is flagged if it looks like an existing template.

## Adding a language or store size

- Language: add a line to `src/localization/locales.ts`; if it needs a new script font, see
  `src/renderer/language.ts` and `scripts/sync-fonts.mjs`.
- Store size: append one entry to `PRESETS` in `src/config/storePresets.ts`.
