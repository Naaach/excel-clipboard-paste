import { describe, expect, it } from "vitest";

import { parseClipboard, parseHtmlTable, parsePasteEvent } from "../src/index.js";

/** Build a fake ClipboardEvent good enough for the parser. */
function fakePasteEvent(flavors: { text?: string; html?: string }) {
  return {
    clipboardData: {
      getData(type: string) {
        if (type === "text/plain") return flavors.text ?? "";
        if (type === "text/html") return flavors.html ?? "";
        return "";
      },
    },
  } as unknown as ClipboardEvent;
}

const HTML_TABLE = `
  <table>
    <tr><td>Nombre</td><td>Edad</td></tr>
    <tr><td>Ana</td><td>25</td></tr>
    <tr><td>Luis</td><td>31</td></tr>
  </table>
`;

describe("parseClipboard", () => {
  it("reads text/plain by default", () => {
    const event = fakePasteEvent({ text: "Ana\t25\nLuis\t31", html: HTML_TABLE });
    expect(parseClipboard(event)).toEqual([
      ["Ana", "25"],
      ["Luis", "31"],
    ]);
  });

  it("prefers the HTML table when preferHtml is set", () => {
    const event = fakePasteEvent({ text: "ignored", html: HTML_TABLE });
    expect(parseClipboard(event, { preferHtml: true })).toEqual([
      ["Nombre", "Edad"],
      ["Ana", "25"],
      ["Luis", "31"],
    ]);
  });

  it("falls back to text when the HTML has no table", () => {
    const event = fakePasteEvent({ text: "A\tB", html: "<p>no table</p>" });
    expect(parseClipboard(event, { preferHtml: true })).toEqual([["A", "B"]]);
  });

  it("applies structural options on the HTML path too", () => {
    const event = fakePasteEvent({ html: HTML_TABLE });
    expect(parseClipboard(event, { preferHtml: true, dropEmptyRows: true, maxRows: 2 })).toEqual([
      ["Nombre", "Edad"],
      ["Ana", "25"],
    ]);
  });

  it("returns [] when the event is missing", () => {
    expect(parseClipboard(undefined)).toEqual([]);
  });

  it("exposes parsePasteEvent as an alias", () => {
    expect(parsePasteEvent).toBe(parseClipboard);
  });
});

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

  it("returns [] for empty input or missing table", () => {
    expect(parseHtmlTable("")).toEqual([]);
    expect(parseHtmlTable("<div>nope</div>")).toEqual([]);
  });
});
