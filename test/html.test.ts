import { afterEach, describe, expect, it, vi } from "vitest";

import { hasHtmlTable, parseHtmlTable } from "../src/index.js";

describe("parseHtmlTable", () => {
  it("expands colspan so columns stay aligned", () => {
    const html = `<table>
      <tr><td colspan="2">Total</td><td>X</td></tr>
      <tr><td>1</td><td>2</td><td>3</td></tr>
    </table>`;
    expect(parseHtmlTable(html)).toEqual([
      ["Total", "", "X"],
      ["1", "2", "3"],
    ]);
  });

  it("carries rowspan values into following rows", () => {
    const html = `<table>
      <tr><td rowspan="2">A</td><td>B</td></tr>
      <tr><td>C</td></tr>
    </table>`;
    expect(parseHtmlTable(html)).toEqual([
      ["A", "B"],
      ["A", "C"],
    ]);
  });

  it("keeps rowspan slots even when the following row is shorter", () => {
    const html = `<table>
      <tr><td rowspan="2">A</td><td>B</td><td>C</td><td rowspan="2">D</td></tr>
      <tr><td>X</td></tr>
      <tr><td>W</td><td>Z</td><td>Q</td><td>R</td></tr>
    </table>`;
    expect(parseHtmlTable(html)).toEqual([
      ["A", "B", "C", "D"],
      ["A", "X", "", "D"],
      ["W", "Z", "Q", "R"],
    ]);
  });

  it("does not lose rowspan values when a row is empty", () => {
    const html = `<table>
      <tr><td rowspan="2">A</td><td>B</td><td rowspan="2">C</td></tr>
      <tr></tr>
      <tr><td>Y</td></tr>
    </table>`;
    expect(parseHtmlTable(html)).toEqual([
      ["A", "B", "C"],
      ["A", "", "C"],
      ["Y"],
    ]);
  });

  it("ignores nested tables (rows and cells stay in their own table)", () => {
    const html = `<table>
      <tr><td>outer</td><td><table><tr><td>inner</td></tr></table></td></tr>
    </table>`;
    expect(parseHtmlTable(html)).toEqual([["outer", "inner"]]);
  });

  it("turns <br> into a newline inside a cell", () => {
    const html = `<table><tr><td>Line1<br>Line2</td></tr></table>`;
    expect(parseHtmlTable(html)).toEqual([["Line1\nLine2"]]);
  });

  it("turns &nbsp; into a regular space", () => {
    const html = `<table><tr><td>a&nbsp;b</td></tr></table>`;
    expect(parseHtmlTable(html)).toEqual([["a b"]]);
  });

  it("handles repeated header cells and th elements", () => {
    const html = `<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>`;
    expect(parseHtmlTable(html)).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });

  it("clamps absurd span values instead of looping forever", () => {
    // Browsers clamp colspan at 1000 when the value parses as an integer...
    expect(parseHtmlTable('<table><tr><td colspan="9999999999">X</td></tr></table>')[0]).toHaveLength(
      1000,
    );
    // ...and fall back to 1 when it does not ("1e999" is not a valid integer).
    expect(parseHtmlTable('<table><tr><td colspan="1e999">X</td></tr></table>')).toEqual([["X"]]);
    expect(parseHtmlTable('<table><tr><td colspan="2.5">X</td></tr></table>')).toEqual([["X", ""]]);
    expect(parseHtmlTable('<table><tr><td colspan="oops">X</td></tr></table>')).toEqual([["X"]]);
  });

  it("applies the structural options", () => {
    const html = `<table>
      <tr><td> A </td><td>&nbsp;B&nbsp;</td><td></td></tr>
      <tr><td></td><td></td><td></td></tr>
      <tr><td>C</td></tr>
    </table>`;

    expect(parseHtmlTable(html, { trim: true })).toEqual([
      ["A", "B", ""],
      ["", "", ""],
      ["C"],
    ]);

    expect(parseHtmlTable(html, { trim: true, dropEmptyRows: true })).toEqual([
      ["A", "B", ""],
      ["C"],
    ]);

    expect(parseHtmlTable(html, { trim: true, dropEmptyRows: true, dropEmptyColumns: true })).toEqual(
      [
        ["A", "B"],
        ["C"],
      ],
    );

    expect(parseHtmlTable(html, { rectangular: true })).toEqual([
      [" A ", " B ", ""],
      ["", "", ""],
      ["C", "", ""],
    ]);

    expect(parseHtmlTable(html, { maxRows: 2 })).toEqual([
      [" A ", " B ", ""],
      ["", "", ""],
    ]);

    expect(parseHtmlTable(html, { maxRows: 0 })).toEqual([]);
  });

  it("returns [] for empty input or missing table", () => {
    expect(parseHtmlTable("")).toEqual([]);
    expect(parseHtmlTable("   ")).toEqual([]);
    expect(parseHtmlTable("<div>nope</div>")).toEqual([]);
    expect(parseHtmlTable(null)).toEqual([]);
    expect(parseHtmlTable(42)).toEqual([]);
  });

  it("returns [] when no DOMParser is available", () => {
    vi.stubGlobal("DOMParser", undefined);
    try {
      expect(parseHtmlTable("<table><tr><td>A</td></tr></table>")).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("hasHtmlTable", () => {
  it("detects tables without parsing them", () => {
    expect(hasHtmlTable("<table><tr><td>A</td></tr></table>")).toBe(true);
    expect(hasHtmlTable('<TABLE class="x"><tr><td>A</td></tr></TABLE>')).toBe(true);
    expect(hasHtmlTable("<p>no table</p>")).toBe(false);
    expect(hasHtmlTable("")).toBe(false);
    expect(hasHtmlTable(undefined)).toBe(false);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
