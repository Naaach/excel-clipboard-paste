# excel-clipboard-paste

> Convierte lo que pegas desde **Excel** o **Google Sheets** en una matriz limpia de filas y columnas.
> Cero dependencias · TypeScript · ESM + CJS · funciona en el navegador y en Node.

Cuando copias un rango de una hoja de cálculo, el navegador recibe en el portapapeles
texto separado por **tabuladores** (`\t`) y **saltos de línea** (`\n`). Esta librería
lo convierte en `string[][]`, o sea, en algo que puedes recorrer, validar y guardar.

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

## Instalación

```bash
npm install excel-clipboard-paste
# o
pnpm add excel-clipboard-paste
# o
yarn add excel-clipboard-paste
```

Trae sus propios tipos. En Node solo necesitas un DOM (jsdom) si usas la ruta de HTML.

---

## Uso rápido

### 1. En un `paste` de un elemento (recomendado)

```ts
import { parseClipboard } from "excel-clipboard-paste";

document.querySelector("textarea")?.addEventListener("paste", (event) => {
  event.preventDefault();
  const rows = parseClipboard(event); // string[][]
});
```

### 2. Solo texto (ya tienes el portapapeles)

```ts
import { parseClipboardText } from "excel-clipboard-paste";

parseClipboardText("Ana\t25\nLuis\t31");
// [["Ana", "25"], ["Luis", "31"]]
```

### 3. Preferir la tabla HTML (colores/estructura de origen)

Algunas aplicaciones incluyen además una versión `text/html` con una `<table>` real.
Puedes preferirla y caer automáticamente al texto si no existe:

```ts
const rows = parseClipboard(event, { preferHtml: true });
```

---

## API

### Parser principal

| Función | Descripción |
|---|---|
| `parseClipboard(event, options?)` | Lee un `ClipboardEvent` y devuelve `string[][]`. Opción `preferHtml`. |
| `parseClipboardText(text, options?)` | Convierte texto ya obtenido en matriz. |
| `parseHtmlTable(html, options?)` | Extrae y expande una `<table>` de `text/html`. |
| `readClipboardData(event)` | Devuelve `{ text, html }` sin efectos secundarios. |
| `parsePasteEvent` | Alias de `parseClipboard` (compatibilidad). *Deprecado.* |

### Opciones del parser (`ParseOptions`)

| Opción | Por defecto | Qué hace |
|---|---|---|
| `trim` | `false` | Recorta espacios de cada celda. |
| `dropEmptyRows` | `false` | Elimina filas con todas las celdas vacías. |
| `dropEmptyColumns` | `false` | Elimina columnas vacías en todas las filas. |
| `rectangular` | `false` | Rellena las filas cortas con `""` hasta el ancho máximo. |
| `maxRows` | `Infinity` | Limita el número de filas. |
| `preferHtml` | `false` | (solo `parseClipboard`) usa la tabla HTML si existe. |

### Utilidades de matriz

```ts
import {
  matrixStats,      // { rows, columns, cells, emptyCells, nonEmptyCells, isEmpty, isRectangular }
  padMatrix,        // irregular -> rectangular
  transposeMatrix,  // gira filas/columnas
  removeEmptyRows,  // quita filas vacías
  removeEmptyColumns,
  getHeaderRow,     // primera fila
  dropHeaderRow,    // sin la primera fila
  isEmptyMatrix,
  cloneMatrix,
  mapCells,
  coerceMatrix,     // "25" -> 25, "true" -> true (opt-in)
  coerceCell,
} from "excel-clipboard-paste";
```

### Serializadores

```ts
import { toCSV, toTSV, toMarkdownTable, toJSON } from "excel-clipboard-paste";

toTSV([["A", "B"]]);          // "A\tB"        (ida y vuelta con el parser)
toCSV([["a,b", 'x"y']]);      // "\"a,b\",\"x\"\"y\""
toMarkdownTable([["A"], ["1"]]); // "| A |\n| --- |\n| 1 |"
toJSON([["A"]]);              // pretty JSON
```

---

## Cómo funciona

1. Normaliza finales de línea de Windows (`\r\n`) y Mac clásico (`\r`) a `\n`.
2. Quita **solo** los saltos de línea finales (pegar nunca debe añadir una fila fantasma),
   pero **conserva** los tabuladores finales, que representan celdas vacías finales.
3. Divide en filas por `\n` y en celdas por `\t`.
4. Aplica las opciones estructurales (`trim`, `dropEmpty*`, `rectangular`, `maxRows`).

La matriz resultante es **siempre `string[][]`**. La inferencia de números/booleanos
es opt-in con `coerceMatrix`, para no alterar nunca lo que Excel envió.

---

## Playground interactivo (Vite)

El repo incluye una web de demostración en `playground/`:

```bash
pnpm install
pnpm dev        # abre el playground en el navegador
```

Permite pegar de verdad (o cargar un `.tsv`/`.csv`/`.txt`, o arrastrarlo),
alternar las opciones del parser, ver el grid y copiar la salida como JSON, CSV,
TSV o Markdown.

```bash
pnpm build:demo # genera la web estática en dist-demo/
```

---

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo del playground (Vite). |
| `pnpm build` | Compila la librería a `dist/` (ESM + CJS + tipos) con tsup. |
| `pnpm build:demo` | Compila el playground estático. |
| `pnpm test` | Ejecuta las pruebas (Vitest + jsdom). |
| `pnpm typecheck` | Comprueba tipos con `tsc --noEmit`. |

---

## Límites conocidos (v0)

- **No** lee ni genera `.xlsx` / `.xls`. Solo portapapeles.
- **No** interpreta estilos (negrita, color, alineación) aunque la tabla HTML los tenga.
- **No** interpreta fechas, fórmulas ni formatos; eso lo decides tú con `coerceMatrix`.
- `text/html`: se expande `colspan` y `rowspan` (el valor va en la primera celda y las
  demás quedan vacías), pero no se interpretan atributos CSS.
- El parser de texto **no** entiende CSV con comillas ni saltos de línea dentro de una
  celda: eso es portapapeles de hoja de cálculo, no CSV. El playground sí trae un lector
  de CSV mínimo para arrastrar archivos, pero no forma parte del núcleo.

Si algo de esto aparece en uso real, se añade con pruebas específicas antes de complicar
el parser (ver `PLAN.md`).

---

## Roadmap

Mira [`PLAN.md`](./PLAN.md) para el plan completo, las decisiones de diseño y las
mejoras propuestas (adaptadores React/Vue, estilos HTML, etc.).

---

## Licencia

[MIT](./LICENSE)
