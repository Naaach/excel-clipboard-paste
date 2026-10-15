import { describe, expect, it } from "vitest";

import {
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
} from "../src/index.js";

const matrix = [
  ["Nombre", "Edad"],
  ["Ana", "25"],
  ["Luis", "31"],
];

describe("matrix helpers", () => {
  it("computes stats", () => {
    expect(matrixStats(matrix)).toEqual({
      rows: 3,
      columns: 2,
      cells: 6,
      emptyCells: 0,
      nonEmptyCells: 6,
      isEmpty: false,
      isRectangular: true,
    });
  });

  it("computes stats for empty and ragged matrices", () => {
    expect(matrixStats([])).toEqual({
      rows: 0,
      columns: 0,
      cells: 0,
      emptyCells: 0,
      nonEmptyCells: 0,
      isEmpty: true,
      isRectangular: true,
    });
    expect(matrixStats([["A", ""], ["B"]])).toEqual({
      rows: 2,
      columns: 2,
      cells: 3,
      emptyCells: 1,
      nonEmptyCells: 2,
      isEmpty: false,
      isRectangular: false,
    });
  });

  it("detects empty matrices without treating whitespace as empty", () => {
    expect(isEmptyMatrix([])).toBe(true);
    expect(isEmptyMatrix([["", ""]])).toBe(true);
    expect(isEmptyMatrix([[" "]])).toBe(false);
    expect(isEmptyMatrix([["A"]])).toBe(false);
  });

  it("deep-copies matrices", () => {
    const source = [["A"], ["B", "C"]];
    const copy = cloneMatrix(source);
    copy[0]?.push("X");
    expect(source).toEqual([["A"], ["B", "C"]]);
    expect(copy).toEqual([["A", "X"], ["B", "C"]]);
    expect(cloneMatrix([])).toEqual([]);
  });

  it("maps cells with row and column indexes", () => {
    expect(mapCells([["a", "b"], ["c"]], (cell, r, c) => `${r}${c}:${cell}`)).toEqual([
      ["00:a", "01:b"],
      ["10:c"],
    ]);
    expect(mapCells([], (cell) => cell)).toEqual([]);
  });

  it("pads and transposes", () => {
    expect(padMatrix([["A"], ["B", "C"]])).toEqual([
      ["A", ""],
      ["B", "C"],
    ]);
    expect(padMatrix([["A", "B"]])).toEqual([["A", "B"]]);
    expect(transposeMatrix([["A", "B"]])).toEqual([["A"], ["B"]]);
    expect(transposeMatrix([["A"], ["B", "C"]])).toEqual([
      ["A", "B"],
      ["", "C"],
    ]);
    expect(transposeMatrix([])).toEqual([]);
  });

  it("removes empty rows, keeping whitespace-only rows", () => {
    expect(removeEmptyRows([["A"], ["   "], [""]])).toEqual([["A"], ["   "]]);
    expect(removeEmptyRows([[""], [""]])).toEqual([]);
  });

  it("removes empty columns, treating missing cells as empty", () => {
    expect(removeEmptyColumns([["A", "", "C"], ["D", "", "F"]])).toEqual([["A", "C"], ["D", "F"]]);
    expect(removeEmptyColumns([["A", "", "C"], ["D"]])).toEqual([["A", "C"], ["D"]]);
    expect(removeEmptyColumns([])).toEqual([]);
  });

  it("returns and drops the header row with defensive copies", () => {
    const source = [["H1", "H2"], ["a", "b"]];
    const header = getHeaderRow(source);
    header.push("X");
    expect(source[0]).toEqual(["H1", "H2"]);
    expect(getHeaderRow([])).toEqual([]);

    const withoutHeader = dropHeaderRow(source);
    expect(withoutHeader).toEqual([["a", "b"]]);
    expect(dropHeaderRow([])).toEqual([]);
  });
});

describe("coerceCell", () => {
  it("coerces plain numbers and booleans", () => {
    expect(coerceCell("25")).toBe(25);
    expect(coerceCell("true")).toBe(true);
    expect(coerceCell("FALSE")).toBe(false);
    expect(coerceCell("Ana")).toBe("Ana");
  });

  it("accepts decimal and exponent forms", () => {
    expect(coerceCell(".5")).toBe(0.5);
    expect(coerceCell("1.")).toBe(1);
    expect(coerceCell("+5")).toBe(5);
    expect(coerceCell("-2e3")).toBe(-2000);
    expect(coerceCell("007")).toBe(7);
  });

  it("rejects non-finite and exotic numeric forms", () => {
    expect(coerceCell("Infinity")).toBe("Infinity");
    expect(coerceCell("0x10")).toBe("0x10");
    expect(coerceCell("1e999")).toBe("1e999");
    expect(coerceCell("")).toBe("");
  });

  it("only strips commas for strict thousands groups", () => {
    expect(coerceCell("1,234")).toBe(1234);
    expect(coerceCell("1,234,567.89")).toBe(1234567.89);
    // European decimal separator must stay text, not become 15.
    expect(coerceCell("1,5")).toBe("1,5");
    expect(coerceCell("12,34")).toBe("12,34");
    expect(coerceCell("1,2,3")).toBe("1,2,3");
    expect(coerceCell(",5")).toBe(",5");
  });

  it("normalizes -0 and respects the option flags", () => {
    expect(coerceCell("-0")).toBe(0);
    expect(coerceCell(" 1 ", { trim: false })).toBe(" 1 ");
    expect(coerceCell("1", { numbers: false })).toBe("1");
    expect(coerceCell("true", { booleans: false })).toBe("true");
    expect(coerceCell("", { nulls: true })).toBe(null);
    expect(coerceCell("   ", { nulls: true, trim: false })).toBe("   ");
  });

  it("coerces whole matrices", () => {
    expect(coerceMatrix([["1", "true", "Ana", ""]])).toEqual([[1, true, "Ana", ""]]);
    expect(coerceMatrix([[""]], { nulls: true })).toEqual([[null]]);
  });
});

describe("serializers", () => {
  it("serializes to TSV (round-trip safe for tab/newline-free cells)", () => {
    expect(toTSV(matrix)).toBe("Nombre\tEdad\nAna\t25\nLuis\t31");
    expect(toTSV([])).toBe("");
  });

  it("serializes to CSV with quoting", () => {
    expect(toCSV([["a,b", 'say "hi"']])).toBe('"a,b","say ""hi"""');
    expect(toCSV([["line1\nline2"]])).toBe('"line1\nline2"');
    expect(toCSV(matrix, { quoteIfNeeded: false, delimiter: ";" })).toBe(
      "Nombre;Edad\nAna;25\nLuis;31",
    );
    expect(toCSV([["a", "b"], ["c", "d"]], { eol: "\r\n" })).toBe("a,b\r\nc,d");
  });

  it("serializes to a Markdown table", () => {
    expect(toMarkdownTable([["A", "B"], ["1", "2"]])).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(toMarkdownTable([])).toBe("");
    expect(toMarkdownTable([["a|b", "c\nd"], ["x"]])).toBe(
      "| a\\|b | c d |\n| --- | --- |\n| x |  |",
    );
  });

  it("serializes to JSON, pretty by default", () => {
    expect(toJSON([["A", "B"]], { pretty: false })).toBe('[["A","B"]]');
    expect(toJSON([["A"]])).toBe('[\n  [\n    "A"\n  ]\n]');
  });

  it("converts a matrix to objects using the header row", () => {
    expect(toObjects(matrix)).toEqual([
      { Nombre: "Ana", Edad: "25" },
      { Nombre: "Luis", Edad: "31" },
    ]);
    expect(toObjects([])).toEqual([]);
  });

  it("fills empty and duplicated headers, and accepts explicit headers", () => {
    expect(toObjects([["", "Edad"], ["Ana", "25"]])).toEqual([{ column1: "Ana", Edad: "25" }]);
    expect(toObjects([["Edad", "Edad"], ["25", "31"]])).toEqual([
      { Edad: "25", Edad_2: "31" },
    ]);
    expect(toObjects([["Ana", "25"]], { headers: ["Nombre", "Edad"] })).toEqual([
      { Nombre: "Ana", Edad: "25" },
    ]);
  });
});
