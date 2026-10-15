import type {
  CellValue,
  CoerceOptions,
  CsvOptions,
  Matrix,
  MatrixStats,
  ToObjectsOptions,
} from "./types.js";

/** Apply a function to every cell of a matrix, returning a new matrix. */
export function mapCells(matrix: Matrix, fn: (cell: string, row: number, column: number) => string): Matrix {
  return matrix.map((row, r) => row.map((cell, c) => fn(cell, r, c)));
}

/** Deep-copy a matrix so callers cannot mutate internal state. */
export function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => row.slice());
}

/** True when every cell of the matrix is an empty string (or there are no cells). */
export function isEmptyMatrix(matrix: Matrix): boolean {
  return matrix.every((row) => row.every((cell) => cell === ""));
}

/**
 * Remove rows whose cells are all empty.
 * A cell counts as empty only when it is exactly `""`; whitespace is kept
 * unless you enabled the `trim` option first.
 */
export function removeEmptyRows(matrix: Matrix): Matrix {
  return matrix.filter((row) => row.some((cell) => cell !== ""));
}

/**
 * Remove columns whose cells are all empty across every row.
 * Cells missing from shorter rows are treated as empty, and the ragged shape
 * of the matrix is preserved (short rows stay short).
 */
export function removeEmptyColumns(matrix: Matrix): Matrix {
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const keep: number[] = [];
  for (let column = 0; column < width; column += 1) {
    if (matrix.some((row) => (row[column] ?? "") !== "")) {
      keep.push(column);
    }
  }
  return matrix.map((row) => {
    const result: string[] = [];
    for (const column of keep) {
      if (column < row.length) {
        result.push(row[column] ?? "");
      }
    }
    return result;
  });
}

/** Pad every row with empty strings up to the widest row (ragged → rectangular). */
export function padMatrix(matrix: Matrix): Matrix {
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  return matrix.map((row) =>
    row.length === width ? row.slice() : [...row, ...new Array<string>(width - row.length).fill("")],
  );
}

/** Transpose rows and columns (ragged matrices are padded first). */
export function transposeMatrix(matrix: Matrix): Matrix {
  const padded = padMatrix(matrix);
  const width = padded[0]?.length ?? 0;
  const result: Matrix = [];
  for (let column = 0; column < width; column += 1) {
    result.push(padded.map((row) => row[column] ?? ""));
  }
  return result;
}

/**
 * Return the first row of the matrix, or an empty array.
 * Handy when the pasted range starts with headers.
 */
export function getHeaderRow(matrix: Matrix): string[] {
  return matrix.length > 0 ? (matrix[0] ?? []).slice() : [];
}

/** Drop the first row (e.g. the header) from the matrix. */
export function dropHeaderRow(matrix: Matrix): Matrix {
  return matrix.slice(1).map((row) => row.slice());
}

/** Compute a small summary of the matrix for UIs and diagnostics. */
export function matrixStats(matrix: Matrix): MatrixStats {
  const rows = matrix.length;
  const columns = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  let cells = 0;
  let emptyCells = 0;
  for (const row of matrix) {
    for (const cell of row) {
      cells += 1;
      if (cell === "") emptyCells += 1;
    }
  }
  return {
    rows,
    columns,
    cells,
    emptyCells,
    nonEmptyCells: cells - emptyCells,
    isEmpty: isEmptyMatrix(matrix),
    isRectangular: matrix.every((row) => row.length === columns),
  };
}

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
/** Strict thousands grouping: `1,234` or `1,234,567.89`. Never `1,2` or `,5`. */
const GROUPED_NUMBER_PATTERN = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;

/**
 * Convert a single cell string to a number, boolean or `null` when it matches.
 * Anything else is returned unchanged. Excel always sends text, so this is
 * opt-in and never applied automatically.
 *
 * Commas are only stripped when they form consistent thousands groups
 * (`1,234`), so European decimals such as `1,5` stay text instead of being
 * silently read as `15`.
 */
export function coerceCell(cell: string, options: CoerceOptions = {}): CellValue {
  const { numbers = true, booleans = true, nulls = false, trim = true } = options;
  const value = trim ? cell.trim() : cell;

  if (value === "" && nulls) return null;

  if (booleans) {
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }

  if (numbers) {
    const candidate = GROUPED_NUMBER_PATTERN.test(value) ? value.replace(/,/g, "") : value;
    if (candidate !== "" && NUMBER_PATTERN.test(candidate)) {
      const parsed = Number(candidate);
      // Normalize "-0" so consumers relying on Object.is/Map keys are safe.
      if (Number.isFinite(parsed)) return Object.is(parsed, -0) ? 0 : parsed;
    }
  }

  return cell;
}

/** Apply {@link coerceCell} to every cell of the matrix. */
export function coerceMatrix(matrix: Matrix, options: CoerceOptions = {}): CellValue[][] {
  return matrix.map((row) => row.map((cell) => coerceCell(cell, options)));
}

function quoteCsvField(value: string, delimiter: string, quoteIfNeeded: boolean): string {
  if (!quoteIfNeeded) return value;
  const mustQuote =
    value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r");
  if (!mustQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Serialize a matrix to CSV (RFC 4180-style quoting).
 * With `quoteIfNeeded: false` fields are emitted verbatim, without any quotes.
 */
export function toCSV(matrix: Matrix, options: CsvOptions = {}): string {
  const { delimiter = ",", eol = "\n", quoteIfNeeded = true } = options;
  return matrix
    .map((row) => row.map((cell) => quoteCsvField(cell, delimiter, quoteIfNeeded)).join(delimiter))
    .join(eol);
}

/**
 * Serialize a matrix back to tab-separated values.
 *
 * Round-trips with `parseClipboardText` only while no cell contains a tab or a
 * line break; such cells are ambiguous in TSV, so the output would be re-parsed
 * into more rows/columns than the input had.
 */
export function toTSV(matrix: Matrix): string {
  return matrix.map((row) => row.join("\t")).join("\n");
}

/** Serialize a matrix to a GitHub-flavored Markdown table. */
export function toMarkdownTable(matrix: Matrix): string {
  if (matrix.length === 0) return "";
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const cells = matrix.map((row) => {
    const padded = [...row, ...new Array<string>(width - row.length).fill("")];
    // Line breaks (any flavor) would split the Markdown row.
    return padded.map((cell) => cell.replace(/\|/g, "\\|").replace(/\r\n?|\n/g, " "));
  });
  const header = cells[0] ?? [];
  const separator = new Array<string>(width).fill("---");
  const body = cells.slice(1);
  return [header, separator, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

/** Serialize a matrix to JSON. Accepts coerced matrices too. */
export function toJSON(matrix: readonly CellValue[][], options: { pretty?: boolean } = {}): string {
  const { pretty = true } = options;
  return JSON.stringify(matrix, null, pretty ? 2 : 0);
}

/**
 * Convert a matrix into an array of plain objects, using the first row as
 * headers (or the headers you pass in `options.headers`).
 *
 * Empty headers become `column1`, `column2`, … and duplicated headers get a
 * numeric suffix (`Edad`, `Edad_2`). Rows shorter than the header are padded
 * with `""`.
 *
 * @example
 * toObjects([["Nombre", "Edad"], ["Ana", "25"]]);
 * // [{ Nombre: "Ana", Edad: "25" }]
 */
export function toObjects(
  matrix: Matrix,
  options: ToObjectsOptions = {},
): Array<Record<string, string>> {
  if (matrix.length === 0) return [];

  const headerRow = options.headers ?? matrix[0] ?? [];
  const names: string[] = [];
  const seen = new Map<string, number>();

  for (let index = 0; index < headerRow.length; index += 1) {
    const base = (headerRow[index] ?? "").trim() || `column${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    names.push(count === 0 ? base : `${base}_${count + 1}`);
  }

  const dataRows = options.headers ? matrix : matrix.slice(1);

  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    names.forEach((name, index) => {
      record[name] = row[index] ?? "";
    });
    return record;
  });
}
