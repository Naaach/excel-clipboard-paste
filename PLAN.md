# 📐 Plan — `excel-clipboard-paste`

> Goal: receive a paste from **Excel** or **Google Sheets** and turn it into a **matrix of
> values** (`string[][]`). It is an **npm dependency** with an **interactive example site
> (Vite)** in the same repo.
>
> Model: a **tiny, framework-agnostic core** plus a playground that consumes it.
> This file is the editable source of truth: check, uncheck and add things.

**Name:** `excel-clipboard-paste` (the original plan called it `excel-paste`).
**Status:** `0.1.1` published. Repo at `github.com/Naaach/excel-clipboard-paste`.
**Changes:** see [`CHANGELOG.md`](./CHANGELOG.md).

---

## 1. What it is and why

Copying a range in Excel/Sheets puts clipboard text with **tabs** between cells and
**line breaks** between rows (the `text/plain` flavor). That is 90% of the real cases and
almost nobody handles it well in isolation. The idea is to have a small, dependency-free,
well-tested piece that can be used in any web app or framework.

The trick is not "parsing well" (it is simple) but **parsing the edges well**: `\r\n`
endings, trailing tabs, phantom rows, empty cells, and never breaking the data type Excel
sent.

---

## 2. Current state (what is ALREADY done) ✅

### Core
- [x] `src/parse.ts` → `parseClipboardText`, `parseClipboard`, `parseHtmlTable`, `hasHtmlTable`, `readClipboardData`, `parsePasteEvent`.
- [x] `src/matrix.ts` → utilities (`matrixStats`, `padMatrix`, `transposeMatrix`, `coerceMatrix`, `toObjects`, serializers…).
- [x] `src/types.ts` → public types (`Matrix`, `ParseOptions`, `MatrixStats`…).
- [x] `src/index.ts` → single public API.
- [x] No runtime dependencies. Strict TypeScript (`noUncheckedIndexedAccess` included).
- [x] Dual **ESM + CJS + `.d.ts`** build with tsup, **unminified**: ≈ 9.3 KB raw / ≈ 2.8 KB gzip (ESM).
- [x] Normalizes `\r\n` and `\r`; keeps trailing tabs; ignores trailing newlines and a leading **BOM**.

### Extras on top of the original plan
- [x] **Structural options**: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows` (applied last, over the result).
- [x] **`text/html` route**: `parseHtmlTable` expands `colspan`/`rowspan` within the HTML standard limits (1000 / 65534), ignores nested tables and turns `<br>` into `\n`.
- [x] **`preferHtml`** with a fallback to text only when **there is no table** (not when the options empty the matrix).
- [x] **`hasHtmlTable`** to check without parsing.
- [x] **Matrix utilities** and **serializers** (`toCSV` with RFC 4180 quoting, `toTSV`, `toMarkdownTable`, `toJSON`).
- [x] **`toObjects`**: matrix → array of objects with headers (fills empty ones, suffixes duplicates).
- [x] **Opt-in `coerceMatrix`** with strict thousands groups (`1,234` yes, `1,5` no) and normalized `-0`.

### Playground (Vite)
- [x] Light/dark/auto theme with persistence; `<h1>`; visible focus on every control.
- [x] Real pasting (captures the event's `text/html`), sample buttons, drag & drop for **files only**, open `.tsv`/`.csv`/`.txt`.
- [x] **Delimiter detection** (`,` `;` `\t` `|`) when importing CSV; respects quotes and line breaks inside fields.
- [x] Spreadsheet-like grid (column letters / row numbers), 500-row cap with a notice.
- [x] Outputs: Grid, JSON, CSV, TSV, Markdown + copy; `coerce` affects the grid **and** JSON (CSV/TSV/Markdown keep the original text).
- [x] Accessible tabs (`role=tablist`, `aria-selected`, roving tabindex with arrows/Home/End).
- [x] Render coalesced with `requestAnimationFrame`; the cap is applied before coercing.

### Quality
- [x] **72 tests** (Vitest + jsdom): parser, HTML (colspan/rowspan/nested/`<br>`/clamps), utilities, coercion, serializers, playground CSV.
- [x] GitHub Actions: `typecheck` + `test` + `build` + `build:demo` + `size` on Node 20/22/24.
- [x] `pnpm size` with a 6 KB gzip budget.
- [x] `CHANGELOG.md`, `.gitattributes` (LF), `.editorconfig`, complete npm metadata (`repository`, `bugs`, `homepage`, `packageManager`).
- [x] Adversarial review with agents (core, tests, playground, packaging) — findings fixed (see §9).
- [x] **Published on npm: [`excel-clipboard-paste@0.1.0`](https://www.npmjs.com/package/excel-clipboard-paste)** with SLSA provenance and a GitHub release.

---

## 3. Design decisions

- [x] **The parser never infers types.** It returns `string[][]`. Coercion is opt-in.
- [x] **No runtime dependencies.** An optional DOM (jsdom/DOMParser) only for `text/html`.
- [x] **Framework-free core.** React/Vue, if they come, will be thin adapters.
- [x] **`parseClipboardText` never touches the clipboard.** It only transforms text.
- [x] **CSV stays out of the core.** It is spreadsheet clipboard, not CSV. The playground ships a minimal CSV reader.
- [x] **Documented option order**: `trim` → `dropEmpty*` → `rectangular` → `maxRows`.
- [x] **Invalid `maxRows` (NaN) disables the cap** instead of throwing.
- [x] **`removeEmptyColumns` keeps short rows short** (does not pad to the header width).
- [x] **Unminified build** (9 KB does not need minification and stays debuggable).
- [x] **Name compatibility**: `parsePasteEvent` is kept as a deprecated alias.

---

## 4. Repo structure

```text
excel-clipboard-paste/
├── src/
│   ├── parse.ts        # text and event parser (+ HTML)
│   ├── matrix.ts       # utilities and serializers
│   ├── types.ts        # public types
│   └── index.ts        # public API
├── playground/         # interactive site (Vite)
│   ├── index.html
│   ├── main.ts
│   ├── playground.css
│   ├── samples.ts
│   └── csv.ts          # CSV import + delimiter detection (playground only)
├── test/               # 72 tests
│   ├── parseClipboardText.test.ts
│   ├── parseClipboard.test.ts
│   ├── html.test.ts
│   ├── matrix.test.ts
│   └── csv.test.ts
├── scripts/size.mjs    # size budget
├── .github/workflows/ci.yml
├── .github/workflows/release.yml
├── CHANGELOG.md
├── README.md
├── PLAN.md             # ← this file
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml # pnpm settings only (esbuild allowBuilds)
├── tsup.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── .gitattributes / .gitignore / .editorconfig / LICENSE
```

---

## 5. Implemented API

```ts
// Parsers
parseClipboard(event, options?)      // ClipboardEvent -> string[][]
parseClipboardText(text, options?)   // string -> string[][]
parseHtmlTable(html, options?)       // "<table>" -> string[][]
hasHtmlTable(html)                   // boolean, without parsing
readClipboardData(event)             // -> { text, html }
parsePasteEvent                      // deprecated alias of parseClipboard

// Utilities
matrixStats, padMatrix, transposeMatrix,
removeEmptyRows, removeEmptyColumns,
getHeaderRow, dropHeaderRow, isEmptyMatrix, cloneMatrix, mapCells,
coerceMatrix, coerceCell, toObjects

// Serializers
toCSV, toTSV, toMarkdownTable, toJSON
```

Options: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows`, `preferHtml`.

---

## 6. Proposed improvements (roadmap) 🚧

### v0.2 — polish and harden
- [ ] Code coverage (`@vitest/coverage-v8`) with a minimum threshold in CI.
- [ ] Real Excel and Google Sheets copies stored as text fixtures.
- [ ] Manual paste testing in Chrome, Firefox and Safari (Windows/macOS).
- [ ] `presets.ts` with typical combinations (`forSheets`, `forExcel`).
- [ ] Recipes in the README (editable table, validation, DB import).
- [ ] ESLint/Prettier + Dependabot.
- [ ] Decide whether a lone `\r` inside a cell should count as a row break (today it does).

### v0.3 — more clipboard formats
- [ ] Basic HTML table styles (`font-weight`, `font-style`, `text-align`, color):
      tentative API `parseHtmlTable(html, { styles: true }) -> { matrix, styles }`.
- [ ] Optional and explicit number/date detection (`{ types: true }`), with locale support.
- [ ] Multiline quoted cells in the **core** (only if real usage demands it).
- [ ] `readClipboard()` async with the Clipboard API (user permission).
- [ ] Lightweight `.xlsx` export (or keep it out? see risks).

### v0.3 — adapters (optional, only if there is demand)
- [ ] `excel-clipboard-paste-react`: `<PasteArea>` + `usePaste`.
- [ ] `excel-clipboard-paste-vue`: `<PasteArea>` + `usePaste` + plugin.
- [ ] 100% option parity between adapters.

### v1.0 — consolidate
- [ ] Frozen API + strict semver.
- [ ] Deployed playground (GitHub Pages / Cloudflare Pages / Vercel) + GIF in the README.
- [ ] Changesets for versioning (if it grows into a monorepo).

### Loose ideas / parking (evaluate, do not promise)
- [ ] A "paste into an editable grid" mode (probably a different package).
- [ ] Integrations with `handsontable`/`ag-grid` as examples, not dependencies.
- [ ] CLI `npx excel-clipboard-paste` to convert `.tsv` from stdin to `.json`.
- [ ] Web Worker for huge ranges.
- [ ] Heuristic header detection (`{ detectHeader: true }`).
- [ ] `fromObjects(records)` as the inverse of `toObjects`.

---

## 7. Publishing to npm

✅ **Published: [`excel-clipboard-paste@0.1.0`](https://www.npmjs.com/package/excel-clipboard-paste)**
(2026-10-15), with **SLSA provenance** signed from GitHub Actions, a registry signature and a
[GitHub release](https://github.com/Naaach/excel-clipboard-paste/releases/tag/v0.1.0).

The pipeline (`.github/workflows/release.yml`) is the official path: tag `vX.Y.Z` →
`typecheck + test + build + size` → `npm publish --provenance` → GitHub release.
Idempotent: if the version is already on npm, it skips publishing.

Notes from the first publish (so we do not step in the same puddle again):

- 🔴 The first attempt failed with `E422`: npm only accepts provenance from **public**
  repositories. At that moment the registry read the visibility as `private`. Once the
  public visibility was confirmed (anonymous API), a **rerun of the same run** published
  without changing anything.
- The registry creates an internal `0.0.0-stage` entry the first time a package name is
  claimed: it is an npm artifact, not an installable version (the `latest` dist-tag is `0.1.0`).
- Verified by installing from npm in a clean project: `require` (CJS) and `import` (ESM)
  both work, with correct types and `exports`.

Next releases:
- [ ] `pnpm version patch|minor|major && git push --follow-tags` (the pipeline does the rest).
- [ ] Consider Changesets if the repo grows into a monorepo (v1.0).

---

## 8. GitHub repo

- [x] Repo created: `github.com/Naaach/excel-clipboard-paste` (public, `main` tracking `origin/main`).
- [x] CI with Actions (Node 20/22/24) and the Release pipeline (tag → npm + GitHub release).
- [x] `v0.1.0` release created on GitHub.
- [ ] Deploy the playground (Pages) and link it from the README.
- [ ] Repo topics/description and social image.

---

## 9. Adversarial review (agents) — findings fixed

Four independent reviewers ran (core, tests, playground, packaging). The important things
that were fixed:

**Core**
- 🔴 `parseHtmlTable`: a `rowspan` followed by a shorter row **lost or displaced values**
  (the carry was skipped when a gap preceded it). The grid algorithm was rewritten: active
  slots always occupy their row and cells are placed into the first free slot.
- 🔴 `colspan="1e999"` → infinite loop / OOM when pasting. Spans are now truncated and
  clamped to the HTML standard limits (1000 / 65534).
- 🔴 `coerceCell("1,5")` → `15` (European decimals corrupted). Commas are now only stripped
  with strict thousands groups; `-0` → `0`.
- 🟠 Nested tables leaked rows/cells (now `table.rows` / `tr.cells`).
- 🟠 `<br>` inside a cell was lost (now `\n`, matching `text/plain`).
- 🟠 `maxRows` was applied before `dropEmptyRows` and discarded valid rows.
- 🟠 `readClipboardData` propagated `getData` exceptions.
- 🟡 `removeEmptyColumns` padded short rows; `toMarkdownTable` let `\r` through;
  `toTSV` promised a round-trip that does not always exist (documented).

**Playground**
- 🟠 `coerce` only affected the grid (JSON/CSV kept text). Now it affects grid and JSON,
  and the label says so.
- 🟠 Tabs without `aria-selected` or keyboard navigation → full tablist with roving tabindex.
- 🟠 The "Open file" button was not keyboard accessible (hidden input) → real button.
- 🟠 The drop zone hijacked normal text drags → only acts on files.
- 🟠 Stale `pendingHtml` leaked into later edits.
- 🟡 BOM not stripped, CSV with `;` collapsing into one column (delimiter detection),
  cap applied before coercing, per-frame rendering, `--null` contrast, stale `fileMeta`.

**Packaging / CI**
- 🔴 The Node 18 job was going to fail (vite 7 requires ≥ 20.19) → matrix `20/22/24`.
- 🟠 pnpm 10 vs 12 skew → fixed `packageManager` and `action-setup` without a version.
- 🟠 Missing `repository`/`bugs`/`homepage`/`author` and the `default` exports condition.
- 🟡 `prepublishOnly` without `typecheck`, unnecessary `minify: true`, no `CHANGELOG.md`,
  no `.gitattributes`, incomplete `.gitignore` (`*.tgz`, `.vscode/`…).

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| "It's a `split('\t')`, why a library?" | Emphasize the edges (CRLF, empty cells, phantom rows, HTML) and ship tests + a playground. |
| Scope creep towards table editors / xlsx | Keep the core tiny; anything heavy goes to "parking" or another package. |
| npm name taken | Check first; alternatives: `clipboard-to-matrix`, `spreadsheet-paste`, `paste-table`. |
| Browser differences in `text/html` | Always fall back to `text/plain`; never depend on the HTML. |
| Maintenance | Deliberately boring and stable library; changes only with tests. |

---

## 11. History

The changelog lives in [`CHANGELOG.md`](./CHANGELOG.md) (npm does not include `PLAN.md`).

---

*Last updated: 2026-10-15*
