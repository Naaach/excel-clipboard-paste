# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y
[SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- `parseHtmlTable` ahora expande `colspan`/`rowspan` de forma robusta: los huecos
  provocados por filas más cortas ya no pierden ni desplazan valores, las tablas
  anidadas se ignoran y `<br>` dentro de una celda se convierte en salto de línea.
- `hasHtmlTable(html)` para comprobar si un portapapeles trae tabla sin parsearlo.
- `toObjects(matrix, { headers })` para convertir la matriz en objetos usando la
  primera fila como cabecera (rellena cabeceras vacías y sufija duplicados).
- `toJSON` acepta matrices con valores forzados (`coerceMatrix`).
- `parseClipboardText` ignora el BOM inicial.
- Playground: importación de `.csv` con detección de delimitador, arrastre de solo
  archivos, pestañas accesibles (roving tabindex), render por `requestAnimationFrame`.

### Changed
- `maxRows` se aplica al final, después de `trim`/`dropEmptyRows`/`dropEmptyColumns`/
  `rectangular`, de modo que cuenta filas del resultado y no filas crudas.
- `coerceCell` solo elimina comas cuando forman grupos de miles consistentes
  (`1,234`); `1,5` ya no se convierte en `15`. `-0` se normaliza a `0`.
- `removeEmptyColumns` conserva la forma irregular de la matriz (las filas cortas
  siguen siendo cortas).
- `readClipboardData` degrada a `""` si `getData` lanza o devuelve un no-string.
- Build sin minificar (el paquete es minúsculo y así es depurable).

## [0.1.0]
- Primera versión: parser de texto + eventos, ruta HTML opcional, utilidades de
  matriz, serializadores (CSV, TSV, Markdown, JSON), playground Vite y pruebas.
