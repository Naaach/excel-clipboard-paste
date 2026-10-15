import {
  coerceMatrix,
  matrixStats,
  parseClipboardText,
  parseHtmlTable,
  readClipboardData,
  toCSV,
  toJSON,
  toMarkdownTable,
  toTSV,
  type CellValue,
  type Matrix,
  type ParseOptions,
} from "../src/index.js";
import { detectDelimiter, parseCsv } from "./csv.js";
import { samples } from "./samples.js";

/** Hard cap so pasting a giant range never locks up the DOM. */
const MAX_GRID_ROWS = 500;

type TabId = "grid" | "json" | "csv" | "tsv" | "markdown";

type SourceKind = "text" | "html" | "file";

interface UiOptions extends ParseOptions {
  preferHtml: boolean;
  coerce: boolean;
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const pasteArea = byId<HTMLTextAreaElement>("paste-area");
const statsEl = byId<HTMLParagraphElement>("stats");
const gridEl = byId<HTMLDivElement>("grid");
const panelGrid = byId<HTMLDivElement>("panel-grid");
const panelCode = byId<HTMLDivElement>("panel-code");
const codeEl = byId<HTMLElement>("code").querySelector<HTMLElement>("code") ?? byId<HTMLElement>("code");
const copyButton = byId<HTMLButtonElement>("copy");
const copyFeedback = byId<HTMLSpanElement>("copy-feedback");
const clearButton = byId<HTMLButtonElement>("clear");
const fileButton = byId<HTMLButtonElement>("file-button");
const fileInput = byId<HTMLInputElement>("file-input");
const fileMeta = byId<HTMLSpanElement>("file-meta");
const sourceBadge = byId<HTMLSpanElement>("source-badge");
const themeToggle = byId<HTMLButtonElement>("theme-toggle");
const tablist = document.querySelector<HTMLDivElement>(".tabs");
const samplesContainer = document.querySelector<HTMLDivElement>(".samples");
const dropHint = byId<HTMLDivElement>("drop-hint");

let lastHtml = "";
let pendingHtml: string | null = null;
let activeTab: TabId = "grid";
let matrix: Matrix = [];
let sourceKind: SourceKind = "text";
let currentOutput = "";
/** When a file was opened, its text is re-parsed as CSV instead of as TSV. */
let fileSource: { name: string; text: string; delimiter: string } | null = null;
let copyTimer = 0;
let renderScheduled = false;

function checkbox(id: string): boolean {
  return byId<HTMLInputElement>(id).checked;
}

function readOptions(): UiOptions {
  return {
    trim: checkbox("opt-trim"),
    dropEmptyRows: checkbox("opt-drop-rows"),
    dropEmptyColumns: checkbox("opt-drop-cols"),
    rectangular: checkbox("opt-rect"),
    preferHtml: checkbox("opt-html"),
    coerce: checkbox("opt-coerce"),
  };
}

function compute(): { matrix: Matrix; source: SourceKind } {
  const options = readOptions();

  if (fileSource) {
    return { matrix: parseCsv(fileSource.text, fileSource.delimiter), source: "file" };
  }

  if (options.preferHtml && lastHtml) {
    return { matrix: parseHtmlTable(lastHtml, options), source: "html" };
  }

  return { matrix: parseClipboardText(pasteArea.value, options), source: "text" };
}

function columnLabel(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function typeClass(value: CellValue, coerced: boolean): string {
  if (!coerced) return "cell-text";
  if (value === null) return "cell-null";
  if (typeof value === "number") return "cell-number";
  if (typeof value === "boolean") return "cell-boolean";
  return "cell-text";
}

function cellNode(tag: "th" | "td", text: string, className: string): HTMLTableCellElement {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function renderGrid(data: Matrix, options: UiOptions): void {
  gridEl.replaceChildren();

  if (data.length === 0) {
    gridEl.className = "grid-empty";
    gridEl.textContent = "Paste some data to see the grid.";
    return;
  }

  gridEl.className = "grid";
  const width = data.reduce((max, row) => Math.max(max, row.length), 0);

  // Slice BEFORE coercing so a huge paste does not coerce every row.
  const visible = data.slice(0, MAX_GRID_ROWS);
  const display: CellValue[][] = options.coerce
    ? coerceMatrix(visible, { nulls: true })
    : visible;

  const table = document.createElement("table");
  table.className = "data-grid";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(cellNode("th", "#", "grid-corner"));
  for (let column = 0; column < width; column += 1) {
    headRow.append(cellNode("th", columnLabel(column), "grid-head"));
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  display.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    tr.append(cellNode("th", String(rowIndex + 1), "grid-row-head"));
    for (let column = 0; column < width; column += 1) {
      const value = row[column] ?? null;
      const text = value === null ? "" : String(value);
      const td = cellNode("td", text, typeClass(value, options.coerce));
      if (text === "") td.classList.add("cell-empty");
      tr.append(td);
    }
    tbody.append(tr);
  });
  table.append(tbody);
  gridEl.append(table);

  if (data.length > MAX_GRID_ROWS) {
    const note = document.createElement("p");
    note.className = "grid-note";
    note.textContent = `Showing ${MAX_GRID_ROWS} of ${data.length} rows (the text output includes all of them).`;
    gridEl.append(note);
  }
}

function codeForTab(tab: TabId, data: Matrix, options: UiOptions): string {
  switch (tab) {
    case "json":
      // Coercion applies here too, so JSON mirrors what the grid shows.
      return toJSON(options.coerce ? coerceMatrix(data, { nulls: true }) : data, { pretty: true });
    case "csv":
      return toCSV(data);
    case "tsv":
      return toTSV(data);
    case "markdown":
      return toMarkdownTable(data);
    case "grid":
    default:
      return toTSV(data);
  }
}

function setActiveTab(tab: TabId, options: { focus?: boolean } = {}): void {
  activeTab = tab;
  for (const button of document.querySelectorAll<HTMLButtonElement>(".tab")) {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
    if (isActive && options.focus) button.focus();
  }
  const isGrid = tab === "grid";
  panelGrid.hidden = !isGrid;
  panelCode.hidden = isGrid;
  // The single code panel is labelled by whichever tab is active.
  panelCode.setAttribute("aria-labelledby", `tab-${tab}`);
  render();
}

function updateStats(data: Matrix): void {
  const stats = matrixStats(data);
  if (stats.rows === 0) {
    statsEl.textContent = "No data yet.";
    return;
  }
  const bits = [
    `${stats.rows} row${stats.rows === 1 ? "" : "s"}`,
    `${stats.columns} column${stats.columns === 1 ? "" : "s"}`,
    `${stats.nonEmptyCells}/${stats.cells} cells with a value`,
  ];
  if (!stats.isRectangular) bits.push("ragged");
  statsEl.textContent = bits.join(" · ");
}

function updateSourceBadge(): void {
  const label =
    sourceKind === "html" ? "source: text/html" : sourceKind === "file" ? "source: file" : "";
  sourceBadge.textContent = label;
  sourceBadge.hidden = label === "";
}

function render(): void {
  const options = readOptions();
  const result = compute();
  matrix = result.matrix;
  sourceKind = result.source;

  updateStats(matrix);
  renderGrid(matrix, options);

  currentOutput = codeForTab(activeTab, matrix, options);
  codeEl.textContent = currentOutput.length > 0 ? currentOutput : "—";

  updateSourceBadge();
  copyButton.textContent = activeTab === "grid" ? "Copy TSV" : "Copy output";
  copyButton.disabled = currentOutput.length === 0;
}

/** Coalesce bursts of input events (one render per animation frame). */
function scheduleRender(): void {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();
  });
}

/* ------------------------------- events -------------------------------- */

pasteArea.addEventListener("paste", (event) => {
  // Capture the HTML flavor (if any) before the browser inserts the plain text.
  pendingHtml = readClipboardData(event).html;
});

pasteArea.addEventListener("input", () => {
  if (pendingHtml !== null) {
    lastHtml = pendingHtml;
    pendingHtml = null;
    fileSource = null;
    fileMeta.textContent = "";
  } else if (fileSource) {
    // Keep re-interpreting the imported file while the user edits it.
    fileSource.text = pasteArea.value;
    fileSource.delimiter = detectDelimiter(pasteArea.value);
  } else {
    lastHtml = "";
  }
  scheduleRender();
});

for (const option of document.querySelectorAll<HTMLInputElement>(".options input")) {
  option.addEventListener("change", scheduleRender);
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".tab")) {
  button.addEventListener("click", () => setActiveTab((button.dataset.tab as TabId) ?? "grid"));
}

tablist?.addEventListener("keydown", (event) => {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
  const index = tabs.findIndex((tab) => tab.dataset.tab === activeTab);
  if (index < 0) return;
  const keys: Record<string, number> = {
    ArrowRight: (index + 1) % tabs.length,
    ArrowLeft: (index - 1 + tabs.length) % tabs.length,
    Home: 0,
    End: tabs.length - 1,
  };
  const next = keys[event.key];
  if (next === undefined) return;
  event.preventDefault();
  const id = tabs[next]?.dataset.tab as TabId | undefined;
  if (id) setActiveTab(id, { focus: true });
});

function showFeedback(message: string): void {
  copyFeedback.textContent = message;
  if (copyTimer) window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copyFeedback.textContent = "";
  }, 1600);
}

copyButton.addEventListener("click", async () => {
  if (currentOutput.length === 0) return;
  try {
    await navigator.clipboard.writeText(currentOutput);
    showFeedback("Copied!");
  } catch {
    showFeedback("Could not copy");
  }
});

function clearSource(kind: "sample" | "manual"): void {
  lastHtml = "";
  pendingHtml = null;
  fileSource = null;
  fileMeta.textContent = kind === "manual" ? "" : fileMeta.textContent;
}

clearButton.addEventListener("click", () => {
  pasteArea.value = "";
  clearSource("manual");
  render();
  pasteArea.focus();
});

fileButton.addEventListener("click", () => fileInput.click());

async function loadFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    const delimiter = detectDelimiter(text);
    fileSource = { name: file.name, text, delimiter };
    pasteArea.value = text;
    lastHtml = "";
    pendingHtml = null;
    fileMeta.textContent = `${file.name} · delimiter "${delimiter === "\t" ? "\\t" : delimiter}"`;
    render();
  } catch {
    fileMeta.textContent = `Could not read ${file.name}`;
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file) void loadFile(file);
});

function setupDropZone(): void {
  const wrap = pasteArea.parentElement;
  if (!wrap) return;

  // Only take over drags that actually carry files, so normal text drag-and-drop
  // into the textarea keeps working.
  const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes("Files") ?? false;

  wrap.addEventListener("dragover", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dropHint.classList.add("is-active");
  });
  wrap.addEventListener("dragleave", (event) => {
    if (event.target === wrap) dropHint.classList.remove("is-active");
  });
  wrap.addEventListener("drop", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dropHint.classList.remove("is-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) void loadFile(file);
  });
}

/* ------------------------------- samples ------------------------------- */

function renderSamples(): void {
  if (!samplesContainer) return;
  for (const sample of samples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-button";
    button.textContent = sample.label;
    button.title = sample.hint;
    button.addEventListener("click", () => {
      pasteArea.value = sample.text;
      clearSource("sample");
      fileMeta.textContent = "";
      render();
    });
    samplesContainer.append(button);
  }
}

/* -------------------------------- theme -------------------------------- */

const THEMES = ["auto", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const label = themeToggle.querySelector<HTMLElement>("[data-theme-label]");
  if (label) label.textContent = theme[0]!.toUpperCase() + theme.slice(1);
  try {
    localStorage.setItem("ecp-theme", theme);
  } catch {
    /* storage may be unavailable */
  }
}

function initTheme(): void {
  let theme: Theme = "auto";
  try {
    const saved = localStorage.getItem("ecp-theme");
    if (saved === "light" || saved === "dark") theme = saved;
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    const next = THEMES[(THEMES.indexOf(current ?? "auto") + 1) % THEMES.length] ?? "auto";
    applyTheme(next);
  });
}

/* --------------------------------- boot -------------------------------- */

renderSamples();
setupDropZone();
initTheme();
render();
