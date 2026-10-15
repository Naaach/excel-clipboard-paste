import { describe, expect, it } from "vitest";

import {
  coerceMatrix,
  matrixStats,
  padMatrix,
  toCSV,
  toJSON,
  toMarkdownTable,
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

  it("detects empty and ragged matrices", () => {
    expect(matrixStats([["", ""]]).isEmpty).toBe(true);
    expect(matrixStats([["A"], ["B", "C"]]).isRectangular).toBe(false);
  });

  it("pads and transposes", () => {
    expect(padMatrix([["A"], ["B", "C"]])).toEqual([
      ["A", ""],
      ["B", "C"],
    ]);
    expect(transposeMatrix([["A", "B"]])).toEqual([["A"], ["B"]]);
  });

  it("coerces numbers and booleans but keeps the rest as text", () => {
    expect(coerceMatrix([["1", "true", "Ana", ""]])).toEqual([[1, true, "Ana", ""]]);
    expect(coerceMatrix([["1.5", "-2e3"]], { booleans: false })).toEqual([[1.5, -2000]]);
    expect(coerceMatrix([[""]], { nulls: true })).toEqual([[null]]);
  });
});

describe("serializers", () => {
  it("serializes to TSV (round-trip safe)", () => {
    expect(toTSV(matrix)).toBe("Nombre\tEdad\nAna\t25\nLuis\t31");
  });

  it("serializes to CSV with quoting", () => {
    expect(toCSV([["a,b", 'say "hi"']])).toBe('"a,b","say ""hi"""');
    expect(toCSV(matrix, { quoteIfNeeded: false, delimiter: ";" })).toBe(
      "Nombre;Edad\nAna;25\nLuis;31",
    );
  });

  it("serializes to a Markdown table", () => {
    expect(toMarkdownTable([["A", "B"], ["1", "2"]])).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
  });

  it("serializes to JSON", () => {
    expect(JSON.parse(toJSON([["A"]], { pretty: false }))).toEqual([["A"]]);
  });
});
