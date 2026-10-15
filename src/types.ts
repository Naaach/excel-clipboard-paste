/**
 * A parsed matrix: an array of rows, and each row an array of cell strings.
 * The parser always produces strings — use {@link coerceMatrix} if you want
 * numbers/booleans inferred.
 */
export type Matrix = string[][];

/**
 * Structural options applied after rows/columns are split.
 * They never change the value type: the result is always `string[][]`.
 */
export interface ParseOptions {
  /** Trim whitespace around every cell. Default: `false`. */
  trim?: boolean;
  /** Remove rows whose cells are all empty. Default: `false`. */
  dropEmptyRows?: boolean;
  /** Remove columns whose cells are all empty across rows. Default: `false`. */
  dropEmptyColumns?: boolean;
  /** Pad every row with empty strings up to the widest row. Default: `false`. */
  rectangular?: boolean;
  /** Keep at most this many rows. Default: `Infinity`. */
  maxRows?: number;
}

/** Raw payload read from a `ClipboardEvent`. */
export interface ClipboardData {
  /** Value of `text/plain` (what Excel/Sheets put first). */
  text: string;
  /** Value of `text/html` (a real `<table>` when the source app provides one). */
  html: string;
}

/** Options for {@link parseClipboard}. */
export interface ParseClipboardOptions extends ParseOptions {
  /**
   * When `true`, prefer the `text/html` table over `text/plain` if the
   * clipboard contains one. Falls back to text when no table is found.
   * Default: `false`.
   */
  preferHtml?: boolean;
}

/** Summary returned by {@link matrixStats}. */
export interface MatrixStats {
  rows: number;
  columns: number;
  cells: number;
  emptyCells: number;
  nonEmptyCells: number;
  isEmpty: boolean;
  isRectangular: boolean;
}

/** Possible value produced by {@link coerceCell}. */
export type CellValue = string | number | boolean | null;

/** Options for {@link coerceMatrix}. */
export interface CoerceOptions {
  /** Convert numeric-looking strings to `number`. Default: `true`. */
  numbers?: boolean;
  /** Convert `true`/`false` (case-insensitive) to `boolean`. Default: `true`. */
  booleans?: boolean;
  /** Convert empty strings to `null`. Default: `false`. */
  nulls?: boolean;
  /** Trim the cell before testing. Default: `true`. */
  trim?: boolean;
}

/** Options for {@link toCSV}. */
export interface CsvOptions {
  /** Field delimiter. Default: `","`. */
  delimiter?: string;
  /** Record separator. Default: `"\n"`. */
  eol?: string;
  /**
   * Quote a field only when it contains the delimiter, a quote or a newline.
   * Set to `false` to disable quoting entirely. Default: `true`.
   */
  quoteIfNeeded?: boolean;
}
