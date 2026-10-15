# 📐 Plan — `excel-clipboard-paste`

> Objetivo: recibir un pegado desde **Excel** o **Google Sheets** y convertirlo en una
> **matriz de valores** (`string[][]`). Es una **dependencia de npm** con una **web de
> ejemplo interactiva (Vite)** en el mismo repo.
>
> Modelo: **núcleo pequeño e independiente de frameworks** + playground que lo consume.
> Este archivo es la fuente de verdad editable: marca, desmarca y añade cosas.

**Nombre:** `excel-clipboard-paste` (el plan original lo llamaba `excel-paste`).
**Estado:** `0.1.0` — v0 completada **y** con extras de v0.1. Sin publicar en npm todavía.

---

## 1. Qué es y por qué

Copiar un rango en Excel/Sheets pone en el portapapeles texto con **tabuladores** entre
celdas y **saltos de línea** entre filas (flavor `text/plain`). Ese es el 90% de los casos
reales y casi nadie lo trata bien de forma aislada. La idea es tener una pieza pequeña,
sin dependencias y bien probada, que se pueda usar en cualquier web o framework.

La gracia no es "parsear bien" (es simple), sino **parsear bien los bordes**:
saltos `\r\n`, tabuladores finales, filas fantasma, celdas vacías, y no romper nunca el
tipo de dato que Excel envió.

---

## 2. Estado actual (lo que YA está hecho) ✅

### Núcleo
- [x] `src/parse.ts` → `parseClipboardText`, `parseClipboard`, `parseHtmlTable`, `readClipboardData`, `parsePasteEvent`.
- [x] `src/matrix.ts` → utilidades (`matrixStats`, `padMatrix`, `transposeMatrix`, `coerceMatrix`, serializadores…).
- [x] `src/types.ts` → tipos públicos (`Matrix`, `ParseOptions`, `MatrixStats`…).
- [x] `src/index.ts` → API pública única.
- [x] Sin dependencias de runtime. TypeScript estricto (`noUncheckedIndexedAccess` incluido).
- [x] Build dual **ESM + CJS + `.d.ts`** con tsup. ESM ≈ 3.9 KB, CJS ≈ 4.0 KB (sin minificar gzip).
- [x] Normaliza `\r\n` y `\r`; conserva tabuladores finales; ignora saltos finales.

### Extras que añadí por encima del plan original (v0.1)
- [x] **Opciones estructurales**: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows`.
- [x] **Ruta `text/html`**: `parseHtmlTable` expande `colspan`/`rowspan` (columnas alineadas).
- [x] **`preferHtml`** en `parseClipboard` con *fallback* automático a `text/plain`.
- [x] **Utilidades de matriz** para no reimplementarlas en cada app.
- [x] **Serializadores**: `toCSV` (quoting RFC 4180), `toTSV`, `toMarkdownTable`, `toJSON`.
- [x] **`coerceMatrix` opt-in**: `"25" → 25`, `"true" → true`. El parser nunca miente sobre tipos.

### Playground (Vite)
- [x] `playground/` con estilos propios (tema claro/oscuro/auto).
- [x] Pegar de verdad en un textarea (captura `text/html` del evento).
- [x] Opciones en vivo, grid tipo hoja de cálculo (números de fila / letras de columna).
- [x] Salidas: Grid, JSON, CSV, TSV, Markdown + botón copiar.
- [x] Ejemplos, arrastrar/soltar y abrir `.tsv`, `.csv`, `.txt`.

### Pruebas
- [x] 28 tests (Vitest + jsdom) cubriendo todos los casos del plan original + HTML + utilidades.

---

## 3. Decisiones de diseño

- [x] **El parser nunca infiere tipos.** Devuelve `string[][]`. La coerción es opt-in.
- [x] **Sin dependencias de runtime.** Un DOM opcional (jsdom/DOMParser) solo para `text/html`.
- [x] **Núcleo sin frameworks.** React/Vue, si llegan, serán adaptadores finos.
- [x] **`parseClipboardText` no toca el portapapeles.** Solo transforma texto.
- [x] **CSV fuera del núcleo.** Es portapapeles de hoja, no CSV. El playground trae un lector CSV mínimo.
- [x] **Compatibilidad de nombre**: `parsePasteEvent` se mantiene como alias deprecado.

---

## 4. Estructura del repo

```text
excel-clipboard-paste/
├── src/
│   ├── parse.ts        # parser de texto y de eventos (+ HTML)
│   ├── matrix.ts       # utilidades y serializadores
│   ├── types.ts        # tipos públicos
│   └── index.ts        # API pública
├── playground/         # web interactiva (Vite)
│   ├── index.html
│   ├── main.ts
│   ├── playground.css
│   ├── samples.ts
│   └── csv.ts          # helper de import de CSV (solo playground)
├── test/
│   ├── parseClipboardText.test.ts
│   ├── parseClipboard.test.ts
│   └── matrix.test.ts
├── README.md
├── PLAN.md             # ← este archivo
├── package.json
├── tsup.config.ts
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## 5. API implementada

```ts
// Parser
parseClipboard(event, options?)      // ClipboardEvent -> string[][]
parseClipboardText(text, options?)   // string -> string[][]
parseHtmlTable(html, options?)       // "<table>" -> string[][]
readClipboardData(event)             // -> { text, html }
parsePasteEvent                      // alias deprecado de parseClipboard

// Utilidades
matrixStats, padMatrix, transposeMatrix,
removeEmptyRows, removeEmptyColumns,
getHeaderRow, dropHeaderRow, isEmptyMatrix, cloneMatrix, mapCells,
coerceMatrix, coerceCell

// Serializadores
toCSV, toTSV, toMarkdownTable, toJSON
```

Opciones: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows`, `preferHtml`.

---

## 6. Mejoras propuestas (roadmap) 🚧

### v0.2 — pulir y endurecer
- [ ] Tests reales de pegado hechos a mano en Chrome, Firefox y Safari (Windows/macOS).
- [ ] Añadir a las pruebas copias reales de Excel y Google Sheets (fixtures de texto).
- [ ] Cobertura de código (`@vitest/coverage-v8`) y umbral mínimo en CI.
- [ ] GitHub Actions: `typecheck` + `test` + `build` en cada push/PR.
- [ ] `size` script que falle si el bundle ESM supera un umbral (p. ej. 6 KB).
- [ ] Exportar un `presets.ts` con combinaciones típicas (`forSheets`, `forExcel`).
- [ ] Documentar "recetas" en el README (tabla editable, validación, import a DB).
- [ ] Decidir si `\r` suelto dentro de celda debe tratarse como salto de fila (hoy sí).

### v0.3 — más formatos del portapapeles
- [ ] Leer estilos básicos de la tabla HTML: `font-weight`, `font-style`, `text-align`, color de fondo.
      API tentativa: `parseHtmlTable(html, { styles: true }) -> { matrix, styles }`.
- [ ] Detección de números/fechas **opcional y explícita** (`{ types: true }`), con locale.
- [ ] Soporte de celdas multilínea con comillas (solo si aparece en uso real y con tests).
- [ ] `readClipboard()` async con la Clipboard API (permiso del usuario) como alternativa.
- [ ] Export a `.xlsx` ligero (¿o dejarlo fuera? ver riesgos).

### v0.3 — adaptadores (opcional, solo si hay demanda)
- [ ] `excel-clipboard-paste-react`: `<PasteArea>` + `usePaste`.
- [ ] `excel-clipboard-paste-vue`: `<PasteArea>` + `usePaste` + plugin.
- [ ] Mantener 100% de paridad de opciones entre adaptadores.

### v1.0 — consolidar
- [ ] API congelada + semver estricto.
- [ ] Web del playground desplegada (GitHub Pages / Cloudflare Pages / Vercel).
- [ ] GIF en el README + sección "drop-in" para quien venía de copiar/pegar a mano.
- [ ] `CHANGELOG.md` gestionado con Changesets (si pasamos a monorepo).

### Ideas sueltas / parking (evaluar, no prometer)
- [ ] Modo "pegar en un grid editable" (¿es alcance? probablemente otro paquete).
- [ ] Integración con `handsontable`/`ag-grid` como ejemplo, no como dependencia.
- [ ] CLI para convertir un `.tsv` de stdin a `.json` (`npx excel-clipboard-paste`).
- [ ] Soporte Web Worker para rangos enormes.
- [ ] Detección de encabezados heurística (`{ detectHeader: true }`).

---

## 7. Publicación en npm (cuando toque)

El nombre `excel-clipboard-paste` hay que **verificarlo** en npm antes de publicar.

```bash
# comprobar disponibilidad
npm view excel-clipboard-paste

# login (una vez)
npm login

# publicar (el prepublishOnly corre build + test)
npm publish --access public
```

Checklist antes de publicar:
- [ ] Verificar que el nombre está libre.
- [ ] `pnpm typecheck && pnpm test && pnpm build` en verde.
- [ ] `package.json` → versión, `repository`, `homepage`, `bugs`, `author`.
- [ ] Revisar `files` para no publicar `dist-demo/` ni el playground.
- [ ] Probar `npm pack` e instalar el `.tgz` en un proyecto limpio.
- [ ] README sin enlaces roscos.

---

## 8. Publicar el repo en GitHub (cuando toque)

```bash
git init
git add .
git commit -m "feat: excel-clipboard-paste v0.1.0"
# crea el repo vacío en GitHub (sin README ni licencia) y luego:
git remote add origin https://github.com/<usuario>/excel-clipboard-paste.git
git branch -M main
git push -u origin main
```

- [ ] Crear repo remoto.
- [ ] Activar Actions (CI).
- [ ] Desplegar el playground (Pages) y enlazarlo en el README.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| "Es un `split('\t')`, ¿para qué una librería?" | Enfatizar los bordes (CRLF, celdas vacías, filas fantasma, HTML) y traer tests + playground. |
| Scope creep hacia editor de tablas / xlsx | Mantener el núcleo minúsculo; todo lo gordo va a "parking" o a otro paquete. |
| Nombre npm ocupado | Comprobar antes; alternativas: `clipboard-to-matrix`, `spreadsheet-paste`, `paste-table`. |
| Diferencias entre navegadores en `text/html` | Fallback siempre a `text/plain`; nunca depender del HTML. |
| Mantenimiento | Librería deliberadamente aburrida y estable; cambios solo con tests. |

---

## 10. Changelog

### 0.1.0
- Primera versión: parser de texto + eventos, ruta HTML opcional, utilidades, serializadores, playground Vite y 28 tests.

---

*Última actualización: 2026-10-15*
