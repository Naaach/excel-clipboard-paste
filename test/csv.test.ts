import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "../playground/csv.js";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("honors escaped quotes", () => {
    expect(parseCsv('"say ""hi""",x')).toEqual([['say "hi"', "x"]]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsv('a,"line1\nline2"\nb,c')).toEqual([
      ["a", "line1\nline2"],
      ["b", "c"],
    ]);
  });

  it("supports an alternative delimiter", () => {
    expect(parseCsv("a;b\nc;d", ";")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("strips the byte-order mark", () => {
    expect(parseCsv("\uFEFFa,b")).toEqual([["a", "b"]]);
  });

  it("normalizes Windows line endings", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("does not create a row for a trailing newline or an empty file", () => {
    expect(parseCsv("a,b\n")).toEqual([["a", "b"]]);
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n\n")).toEqual([]);
  });

  it("treats a stray quote inside a field as a literal character", () => {
    expect(parseCsv('a"b,c')).toEqual([['a"b', "c"]]);
  });
});

describe("detectDelimiter", () => {
  it("prefers consistent delimiters", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects tabs and pipes", () => {
    expect(detectDelimiter("a\tb\n1\t2")).toBe("\t");
    expect(detectDelimiter("a|b\n1|2")).toBe("|");
  });

  it("keeps the comma when nothing looks delimited", () => {
    expect(detectDelimiter("solo una columna")).toBe(",");
    expect(detectDelimiter("")).toBe(",");
  });

  it("ignores delimiters inside quoted fields", () => {
    expect(detectDelimiter('"a,b";c\n"1,2";3')).toBe(";");
  });
});
