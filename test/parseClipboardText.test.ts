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

  it("pads rows to a rectangle when requested", () => {
    expect(parseClipboardText("A\tB\nC", { rectangular: true })).toEqual([
      ["A", "B"],
      ["C", ""],
    ]);
  });
});
