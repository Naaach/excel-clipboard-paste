# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y
[SemVer](https://semver.org/lang/es/).

## [Unreleased]

Nada todavía.

## [0.1.0] - 2026-10-15

Primera versión publicada en npm: `excel-clipboard-paste@0.1.0`.

### Added
- Parser de portapapeles: `parseClipboard`, `parseClipboardText`, `parseHtmlTable`,
  `hasHtmlTable`, `readClipboardData` y el alias deprecado `parsePasteEvent`.
- Opciones estructurales: `trim`, `dropEmptyRows`, `dropEmptyColumns`,
  `rectangular`, `maxRows` (se aplica al final, sobre el resultado) y `preferHtml`
  con *fallback* a `text/plain` solo cuando no hay tabla.
- `parseHtmlTable` expande `colspan`/`rowspan` de forma robusta (con los límites del
  estándar HTML: colspan ≤ 1000, rowspan ≤ 65534), ignora tablas anidadas y convierte
  `<br>` en salto de línea.
- Utilidades de matriz: `matrixStats`, `padMatrix`, `transposeMatrix`,
  `removeEmptyRows`, `removeEmptyColumns`, `getHeaderRow`, `dropHeaderRow`,
  `isEmptyMatrix`, `cloneMatrix`, `mapCells`.
- Coerción opt-in con grupos de miles estrictos (`1,234` sí, `1,5` no) y `-0`
  normalizado: `coerceCell`, `coerceMatrix`.
- `toObjects(matrix, { headers })` para convertir la matriz en objetos usando la
  primera fila como cabecera (rellena cabeceras vacías y sufija duplicados).
- Serializadores: `toCSV` (quoting RFC 4180), `toTSV`, `toMarkdownTable`, `toJSON`
  (acepta matrices forzadas con `coerceMatrix`).
- `parseClipboardText` ignora el BOM inicial y normaliza `\r\n` / `\r`.
- `readClipboardData` degrada a `""` si `getData` lanza o devuelve un no-string.
- Playground Vite interactivo: pegado real, ejemplos, importación de `.tsv`/`.csv`/`.txt`
  con detección de delimitador, grid con cap de filas, salidas JSON/CSV/TSV/Markdown,
  tema claro/oscuro/auto y pestañas accesibles.
- Build ESM + CJS + tipos (tsup, sin minificar) y cero dependencias de runtime.
- CI en GitHub Actions (Node 20/22/24) y pipeline de publicación con tags `vX.Y.Z`
  y `--provenance`.

### Changed
- Nada (primera versión); las decisiones anteriores a la publicación quedan recogidas
  en [`PLAN.md`](./PLAN.md) §3 y §9.

### Removed
- Nada.
