import { describe, expect, it } from "vitest";

import { parseClipboard, parsePasteEvent, readClipboardData } from "../src/index.js";

/** Build a fake ClipboardEvent good enough for the parser. */
function fakePasteEvent(flavors: { text?: string; html?: string; getDataThrows?: boolean }) {
  return {
    clipboardData: {
      getData(type: string) {
        if (flavors.getDataThrows) throw new Error("SecurityError");
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

  it("does not fall back to text when a table exists but options empty it", () => {
    const event = fakePasteEvent({
      text: "REALTEXT",
      html: "<table><tr><td>   </td></tr></table>",
    });
    expect(parseClipboard(event, { preferHtml: true, trim: true, dropEmptyRows: true })).toEqual(
      [],
    );
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
    expect(parseClipboard(null)).toEqual([]);
  });

  it("works with a clipboardData that has no getData", () => {
    const event = { clipboardData: {} } as unknown as ClipboardEvent;
    expect(parseClipboard(event)).toEqual([]);
  });

  it("exposes parsePasteEvent as an alias that behaves identically", () => {
    expect(parsePasteEvent).toBe(parseClipboard);
    const event = fakePasteEvent({ text: "A\tB" });
    expect(parsePasteEvent(event, { trim: true })).toEqual([["A", "B"]]);
  });
});

describe("readClipboardData", () => {
  it("reads both flavors", () => {
    const event = fakePasteEvent({ text: "A\tB", html: "<table></table>" });
    expect(readClipboardData(event)).toEqual({ text: "A\tB", html: "<table></table>" });
  });

  it("degrades to empty strings for missing or broken events", () => {
    expect(readClipboardData(undefined)).toEqual({ text: "", html: "" });
    expect(readClipboardData(null)).toEqual({ text: "", html: "" });
    expect(readClipboardData({})).toEqual({ text: "", html: "" });
    expect(readClipboardData({ clipboardData: {} })).toEqual({ text: "", html: "" });
    expect(
      readClipboardData({ clipboardData: { getData: () => undefined } }),
    ).toEqual({ text: "", html: "" });
    expect(readClipboardData({ clipboardData: { getData: () => 42 } })).toEqual({
      text: "",
      html: "",
    });
  });

  it("survives a getData that throws", () => {
    expect(readClipboardData(fakePasteEvent({ getDataThrows: true }))).toEqual({
      text: "",
      html: "",
    });
  });
});
