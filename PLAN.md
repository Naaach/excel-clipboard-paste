# 📐 Plan — `excel-clipboard-paste`

> Objetivo: recibir un pegado desde **Excel** o **Google Sheets** y convertirlo en una
> **matriz de valores** (`string[][]`). Es una **dependencia de npm** con una **web de
> ejemplo interactiva (Vite)** en el mismo repo.
>
> Modelo: **núcleo pequeño e independiente de frameworks** + playground que lo consume.
> Este archivo es la fuente de verdad editable: marca, desmarca y añade cosas.

**Nombre:** `excel-clipboard-paste` (el plan original lo llamaba `excel-paste`).
**Estado:** `0.1.0` sin publicar. Repo en `github.com/Naaach/excel-clipboard-paste`.
**Cambios:** ver [`CHANGELOG.md`](./CHANGELOG.md).

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
- [x] `src/parse.ts` → `parseClipboardText`, `parseClipboard`, `parseHtmlTable`, `hasHtmlTable`, `readClipboardData`, `parsePasteEvent`.
- [x] `src/matrix.ts` → utilidades (`matrixStats`, `padMatrix`, `transposeMatrix`, `coerceMatrix`, `toObjects`, serializadores…).
- [x] `src/types.ts` → tipos públicos (`Matrix`, `ParseOptions`, `MatrixStats`…).
- [x] `src/index.ts` → API pública única.
- [x] Sin dependencias de runtime. TypeScript estricto (`noUncheckedIndexedAccess` incluido).
- [x] Build dual **ESM + CJS + `.d.ts`** con tsup, **sin minificar**: ≈ 9.3 KB raw / ≈ 2.8 KB gzip (ESM).
- [x] Normaliza `\r\n` y `\r`; conserva tabuladores finales; ignora saltos finales y el **BOM** inicial.

### Extras sobre el plan original
- [x] **Opciones estructurales**: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows` (se aplica al final, sobre el resultado).
- [x] **Ruta `text/html`**: `parseHtmlTable` expande `colspan`/`rowspan` con los límites del estándar HTML (1000 / 65534), ignora tablas anidadas y convierte `<br>` en `\n`.
- [x] **`preferHtml`** con *fallback* a texto solo cuando **no hay tabla** (no cuando las opciones vacían la matriz).
- [x] **`hasHtmlTable`** para comprobar sin parsear.
- [x] **Utilidades de matriz** y **serializadores** (`toCSV` con quoting RFC 4180, `toTSV`, `toMarkdownTable`, `toJSON`).
- [x] **`toObjects`**: matriz → array de objetos con cabeceras (rellena vacías, sufija duplicados).
- [x] **`coerceMatrix` opt-in** con grupos de miles estrictos (`1,234` sí, `1,5` no) y `-0` normalizado.

### Playground (Vite)
- [x] Tema claro/oscuro/auto persistido; `<h1>`; foco visible en todos los controles.
- [x] Pegar de verdad (captura `text/html` del evento), botones de ejemplo, arrastrar/soltar **solo archivos**, abrir `.tsv`/`.csv`/`.txt`.
- [x] **Detección de delimitador** (`,` `;` `\t` `|`) al importar CSV; respeta comillas y saltos dentro de campos.
- [x] Grid tipo hoja de cálculo (letras de columna / números de fila), cap de 500 filas con aviso.
- [x] Salidas: Grid, JSON, CSV, TSV, Markdown + copiar; `coerce` afecta a grid **y** JSON (CSV/TSV/Markdown mantienen el texto original).
- [x] Pestañas accesibles (`role=tablist`, `aria-selected`, roving tabindex con flechas/Home/End).
- [x] Render coalescido con `requestAnimationFrame`; el cap se aplica antes de coercer.

### Calidad
- [x] **72 tests** (Vitest + jsdom): parser, HTML (colspan/rowspan/anidadas/`<br>`/clamps), utilidades, coerción, serializadores, CSV del playground.
- [x] GitHub Actions: `typecheck` + `test` + `build` + `build:demo` + `size` en Node 20/22/24.
- [x] `pnpm size` con presupuesto de 6 KB gzip.
- [x] `CHANGELOG.md`, `.gitattributes` (LF), `.editorconfig`, metadata npm completa (`repository`, `bugs`, `homepage`, `packageManager`).
- [x] Revisión adversarial con agentes (núcleo, tests, playground, packaging) — hallazgos corregidos (ver §9).

---

## 3. Decisiones de diseño

- [x] **El parser nunca infiere tipos.** Devuelve `string[][]`. La coerción es opt-in.
- [x] **Sin dependencias de runtime.** Un DOM opcional (jsdom/DOMParser) solo para `text/html`.
- [x] **Núcleo sin frameworks.** React/Vue, si llegan, serán adaptadores finos.
- [x] **`parseClipboardText` no toca el portapapeles.** Solo transforma texto.
- [x] **CSV fuera del núcleo.** Es portapapeles de hoja, no CSV. El playground trae un lector CSV mínimo.
- [x] **Orden de opciones documentado**: `trim` → `dropEmpty*` → `rectangular` → `maxRows`.
- [x] **`maxRows` inválido (NaN) desactiva el límite** en vez de lanzar.
- [x] **`removeEmptyColumns` conserva filas cortas** (no rellena al ancho de la cabecera).
- [x] **Build sin minificar** (9 KB no necesita minificado y así es depurable).
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
│   └── csv.ts          # import de CSV + detección de delimitador (solo playground)
├── test/               # 72 tests
│   ├── parseClipboardText.test.ts
│   ├── parseClipboard.test.ts
│   ├── html.test.ts
│   ├── matrix.test.ts
│   └── csv.test.ts
├── scripts/size.mjs    # presupuesto de tamaño
├── .github/workflows/ci.yml
├── CHANGELOG.md
├── README.md
├── PLAN.md             # ← este archivo
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml # solo settings de pnpm (allowBuilds de esbuild)
├── tsup.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── .gitattributes / .gitignore / .editorconfig / LICENSE
```

---

## 5. API implementada

```ts
// Parser
parseClipboard(event, options?)      // ClipboardEvent -> string[][]
parseClipboardText(text, options?)   // string -> string[][]
parseHtmlTable(html, options?)       // "<table>" -> string[][]
hasHtmlTable(html)                   // boolean, sin parsear
readClipboardData(event)             // -> { text, html }
parsePasteEvent                      // alias deprecado de parseClipboard

// Utilidades
matrixStats, padMatrix, transposeMatrix,
removeEmptyRows, removeEmptyColumns,
getHeaderRow, dropHeaderRow, isEmptyMatrix, cloneMatrix, mapCells,
coerceMatrix, coerceCell, toObjects

// Serializadores
toCSV, toTSV, toMarkdownTable, toJSON
```

Opciones: `trim`, `dropEmptyRows`, `dropEmptyColumns`, `rectangular`, `maxRows`, `preferHtml`.

---

## 6. Mejoras propuestas (roadmap) 🚧

### v0.2 — pulir y endurecer
- [ ] Cobertura de código (`@vitest/coverage-v8`) y umbral mínimo en CI.
- [ ] Copias reales de Excel y Google Sheets guardadas como fixtures de texto.
- [ ] Pruebas manuales de pegado en Chrome, Firefox y Safari (Windows/macOS).
- [ ] `presets.ts` con combinaciones típicas (`forSheets`, `forExcel`).
- [ ] Recetas en el README (tabla editable, validación, import a DB).
- [ ] ESLint/Prettier + Dependabot.
- [ ] Decidir si `\r` suelto dentro de celda debe tratarse como salto de fila (hoy sí).

### v0.3 — más formatos del portapapeles
- [ ] Estilos básicos de la tabla HTML (`font-weight`, `font-style`, `text-align`, color):
      API tentativa `parseHtmlTable(html, { styles: true }) -> { matrix, styles }`.
- [ ] Detección de números/fechas **opcional y explícita** (`{ types: true }`), con locale.
- [ ] Celdas multilínea con comillas en el **núcleo** (solo si aparece en uso real).
- [ ] `readClipboard()` async con la Clipboard API (permiso del usuario).
- [ ] Export a `.xlsx` ligero (¿o dejarlo fuera? ver riesgos).

### v0.3 — adaptadores (opcional, solo si hay demanda)
- [ ] `excel-clipboard-paste-react`: `<PasteArea>` + `usePaste`.
- [ ] `excel-clipboard-paste-vue`: `<PasteArea>` + `usePaste` + plugin.
- [ ] Paridad 100% de opciones entre adaptadores.

### v1.0 — consolidar
- [ ] API congelada + semver estricto.
- [ ] Playground desplegado (GitHub Pages / Cloudflare Pages / Vercel) + GIF en el README.
- [ ] Changesets para versionado (si crece a monorepo).

### Ideas sueltas / parking (evaluar, no prometer)
- [ ] Modo "pegar en un grid editable" (probablemente otro paquete).
- [ ] Integración con `handsontable`/`ag-grid` como ejemplo, no como dependencia.
- [ ] CLI `npx excel-clipboard-paste` para convertir `.tsv` de stdin a `.json`.
- [ ] Web Worker para rangos enormes.
- [ ] Detección heurística de cabeceras (`{ detectHeader: true }`).
- [ ] `fromObjects(registros)` como inversa de `toObjects`.

---

## 7. Publicación en npm

El pipeline ya está montado en [`.github/workflows/release.yml`](./.github/workflows/release.yml):
se dispara con un tag `vX.Y.Z` (o a mano con `workflow_dispatch`), corre
`typecheck + test + build + size`, publica en npm **con provenance** (`id-token: write`)
y crea la release en GitHub. Es idempotente: si la versión ya está en npm, lo salta.

Nombre `excel-clipboard-paste`: **libre** (comprobado con `npm view` el 2026-10-15).

Lo único que falta para publicar por primera vez:

- [ ] Crear un *access token* de tipo **Automation** en npmjs.com y añadirlo como secreto **`NPM_TOKEN`**
      (*Settings → Secrets and variables → Actions*).
- [ ] Subir el primer tag:

```bash
pnpm version patch      # bump + commit + tag v0.1.0
git push --follow-tags  # dispara el workflow Release
```

Checklist de calidad (ya cubierto por el workflow):
- [x] `pnpm typecheck && pnpm test && pnpm build && pnpm size` en verde.
- [x] `pnpm pack --dry-run` revisado (solo `dist/`, README y LICENSE).
- [x] Tag y versión verificados automáticamente antes de publicar.
- [ ] Probar el `.tgz` instalándolo en un proyecto limpio (tras la primera publicación).

---

## 8. Repo en GitHub

- [x] Repo creado: `github.com/Naaach/excel-clipboard-paste` (público, `main` trackeando `origin/main`).
- [x] CI con Actions (Node 20/22/24).
- [ ] Desplegar el playground (Pages) y enlazarlo en el README.
- [ ] Temas/descripción y imagen social del repo.

---

## 9. Revisión adversarial (agentes) — hallazgos corregidos

Se pasaron cuatro revisores independientes (núcleo, tests, playground, packaging).
Lo importante que se arregló:

**Núcleo**
- 🔴 `parseHtmlTable`: un `rowspan` seguido de una fila más corta **perdía o desplazaba**
  valores (el carry se saltaba si había un hueco delante). Reescrito el algoritmo de grid:
  los slots activos ocupan su fila siempre y las celdas se colocan en el primer hueco libre.
- 🔴 `colspan="1e999"` → bucle infinito / OOM al pegar. Ahora los spans se truncan y se
  recortan a los límites del estándar HTML (1000 / 65534).
- 🔴 `coerceCell("1,5")` → `15` (decimales europeos corrompidos). Ahora solo se quitan
  comas con grupos de miles estrictos; `-0` → `0`.
- 🟠 Tablas anidadas filtraban filas/celdas (ahora `table.rows` / `tr.cells`).
- 🟠 `<br>` dentro de celda se perdía (ahora `\n`, igual que `text/plain`).
- 🟠 `maxRows` se aplicaba antes de `dropEmptyRows` y descartaba filas válidas.
- 🟠 `readClipboardData` propagaba excepciones de `getData`.
- 🟡 `removeEmptyColumns` rellenaba filas cortas; `toMarkdownTable` dejaba pasar `\r`;
  `toTSV` prometía ida y vuelta que no siempre existe (documentado).

**Playground**
- 🟠 `coerce` solo afectaba al grid (JSON/CSV seguían con texto). Ahora afecta a grid y JSON,
  y la etiqueta lo dice.
- 🟠 Tabs sin `aria-selected` ni navegación por teclado → tablist completa con roving tabindex.
- 🟠 El botón "Abrir archivo" no era accesible por teclado (input oculto) → botón real.
- 🟠 El drop zone interceptaba arrastres de texto normal → solo actúa con archivos.
- 🟠 `pendingHtml` obsoleto se filtraba a ediciones posteriores.
- 🟡 BOM sin quitar, CSV con `;` en una sola columna (detección de delimitador),
  cap aplicado antes de coercer, render por frame, contraste de `--null`, `fileMeta` obsoleto.

**Packaging / CI**
- 🔴 El job de Node 18 iba a fallar (vite 7 requiere ≥ 20.19) → matriz `20/22/24`.
- 🟠 Desfase pnpm 10 vs 12 → `packageManager` fijo y `action-setup` sin versión.
- 🟠 Faltaban `repository`/`bugs`/`homepage`/`author` y el `default` en `exports`.
- 🟡 `prepublishOnly` sin `typecheck`, `minify: true` innecesario, sin `CHANGELOG.md`,
  sin `.gitattributes`, `.gitignore` incompleto (`*.tgz`, `.vscode/`…).

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| "Es un `split('\t')`, ¿para qué una librería?" | Enfatizar los bordes (CRLF, celdas vacías, filas fantasma, HTML) y traer tests + playground. |
| Scope creep hacia editor de tablas / xlsx | Mantener el núcleo minúsculo; todo lo gordo va a "parking" o a otro paquete. |
| Nombre npm ocupado | Comprobar antes; alternativas: `clipboard-to-matrix`, `spreadsheet-paste`, `paste-table`. |
| Diferencias entre navegadores en `text/html` | Fallback siempre a `text/plain`; nunca depender del HTML. |
| Mantenimiento | Librería deliberadamente aburrida y estable; cambios solo con tests. |

---

## 11. Historial

El changelog vive en [`CHANGELOG.md`](./CHANGELOG.md) (npm no incluye `PLAN.md`).

---

*Última actualización: 2026-10-15*
