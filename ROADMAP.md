# Roadmap

> What this file is: where `excel-clipboard-paste` goes next, and — more importantly — the
> **evidence** behind each item. Priorities follow real clipboard behavior and reported
> problems, not feature wishlists.
>
> Current release: `0.1.1` (see [`CHANGELOG.md`](./CHANGELOG.md)).

## How priorities are decided

An item can enter this roadmap only when it has:

1. **A reproduction** — an actual clipboard payload (Excel, Google Sheets, Apple Numbers,
   LibreOffice Calc, Airtable, Notion, a browser grid) or a public bug report that the
   library cannot currently handle.
2. **A cost** — estimated size and maintenance, kept inside the project constraints.
3. **A test** — the reproduction becomes a fixture and a test together with the change.

Standing constraints (non-negotiable):

- Zero runtime dependencies.
- The core stays clipboard → `string[][]`. Everything else is opt-in or a separate package.
- ESM budget ≈ 6 KB gzip (currently ≈ 2.8 KB), enforced in CI.
- Strict TypeScript, ESM + CJS, works in the browser and in Node.

---

## Evidence collected (2026-10-15)

### E1. Quoted cells are the real gap — and a naive split cannot survive them

Spreadsheet apps wrap a cell in double quotes when its value contains a tab, a line break or
a double quote, and escape inner quotes by doubling them. For example, copying one cell whose
content is `cat` + newline + `fish` yields `"cat\nfish"` in `text/plain`. The consequence is
that the common recipe —

```js
text.split("\n").map((line) => line.split("\t"))
```

— silently merges rows and splits cells, which is exactly what this library currently does.

Documented, independently, in:

- PapaParse issue [#358](https://github.com/mholt/PapaParse/issues/358) — "Excel only wraps
  text in double quotes when the value contains the field or record separator".
- SheetJS issue [#1950](https://github.com/SheetJS/sheetjs/issues/1950) — quoted multi-line
  cell collapses multiple rows into one.
- plotly/dash PR [#2202](https://github.com/plotly/dash/pull/2202) — quoted cells with
  multiple lines, and the bug from over-eager unquoting.
- Stack Overflow [67773475](https://stackoverflow.com/questions/67773475) — same failure with
  a working quote-aware parser.
- Mathesar's clipboard spec — per-application behavior, including that LibreOffice Calc
  **corrupts** a cell containing the delimiter by replacing it with a space, Airtable quotes
  on newline but not on tab, and Sheets adds a `data-sheets-value` JSON attribute in HTML.
- A 2026 field guide at clipboardinspector.com — ships a quote-aware TSV parser as the fix.

This is the single most reported way "paste from Excel" breaks in the wild.

### E2. The job to be done is "paste-import", not "parse"

Every product in this space describes the same flow: **capture paste → parse → map columns →
validate → submit**. That includes commercial tools (CSVBox, Updog, Honest UI *PasteTable*)
and open-source components (Mathesar, Dash tables, Ignite UI grids, `paste-from-excel`).

This library owns the first two steps and should stay there; the rest are recipes and thin
adapters, not core features.

### E3. The space is large; the browser-first, zero-dependency niche is open

Weekly npm downloads for adjacent packages:

| Package | Weekly downloads | What it solves |
|---|---|---|
| `csv-parse` | ≈ 20.8M | CSV in Node/streams |
| `exceljs` | ≈ 18.0M | `.xlsx` read/write |
| `papaparse` | ≈ 17.1M | CSV in the browser |
| `xlsx` (SheetJS) | ≈ 12.7M | spreadsheet files |
| `clipboardy` | ≈ 9.0M | system clipboard (Node) |

None of them is a small, dependency-free **browser clipboard → matrix** parser that handles
TSV quoting and an HTML fallback. The demand is proven; the gap is real.

### E4. Large pastes must not freeze the UI

Reported pain: hundreds-to-thousands of rows block the main thread while rendering a preview.
Partly mitigated today (`maxRows` in the core, a 500-row cap in the playground); the remaining
work is a documented chunked/worker path.

### E5. The clipboard often carries typed values in the HTML flavor

Google Sheets embeds `data-sheets-value` (a JSON value per cell) and Excel embeds
`mso-number-format` styles. The exact typed value is recoverable without re-parsing display
text — but only through the HTML route.

---

## Now — v0.2: survive real payloads

### N1 · Quoted-cell parsing in the text route — `quoted` option
- **Need:** E1. Cells containing newlines/tabs (addresses, notes, descriptions) are common.
- **Deliverable:** `parseClipboardText(text, { quoted })` that reads `"…"` fields with `""`
  escapes. Lenient by design: a stray `"` that does not open a valid quoted field stays a
  literal character, matching how Excel and Sheets behave when there is no separator inside.
- **Effort:** small — one character pass, no dependencies.
- **Done when:** Excel/Sheets/Numbers fixtures with quoted tabs, newlines and quotes
  round-trip, with tests.
- **Decision:** ships opt-in in v0.2; flipping the default is a v1.0 major.

### N2 · Real clipboard fixtures
- **Need:** E1 — behavior claims must be reproducible.
- **Deliverable:** `test/fixtures/*.txt` and `*.html` captured from Excel (Windows/macOS),
  Google Sheets, Apple Numbers, LibreOffice Calc and Airtable, each with a test.
- **Done when:** changing behavior for any fixture fails CI.

### N3 · Coverage gate in CI
- **Deliverable:** `@vitest/coverage-v8` with a line/function threshold (target ≈ 90%).
- **Done when:** the threshold is enforced on every pull request.

### N4 · `detectHeader(matrix)`
- **Need:** E2 — header detection is table-stakes in paste-import flows.
- **Deliverable:** a conservative, documented heuristic (first row non-numeric, distinct from
  the rest) exported as a helper, opt-in. There is no auto-magic in the parser.
- **Risk:** heuristics are wrong sometimes; keep it explicit and testable.

---

## Next — v0.3: integration (the actual bottleneck)

### N5 · `usePaste` adapters as separate packages
- **Need:** E3 — consumers live in React/Vue. (`@handsontable/react` ≈ 92k/wk against ≈ 324k
  for the core is the shape of adapter demand.)
- **Deliverable:** `excel-clipboard-paste-react` (a `usePaste` hook and a `<PasteArea>`) and
  `excel-clipboard-paste-vue`. The core stays framework-free; adapters are thin.
- **Done when:** option parity between adapters and shared tests.

### N6 · Recipes (documentation, no core code)
- **Need:** E2 and E4.
- **Deliverable:** documented flows for pasting into an editable table, mapping pasted columns
  to fields, validating rows, chunked/worker import for very large ranges, and exporting to
  CSV/JSON.
- **Why:** adoption comes from being the obvious first step of a documented flow.

### N7 · Deploy the playground and link it
- **Deliverable:** the playground published (GitHub Pages / Cloudflare Pages / Vercel), linked
  from the README, and the demo GIF refreshed on the next npm publish.

### N8 · Distribution
- **Deliverable:** repository topics and social preview; a short "why not just `split('\t')`"
  write-up using the quoted-cell failure as the demo.
- **Signals:** weekly downloads, referrers, and volume of real-payload issues.

---

## Later — v1.0: freeze

- **N9 · API freeze + strict semver.** Decide whether `quoted` becomes the default (major),
  then commit to a stable surface. Adopt Changesets if the repo grows into a monorepo.
- **N10 · Typed values from the HTML flavor** (`data-sheets-value`, `mso-number-format`) via an
  opt-in `{ types: true }` on the HTML route.
- **N11 · Async `readClipboard()`** through the Clipboard API (permission-gated), as a
  complement to the `paste` event.
- **N12 · Optional HTML styles** (`font-weight`, `font-style`, `text-align`, background) via
  `{ styles: true }`, returning `{ matrix, styles }`.

---

## Explicitly not planned

- Reading or writing `.xlsx` / `.xls`, formulas, or number formats — that is SheetJS/ExcelJS.
- An editable grid component — grids exist; this library feeds them.
- CSV file parsing as a core concern — use `papaparse`/`csv-parse`. The playground keeps a
  minimal reader purely for convenience.
- Mapping/validation UI and framework state management — recipes or separate packages.

## Open questions

Each needs a real sample before it becomes a decision:

- How common are multilingual decimals (`1,5`) versus thousands separators (`1,234`) in real
  pastes? This decides coercion defaults.
- Does Google Sheets ever omit `data-sheets-value`? This decides the value of N10.
- How frequent are multi-line cells in the target apps (CRM notes, addresses)? This decides
  when `quoted` becomes the default.
- Which integration matters first — a React hook or the import-flow recipe? Watch real issues.

## Signals to watch

Weekly downloads, stars, open issues, the ESM size budget, coverage, and — most valuable —
the first "I pasted X and got Y" report, which becomes the next fixture in N2.

---

*Last updated: 2026-10-15*
