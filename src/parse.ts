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
 *
 * Order matters and is part of the contract: trimming and dropping happen
 * first, `rectangular` pads afterwards, and `maxRows` is applied last so it
 * counts *result* rows, not raw parsed rows.
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

  // Invalid values (NaN, non-numbers) simply disable the cap.
  if (Number.isFinite(maxRows)) {
    const limit = Math.max(0, Math.floor(maxRows));
    result = result.slice(0, limit);
  }

  return result;
}

/** Byte-order mark that some applications prepend to copied text. */
const BOM = "\uFEFF";

/**
 * Convert tab-separated clipboard text into a matrix of strings.
 *
 * Rows are split on `\n` (after normalizing `\r\n` and `\r`), columns are split
 * on `\t`. A leading BOM is ignored. Trailing newlines are dropped so a pasted
 * range never gains a spurious empty row, but trailing tabulators are preserved
 * because they can represent empty cells at the end of a row.
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

  const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;

  // Normalize Windows (\r\n) and legacy Mac (\r) line endings.
  const normalized = withoutBom.replace(/\r\n?/g, "\n");
  // Strip only trailing newlines; keep trailing tabs (empty trailing cells).
  const trimmed = normalized.replace(/\n+$/, "");

  if (trimmed.length === 0) {
    return [];
  }

  const rows = trimmed.split("\n").map((row) => row.split("\t"));
  return applyOptions(rows, options);
}

/* ------------------------------- HTML path ------------------------------ */

/** Browsers clamp colspan at 1000 and rowspan at 65534 (HTML standard). */
const MAX_COLSPAN = 1000;
const MAX_ROWSPAN = 65534;

/**
 * Parse a span attribute the way browsers do: truncate to an integer and clamp
 * to the HTML limits. Prevents a crafted `colspan="1e999"` from hanging the
 * paste handler in an unbounded loop.
 */
function clampSpan(raw: string | null, max: number): number {
  const parsed = Math.trunc(Number(raw ?? ""));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, max);
}

/** Read a cell's text, turning `<br>` into a newline (as spreadsheets do). */
function readCellText(cell: HTMLTableCellElement): string {
  for (const br of Array.from(cell.querySelectorAll("br"))) {
    br.replaceWith("\n");
  }
  return (cell.textContent ?? "").replace(/\u00a0/g, " ");
}

/**
 * Build the raw grid of the first `<table>` found in `html`, or `null` when
 * there is no table (or no DOM parser is available).
 *
 * Uses `table.rows` / `tr.cells` on purpose: they only see the table's own
 * rows and cells, so nested tables cannot leak rows or cells into the result.
 * `colspan` and `rowspan` are expanded; a spanned cell keeps its value in the
 * first slot and leaves the rest empty.
 */
function extractTableGrid(html: string): Matrix | null {
  const Parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (typeof Parser !== "function") {
    return null;
  }

  const doc = new Parser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    return null;
  }

  const grid: Matrix = [];
  // Cells spanning into following rows, indexed by column.
  const carries: Array<{ value: string; remaining: number } | null> = [];

  for (const tr of Array.from(table.rows)) {
    const row: string[] = [];

    // 1) Every active rowspan slot occupies this row, even when the row is
    //    shorter than the row where the span started.
    for (let column = 0; column < carries.length; column += 1) {
      const carry = carries[column];
      if (!carry) continue;
      row[column] = carry.value;
      carry.remaining -= 1;
      if (carry.remaining <= 0) {
        carries[column] = null;
      }
    }

    // 2) Place this row's cells into the first free slots.
    let column = 0;
    for (const cell of Array.from(tr.cells)) {
      while (row[column] !== undefined) {
        column += 1;
      }
      const colspan = clampSpan(cell.getAttribute("colspan"), MAX_COLSPAN);
      const rowspan = clampSpan(cell.getAttribute("rowspan"), MAX_ROWSPAN);
      const value = readCellText(cell);

      for (let i = 0; i < colspan; i += 1) {
        const slot = column + i;
        const slotValue = i === 0 ? value : "";
        // Never overwrite a slot claimed by a rowspan from a previous row.
        if (row[slot] === undefined) {
          row[slot] = slotValue;
          if (rowspan > 1) {
            carries[slot] = { value: slotValue, remaining: rowspan - 1 };
          }
        }
      }
      column += colspan;
    }

    // 3) Densify: slots nobody claimed are empty cells.
    for (let i = 0; i < row.length; i += 1) {
      if (row[i] === undefined) {
        row[i] = "";
      }
    }

    grid.push(row);
  }

  return grid;
}

/**
 * Cheap check for whether a clipboard HTML payload contains a table, without
 * paying the cost of parsing it. Useful to decide whether to show a
 * "source: text/html" badge before parsing.
 */
export function hasHtmlTable(html: unknown): boolean {
  return typeof html === "string" && /<table[\s>]/i.test(html);
}

/**
 * Build a matrix from an HTML table, as produced by Excel and Google Sheets in
 * the `text/html` clipboard flavor. Returns `[]` when the HTML has no table,
 * when no `DOMParser` is available (e.g. plain Node without jsdom), or when the
 * structural options remove every row.
 */
export function parseHtmlTable(html: unknown, options: ParseOptions = {}): Matrix {
  if (typeof html !== "string" || html.trim() === "") {
    return [];
  }
  const grid = extractTableGrid(html);
  return grid ? applyOptions(grid, options) : [];
}

/** Read both clipboard flavors from a paste event without side effects. */
export function readClipboardData(event: unknown): ClipboardData {
  const clipboardData = (event as ClipboardEvent | null | undefined)?.clipboardData;
  const read = (type: string): string => {
    try {
      const value = clipboardData?.getData(type);
      // Some polyfills return non-strings; never leak them to callers.
      return typeof value === "string" ? value : "";
    } catch {
      return "";
    }
  };
  return { text: read("text/plain"), html: read("text/html") };
}

/**
 * Parse a browser `paste` event.
 *
 * By default it reads `text/plain` (always present when copying from a
 * spreadsheet). Set `preferHtml: true` to use the `text/html` table when the
 * source application provides one, falling back to text only when there is no
 * table at all.
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
    const grid = extractTableGrid(html);
    if (grid) {
      return applyOptions(grid, parseOptions);
    }
  }

  return parseClipboardText(text, parseOptions);
}

/**
 * Backwards-compatible alias of {@link parseClipboard}.
 * @deprecated Prefer `parseClipboard`, which also supports `preferHtml`.
 */
export const parsePasteEvent = parseClipboard;
