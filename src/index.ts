/**
 * excel-clipboard-paste
 * ----------------------
 * Turn text pasted from Excel / Google Sheets into a clean matrix.
 * Zero dependencies, works in the browser and in Node (with a DOM for HTML).
 */

export type {
  CellValue,
  ClipboardData,
  CoerceOptions,
  CsvOptions,
  Matrix,
  MatrixStats,
  ParseClipboardOptions,
  ParseOptions,
  ToObjectsOptions,
} from "./types.js";

export {
  hasHtmlTable,
  parseClipboard,
  parseClipboardText,
  parseHtmlTable,
  parsePasteEvent,
  readClipboardData,
} from "./parse.js";

export {
  cloneMatrix,
  coerceCell,
  coerceMatrix,
  dropHeaderRow,
  getHeaderRow,
  isEmptyMatrix,
  mapCells,
  matrixStats,
  padMatrix,
  removeEmptyColumns,
  removeEmptyRows,
  toCSV,
  toJSON,
  toMarkdownTable,
  toObjects,
  toTSV,
  transposeMatrix,
} from "./matrix.js";
