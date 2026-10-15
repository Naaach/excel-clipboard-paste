import {
  mapCells,
  padMatrix,
  removeEmptyColumns,
  removeEmptyRows,
} from "./matrix.js";
import type { ClipboardData, Matrix, ParseClipboardOptions, ParseOptions } from "./types.js";

/**
 * Apply the structural {@link ParseOptions} to a freshly built matrix.
 * Kept internal so the text and HTML paths behave identically.
 */
function applyOptions(matrix: Matrix, options: ParseOptions): Matrix {
  const {
    trim = false,
    dropEmptyRows = false,
    dropEmptyColumns = false,
    rectangular = false,
    maxRows = Number.POSITIVE_INFINITY,
  } = options;

  let result = matrix;

  if (Number.isFinite(maxRows) && maxRows >= 0) {
    result = result.slice(0, Math.floor(maxRows));
  }
  if (trim) {
    result = mapCells(result, (cell) => cell.trim());
  }
  if (dropEmptyRows) {
    result = removeEmptyRows(result);
  }
  if (dropEmptyColumns) {
    result = removeEmptyColumns(result);
  }
  if (rectangular) {
    result = padMatrix(result);
  }

  return result;
}

/**
 * Convert tab-separated clipboard text into a matrix of strings.
 *
 * Rows are split on `\n` (after normalizing `\r\n` and `\r`), columns are split
 * on `\t`. Trailing newlines are ignored so a pasted range never gains a
 * spurious empty row, but trailing tabulators are preserved because they can
 * represent empty cells at the end of a row.
 *
 * @param text Value from `clipboardData.getData("text/plain")`.
 * @param options Optional structural transforms.
 * @returns Rows and cells, always as strings.
 *
 * @example
 * parseClipboardText("Ana\t25\nLuis\t31");
 * // [["Ana", "25"], ["Luis", "31"]]
 */
export function parseClipboardText(text: unknown, options: ParseOptions = {}): Matrix {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  // Normalize Windows (\r\n) and legacy Mac (\r) line endings.
  const normalized = text.replace(/\r\n?/g, "\n");
  // Strip only trailing newlines; keep trailing tabs (empty trailing cells).
  const trimmed = normalized.replace(/\n+$/, "");

  if (trimmed.length === 0) {
    return [];
  }

  const rows = trimmed.split("\n").map((row) => row.split("\t"));
  return applyOptions(rows, options);
}

/**
 * Build a matrix from an HTML table, as produced by Excel and Google Sheets in
 * the `text/html` clipboard flavor. `colspan`/`rowspan` are expanded so columns
 * stay aligned; merged cells place their value in the first slot and leave the
 * spanned slots empty.
 *
 * Returns `[]` when no `DOMParser` is available (e.g. plain Node without jsdom)
 * or when the HTML does not contain a table.
 */
export function parseHtmlTable(html: unknown, options: ParseOptions = {}): Matrix {
  if (typeof html !== "string" || html.trim() === "") {
    return [];
  }

  const Parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (typeof Parser !== "function") {
    return [];
  }

  const doc = new Parser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    return [];
  }

  const rows = Array.from(table.querySelectorAll("tr"));
  const grid: Matrix = [];
  // Cells spanning into following rows, indexed by column.
  const carries: Array<{ value: string; remaining: number } | null> = [];

  for (const tr of rows) {
    const row: string[] = [];
    let column = 0;

    const place = (value: string): void => {
      row[column] = value;
      column += 1;
    };

    const consumeCarries = (): void => {
      let carry = carries[column];
      while (carry) {
        place(carry.value);
        carry.remaining -= 1;
        if (carry.remaining <= 0) {
          carries[column - 1] = null;
        }
        carry = carries[column];
      }
    };

    for (const cell of Array.from(tr.querySelectorAll("th,td"))) {
      consumeCarries();
      const colspan = Math.max(1, Number(cell.getAttribute("colspan")) || 1);
      const rowspan = Math.max(1, Number(cell.getAttribute("rowspan")) || 1);
      const value = (cell.textContent ?? "").replace(/\u00a0/g, " ");

      for (let i = 0; i < colspan; i += 1) {
        const slotValue = i === 0 ? value : "";
        place(slotValue);
        if (rowspan > 1) {
          carries[column - 1] = { value: slotValue, remaining: rowspan - 1 };
        }
      }
    }

    consumeCarries();
    grid.push(row);
  }

  return applyOptions(grid, options);
}

/** Read both clipboard flavors from a paste event without side effects. */
export function readClipboardData(event: unknown): ClipboardData {
  const clipboardData = (event as ClipboardEvent | undefined)?.clipboardData;
  const text =
    typeof clipboardData?.getData === "function" ? clipboardData.getData("text/plain") : "";
  const html =
    typeof clipboardData?.getData === "function" ? clipboardData.getData("text/html") : "";
  return { text: text ?? "", html: html ?? "" };
}

/**
 * Parse a browser `paste` event.
 *
 * By default it reads `text/plain` (always present when copying from a
 * spreadsheet). Set `preferHtml: true` to use the `text/html` table when the
 * source application provides one, falling back to text otherwise.
 *
 * @param event The `ClipboardEvent` from a paste handler.
 * @param options Structural options plus `preferHtml`.
 *
 * @example
 * element.addEventListener("paste", (event) => {
 *   event.preventDefault();
 *   const matrix = parseClipboard(event, { trim: true });
 * });
 */
export function parseClipboard(event: unknown, options: ParseClipboardOptions = {}): Matrix {
  const { preferHtml = false, ...parseOptions } = options;
  const { text, html } = readClipboardData(event);

  if (preferHtml && html) {
    const fromHtml = parseHtmlTable(html, parseOptions);
    if (fromHtml.length > 0) {
      return fromHtml;
    }
  }

  return parseClipboardText(text, parseOptions);
}

/**
 * Backwards-compatible alias of {@link parseClipboard}.
 * @deprecated Prefer `parseClipboard`, which also supports `preferHtml`.
 */
export const parsePasteEvent = parseClipboard;
