# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[SemVer](https://semver.org/).

## [Unreleased]

Nothing yet.

## [0.1.1] - 2026-10-15

### Changed
- Documentation (`README.md`, `PLAN.md`, `CHANGELOG.md`), playground UI strings,
  samples, CI step names and script output translated to English.
- No runtime code changes.

## [0.1.0] - 2026-10-15

First version published to npm: `excel-clipboard-paste@0.1.0`.

### Added
- Clipboard parsers: `parseClipboard`, `parseClipboardText`, `parseHtmlTable`,
  `hasHtmlTable`, `readClipboardData` and the deprecated alias `parsePasteEvent`.
- Structural options: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`,
  `maxRows` (applied last, over the result) and `preferHtml` with a fallback to
  `text/plain` only when there is no table.
- `parseHtmlTable` expands `colspan`/`rowspan` robustly (within the HTML standard
  limits: colspan ≤ 1000, rowspan ≤ 65534), ignores nested tables and turns `<br>`
  into a line break.
- Matrix utilities: `matrixStats`, `padMatrix`, `transposeMatrix`, `removeEmptyRows`,
  `removeEmptyColumns`, `getHeaderRow`, `dropHeaderRow`, `isEmptyMatrix`, `cloneMatrix`,
  `mapCells`.
- Opt-in coercion with strict thousands groups (`1,234` yes, `1,5` no) and normalized
  `-0`: `coerceCell`, `coerceMatrix`.
- `toObjects(matrix, { headers })` to turn the matrix into objects using the first row
  as headers (fills empty headers and suffixes duplicates).
- Serializers: `toCSV` (RFC 4180 quoting), `toTSV`, `toMarkdownTable`, `toJSON`
  (accepts matrices coerced with `coerceMatrix`).
- `parseClipboardText` ignores a leading BOM and normalizes `\r\n` / `\r`.
- `readClipboardData` degrades to `""` when `getData` throws or returns a non-string.
- Interactive Vite playground: real pasting, samples, `.tsv`/`.csv`/`.txt` import with
  delimiter detection, capped grid, JSON/CSV/TSV/Markdown outputs, light/dark/auto
  theme and accessible tabs.
- ESM + CJS + types build (tsup, unminified) and zero runtime dependencies.
- CI on GitHub Actions (Node 20/22/24) and a publish pipeline driven by `vX.Y.Z` tags
  with `--provenance`.

### Changed
- Nothing (first version); pre-publication decisions are recorded in
  [`PLAN.md`](./PLAN.md) §3 and §9.

### Removed
- Nothing.
