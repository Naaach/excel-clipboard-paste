# excel-clipboard-paste

[![npm version](https://img.shields.io/npm/v/excel-clipboard-paste)](https://www.npmjs.com/package/excel-clipboard-paste)
[![CI](https://github.com/Naaach/excel-clipboard-paste/actions/workflows/ci.yml/badge.svg)](https://github.com/Naaach/excel-clipboard-paste/actions/workflows/ci.yml)
[![Release](https://github.com/Naaach/excel-clipboard-paste/actions/workflows/release.yml/badge.svg)](https://github.com/Naaach/excel-clipboard-paste/actions/workflows/release.yml)

> Turn what you paste from **Excel** or **Google Sheets** into a clean matrix of rows and columns.
> Zero dependencies · TypeScript · ESM + CJS · works in the browser and in Node.

When you copy a range in a spreadsheet, the browser receives clipboard text separated by
**tabs** (`\t`) and **line breaks** (`\n`). This library turns it into `string[][]`, i.e.
into something you can iterate, validate and store.

```ts
import { parseClipboard } from "excel-clipboard-paste";

element.addEventListener("paste", (event) => {
  event.preventDefault();
  const matrix = parseClipboard(event, { trim: true });
  // [["Ana", "25"], ["Luis", "31"]]
  console.log(matrix);
});
```

---

## Install

```bash
npm install excel-clipboard-paste
# or
pnpm add excel-clipboard-paste
# or
yarn add excel-clipboard-paste
```

Types are included. In Node you only need a DOM (jsdom) if you use the HTML route.

---

## Quick start

### 1. On an element's `paste` event (recommended)

```ts
import { parseClipboard } from "excel-clipboard-paste";

document.querySelector("textarea")?.addEventListener("paste", (event) => {
  event.preventDefault();
  const rows = parseClipboard(event); // string[][]
});
```

### 2. Text only (you already have the clipboard contents)

```ts
import { parseClipboardText } from "excel-clipboard-paste";

parseClipboardText("Ana\t25\nLuis\t31");
// [["Ana", "25"], ["Luis", "31"]]
```

### 3. Prefer the HTML table (source structure)

Some applications also include a `text/html` version containing a real `<table>`.
You can prefer it and automatically fall back to text only when **no** table is present:

```ts
const rows = parseClipboard(event, { preferHtml: true });
```

---

## API

### Main parsers

| Function | Description |
|---|---|
| `parseClipboard(event, options?)` | Reads a `ClipboardEvent` and returns `string[][]`. Supports `preferHtml`. |
| `parseClipboardText(text, options?)` | Turns already-obtained text into a matrix (ignores a leading BOM). |
| `parseHtmlTable(html, options?)` | Extracts and expands a `<table>` from `text/html`. |
| `hasHtmlTable(html)` | `true` if the HTML contains a table, without parsing it. |
| `readClipboardData(event)` | Returns `{ text, html }` with no side effects. |
| `parsePasteEvent` | Alias of `parseClipboard` (compatibility). *Deprecated.* |

### Parser options (`ParseOptions`)

| Option | Default | What it does |
|---|---|---|
| `trim` | `false` | Trims whitespace around every cell. |
| `dropEmptyRows` | `false` | Removes rows whose cells are all empty. |
| `dropEmptyColumns` | `false` | Removes columns that are empty in every row. |
| `rectangular` | `false` | Pads short rows with `""` up to the widest row. |
| `maxRows` | `Infinity` | Caps the number of **result** rows (applied last). |
| `preferHtml` | `false` | (only `parseClipboard`) uses the HTML table if present. |

### Matrix utilities

```ts
import {
  matrixStats,      // { rows, columns, cells, emptyCells, nonEmptyCells, isEmpty, isRectangular }
  padMatrix,        // ragged -> rectangular
  transposeMatrix,  // swaps rows and columns
  removeEmptyRows,  // drops empty rows
  removeEmptyColumns,
  getHeaderRow,     // first row (defensive copy)
  dropHeaderRow,    // matrix without the first row
  isEmptyMatrix,
  cloneMatrix,
  mapCells,
  coerceMatrix,     // "25" -> 25, "true" -> true (opt-in)
  coerceCell,
  toObjects,        // [["Name","Age"],["Ana","25"]] -> [{ Name: "Ana", Age: "25" }]
} from "excel-clipboard-paste";
```

`coerceCell` only strips commas when they form consistent thousands groups
(`1,234` → `1234`), so a European decimal such as `1,5` is **not** turned into `15`.
Leading zeros (`"007"`) do become numbers; if that matters to you, skip coercion for
those columns.

### Serializers

```ts
import { toCSV, toTSV, toMarkdownTable, toJSON } from "excel-clipboard-paste";

toTSV([["A", "B"]]);          // "A\tB"
toCSV([["a,b", 'x"y']]);      // "\"a,b\",\"x\"\"y\""
toMarkdownTable([["A"], ["1"]]); // "| A |\n| --- |\n| 1 |"
toJSON([["A"]]);              // pretty JSON (accepts matrices coerced with coerceMatrix)
```

> `toTSV` round-trips with `parseClipboardText` **as long as no cell contains a tab or a
> line break**: in TSV those cells are ambiguous by definition.

---

## How it works

1. Normalizes Windows (`\r\n`) and classic Mac (`\r`) line endings to `\n`, and ignores a leading BOM.
2. Strips **only** trailing line breaks (pasting must never add a phantom row),
   but **keeps** trailing tabs, which represent empty trailing cells.
3. Splits rows on `\n` and cells on `\t`.
4. Applies the options in order: `trim` → `dropEmptyRows` → `dropEmptyColumns` →
   `rectangular` → `maxRows`.

The resulting matrix is **always `string[][]`**. Number/boolean inference is opt-in
via `coerceMatrix`, so nothing Excel sent is ever silently altered.

---

## Interactive playground (Vite)

The repo ships an interactive demo in `playground/`:

```bash
pnpm install
pnpm dev        # opens the playground in your browser
```

It lets you paste for real (or open/drop a `.tsv`, `.csv` or `.txt` file, with automatic
**delimiter detection**), toggle the parser options, inspect the grid and copy the output
as JSON, CSV, TSV or Markdown. Light/dark/auto theme, keyboard-friendly tabs and
`requestAnimationFrame` rendering.

```bash
pnpm build:demo # builds the static site into dist-demo/
```

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server for the playground (Vite). |
| `pnpm build` | Builds the library into `dist/` (ESM + CJS + types) with tsup. |
| `pnpm build:demo` | Builds the static playground. |
| `pnpm test` | Runs the test suite (Vitest + jsdom). |
| `pnpm test:watch` | Tests in watch mode. |
| `pnpm typecheck` | Type-checks with `tsc --noEmit`. |
| `pnpm size` | Fails if the ESM bundle exceeds the budget (6 KB gzip). |

Current size: **≈ 9.3 KB raw / ≈ 2.8 KB gzip** (ESM, unminified).

---

## Publishing a new version

Publishing is automatic. The [`Release`](./.github/workflows/release.yml) workflow
triggers when a `vX.Y.Z` tag is pushed, runs `typecheck` + `test` + `build` + `size`,
publishes to npm with **provenance** and creates the GitHub release with generated notes.

One-time setup:

1. Create an **Automation** access token on npmjs.com
   (*Account Settings → Access Tokens*).
2. Add it as the **`NPM_TOKEN`** secret under
   *Settings → Secrets and variables → Actions*.

Then publishing is just:

```bash
pnpm version patch   # or minor / major: bump + commit + tag vX.Y.Z
git push --follow-tags
```

The workflow also:
- verifies that the tag matches the version in `package.json`;
- **never publishes the same version twice** (idempotent when re-run);
- fails with a clear message if the `NPM_TOKEN` secret is missing.

---

## Known limitations (v0)

- It does **not** read or generate `.xlsx` / `.xls` files. Clipboard only.
- It does **not** interpret styles (bold, color, alignment) even when the HTML table has them.
- It does **not** interpret dates, formulas or formats; that is your call via `coerceMatrix`.
- `text/html`: `colspan`/`rowspan` are expanded within the HTML standard limits
  (colspan ≤ 1000, rowspan ≤ 65534). A merged cell keeps its value in the first slot and
  the rest stay empty. CSS attributes are not interpreted.
- The text parser does **not** understand quoted CSV or line breaks inside a cell: that is
  spreadsheet clipboard, not CSV. The playground ships a minimal CSV reader (with quoting
  and delimiter detection) for importing files, but it is not part of the core.
- `toTSV` loses its round-trip if a cell contains `\t` or `\n` (a format limitation).

If any of these shows up in real usage, it will be added with dedicated tests before
complicating the parser (see `PLAN.md`).

---

## Roadmap

See [`PLAN.md`](./PLAN.md) for the full plan, design decisions and proposed improvements
(React/Vue adapters, HTML styles, etc.). The change history lives in
[`CHANGELOG.md`](./CHANGELOG.md).

---

## License

[MIT](./LICENSE)
