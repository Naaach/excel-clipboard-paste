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
} from "../src/index.js";
import { parseCsv } from "./csv.js";
import { samples } from "./samples.js";

/** Hard cap so pasting a giant range never locks up the DOM. */
const MAX_GRID_ROWS = 500;

type TabId = "grid" | "json" | "csv" | "tsv" | "markdown";

interface UiOptions {
  trim: boolean;
  dropEmptyRows: boolean;
  dropEmptyColumns: boolean;
  rectangular: boolean;
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
const viewGrid = byId<HTMLDivElement>("view-grid");
const viewCode = byId<HTMLDivElement>("view-code");
const codeEl = byId<HTMLElement>("code");
const copyButton = byId<HTMLButtonElement>("copy");
const copyFeedback = byId<HTMLSpanElement>("copy-feedback");
const clearButton = byId<HTMLButtonElement>("clear");
const fileInput = byId<HTMLInputElement>("file-input");
const fileMeta = byId<HTMLSpanElement>("file-meta");
const sourceBadge = byId<HTMLSpanElement>("source-badge");
const themeToggle = byId<HTMLButtonElement>("theme-toggle");
const samplesContainer = document.querySelector<HTMLDivElement>(".samples");

let lastHtml = "";
let pendingHtml: string | null = null;
let activeTab: TabId = "grid";
let currentMatrix: Matrix = [];

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

function computeMatrix(text: string, html: string, options: UiOptions): Matrix {
  if (options.preferHtml && html) {
    const fromHtml = parseHtmlTable(html, options);
    if (fromHtml.length > 0) return fromHtml;
  }
  return parseClipboardText(text, options);
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

function renderGrid(matrix: Matrix, options: UiOptions): void {
  gridEl.replaceChildren();

  if (matrix.length === 0) {
    gridEl.className = "grid-empty";
    gridEl.textContent = "Pega datos para ver el grid.";
    return;
  }

  gridEl.className = "grid";
  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const display: CellValue[][] = options.coerce ? coerceMatrix(matrix, { nulls: true }) : matrix;
  const visibleRows = display.slice(0, MAX_GRID_ROWS);

  const table = document.createElement("table");
  table.className = "data-grid";

  // Header row with column letters (A, B, C…) and a leading corner cell.
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(cellNode("th", "#", "grid-corner"));
  for (let column = 0; column < width; column += 1) {
    headRow.append(cellNode("th", columnLabel(column), "grid-head"));
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  visibleRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    tr.append(cellNode("th", String(rowIndex + 1), "grid-row-head"));
    for (let column = 0; column < width; column += 1) {
      const value = row[column] ?? "";
      const td = cellNode("td", String(value), typeClass(value, options.coerce));
      if (value === "") td.classList.add("cell-empty");
      tr.append(td);
    }
    tbody.append(tr);
  });
  table.append(tbody);
  gridEl.append(table);

  if (display.length > MAX_GRID_ROWS) {
    const note = document.createElement("p");
    note.className = "grid-note";
    note.textContent = `Mostrando ${MAX_GRID_ROWS} de ${display.length} filas (la salida de texto incluye todas).`;
    gridEl.append(note);
  }
}

function cellNode(tag: "th" | "td", text: string, className: string): HTMLTableCellElement {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function codeForTab(tab: TabId, matrix: Matrix): string {
  switch (tab) {
    case "json":
      return toJSON(matrix, { pretty: true });
    case "csv":
      return toCSV(matrix);
    case "tsv":
      return toTSV(matrix);
    case "markdown":
      return toMarkdownTable(matrix);
    case "grid":
    default:
      return toTSV(matrix);
  }
}

function renderCode(matrix: Matrix): void {
  const content = codeForTab(activeTab, matrix);
  codeEl.textContent = content.length > 0 ? content : "—";
}

function setActiveTab(tab: TabId): void {
  activeTab = tab;
  for (const button of document.querySelectorAll<HTMLButtonElement>(".tab")) {
    button.classList.toggle("is-active", button.dataset.tab === tab);
  }
  const isGrid = tab === "grid";
  viewGrid.hidden = !isGrid;
  viewCode.hidden = isGrid;
  renderCode(currentMatrix);
}

function updateStats(matrix: Matrix): void {
  const stats = matrixStats(matrix);
  if (stats.rows === 0) {
    statsEl.textContent = "Aún no hay datos.";
    return;
  }
  const bits = [
    `${stats.rows} fila${stats.rows === 1 ? "" : "s"}`,
    `${stats.columns} columna${stats.columns === 1 ? "" : "s"}`,
    `${stats.nonEmptyCells}/${stats.cells} celdas con valor`,
  ];
  if (!stats.isRectangular) bits.push("irregular");
  statsEl.textContent = bits.join(" · ");
}

function render(): void {
  const options = readOptions();
  currentMatrix = computeMatrix(pasteArea.value, lastHtml, options);
  updateStats(currentMatrix);
  renderGrid(currentMatrix, options);
  renderCode(currentMatrix);
  sourceBadge.hidden = !(options.preferHtml && lastHtml);
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
  } else {
    lastHtml = "";
  }
  render();
});

for (const option of document.querySelectorAll<HTMLInputElement>(".options input")) {
  option.addEventListener("change", render);
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".tab")) {
  button.addEventListener("click", () => setActiveTab((button.dataset.tab as TabId) ?? "grid"));
}

copyButton.addEventListener("click", async () => {
  const text = codeForTab(activeTab, currentMatrix);
  try {
    await navigator.clipboard.writeText(text);
    copyFeedback.textContent = "¡Copiado!";
  } catch {
    copyFeedback.textContent = "No se pudo copiar";
  }
  window.setTimeout(() => {
    copyFeedback.textContent = "";
  }, 1600);
});

clearButton.addEventListener("click", () => {
  pasteArea.value = "";
  lastHtml = "";
  fileMeta.textContent = "";
  render();
  pasteArea.focus();
});

function loadTextAsTsv(text: string, name: string): void {
  const isCsv = name.toLowerCase().endsWith(".csv");
  // CSV files are normalized to TSV so the rest of the pipeline stays simple.
  pasteArea.value = isCsv ? toTSV(parseCsv(text)) : text;
  lastHtml = "";
  fileMeta.textContent = name;
  render();
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  loadTextAsTsv(await file.text(), file.name);
  fileInput.value = "";
});

function setupDropZone(): void {
  const zone = byId<HTMLDivElement>("drop-hint");
  const wrap = pasteArea.parentElement;
  if (!wrap) return;

  wrap.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-active");
  });
  wrap.addEventListener("dragleave", () => zone.classList.remove("is-active"));
  wrap.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("is-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) loadTextAsTsv(await file.text(), file.name);
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
      lastHtml = "";
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
