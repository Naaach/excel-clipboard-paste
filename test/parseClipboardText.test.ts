import { describe, expect, it } from "vitest";

import { parseClipboardText } from "../src/index.js";

describe("parseClipboardText", () => {
  it("returns [] for empty or invalid input", () => {
    expect(parseClipboardText("")).toEqual([]);
    expect(parseClipboardText(null)).toEqual([]);
    expect(parseClipboardText(undefined)).toEqual([]);
    expect(parseClipboardText(42)).toEqual([]);
    expect(parseClipboardText("\n\n")).toEqual([]);
  });

  it("parses a single cell", () => {
    expect(parseClipboardText("Ana")).toEqual([["Ana"]]);
  });

  it("parses several rows and columns from tabs and newlines", () => {
    expect(parseClipboardText("Ana\t25\nLuis\t31")).toEqual([
      ["Ana", "25"],
      ["Luis", "31"],
    ]);
  });

  it("normalizes Windows and legacy Mac line endings", () => {
    expect(parseClipboardText("A\tB\r\nC\tD")).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
    expect(parseClipboardText("A\tB\rC\tD")).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  it("keeps empty cells between and after tabs", () => {
    expect(parseClipboardText("A\t\nB\tC")).toEqual([
      ["A", ""],
      ["B", "C"],
    ]);
    expect(parseClipboardText("A\t")).toEqual([["A", ""]]);
  });

  it("ignores a single trailing newline without adding a spurious row", () => {
    expect(parseClipboardText("A\tB\n")).toEqual([["A", "B"]]);
    expect(parseClipboardText("A\tB\n\n\n")).toEqual([["A", "B"]]);
  });

  it("preserves interior blank rows (they may be meaningful)", () => {
    expect(parseClipboardText("A\n\nB")).toEqual([["A"], [""], ["B"]]);
  });

  it("ignores a leading byte-order mark", () => {
    expect(parseClipboardText("\uFEFFNombre\tEdad\nAna\t25")).toEqual([
      ["Nombre", "Edad"],
      ["Ana", "25"],
    ]);
  });

  it("preserves whitespace by default", () => {
    expect(parseClipboardText("  Ana \t 25 ")).toEqual([["  Ana ", " 25 "]]);
  });

  it("trims cells when requested", () => {
    expect(parseClipboardText("  Ana \t 25 ", { trim: true })).toEqual([["Ana", "25"]]);
  });

  it("drops empty rows and columns when requested", () => {
    const text = "\t\t\nA\t\tC\n\t\t";
    expect(parseClipboardText(text, { dropEmptyRows: true, dropEmptyColumns: true })).toEqual([
      ["A", "C"],
    ]);
  });

  it("caps rows with maxRows", () => {
    expect(parseClipboardText("1\n2\n3", { maxRows: 2 })).toEqual([["1"], ["2"]]);
  });

  it("applies maxRows after the other options", () => {
    // "b" must survive: dropping the blank row happens before the cap.
    expect(parseClipboardText("a\n\nb", { maxRows: 2, dropEmptyRows: true })).toEqual([
      ["a"],
      ["b"],
    ]);
  });

  it("handles maxRows edge values", () => {
    expect(parseClipboardText("1\n2\n3", { maxRows: 0 })).toEqual([]);
    expect(parseClipboardText("1\n2\n3", { maxRows: 1.9 })).toEqual([["1"]]);
    expect(parseClipboardText("1\n2\n3", { maxRows: -1 })).toEqual([]);
    expect(parseClipboardText("1\n2\n3", { maxRows: Number.POSITIVE_INFINITY })).toEqual([
      ["1"],
      ["2"],
      ["3"],
    ]);
    // Invalid values simply disable the cap.
    expect(parseClipboardText("1\n2\n3", { maxRows: Number.NaN })).toEqual([
      ["1"],
      ["2"],
      ["3"],
    ]);
  });

  it("pads rows to a rectangle when requested", () => {
    expect(parseClipboardText("A\tB\nC", { rectangular: true })).toEqual([
      ["A", "B"],
      ["C", ""],
    ]);
  });
});
