// Records the Vite playground with Playwright and encodes it as an animated
// GIF (docs/demo.gif) for the README. Pure JS pipeline: no ffmpeg required.
//
// Usage:
//   pnpm gif            (builds the demo if needed, records, writes docs/demo.gif)
//
// The pasted data is a Google Sheets "Tasks" template range, tab-separated,
// exactly as a spreadsheet puts it on the clipboard.
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import gifenc from "gifenc";
import { PNG } from "pngjs";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEMO_DIR = resolve(ROOT, "dist-demo");
const OUT_PATH = resolve(ROOT, "docs", "demo.gif");
const PORT = 4173;
const URL_BASE = `http://localhost:${PORT}/`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const TASKS = [
  "Tareas\t\t1/3 completadas",
  "✓\tFecha\tTarea",
  "TRUE\t07/09\tEscribe lo que quieras en la columna A para completar una tarea",
  "FALSE\t08/09\tPara cambiar el formato de las tareas completadas, ve a Formato > Formato condicional (versión web)",
  "FALSE\t09/09\tPara ordenar las tareas, haz clic en la flecha de la lista desplegable de cada encabezado (versión web)",
];

function ensureDemoBuilt() {
  if (existsSync(resolve(DEMO_DIR, "index.html"))) return;
  console.log("dist-demo/ no existe; compilando el playground…");
  execSync("pnpm build:demo", { cwd: ROOT, stdio: "inherit" });
}

function startStaticServer() {
  const server = createServer((req, res) => {
    const path = req.url === "/" ? "/index.html" : (req.url ?? "/").split("?")[0];
    const file = resolve(DEMO_DIR, `.${path}`);
    if (!file.startsWith(DEMO_DIR) || !existsSync(file)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[file.slice(file.lastIndexOf("."))] ?? "text/plain" });
    res.end(readFileSync(file));
  });
  return new Promise((resolvePromise) => {
    server.listen(PORT, () => resolvePromise(server));
  });
}

async function main() {
  ensureDemoBuilt();
  const server = await startStaticServer();
  mkdirSync(resolve(ROOT, "docs"), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: URL_BASE });

  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(URL_BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const frames = [];
  const capture = async (delayMs) => {
    const png = await page.screenshot({ type: "png" });
    frames.push({ png, delayMs });
  };

  const textarea = page.locator("#paste-area");

  // 1 · Empty playground
  await capture(1000);

  // 2 · Focus the textarea
  await textarea.click();
  await page.waitForTimeout(250);
  await capture(700);

  // 3 · Paste the range line by line with REAL clipboard paste events,
  //     so the grid grows as the data lands.
  let pasted = "";
  for (let i = 0; i < TASKS.length; i += 1) {
    const chunk = i < TASKS.length - 1 ? `${TASKS[i]}\n` : TASKS[i];
    await page.evaluate((text) => navigator.clipboard.writeText(text), chunk);
    await page.keyboard.press("Control+V");
    await page.waitForTimeout(150);

    // Fallback for environments where a synthetic keyboard paste is blocked:
    // dispatch the same ClipboardEvent the browser would send.
    const value = await textarea.inputValue();
    if (!value.includes(chunk.slice(0, 10))) {
      await page.evaluate(
        ({ existing, text }) => {
          const area = document.getElementById("paste-area");
          const transfer = new DataTransfer();
          transfer.setData("text/plain", text);
          area.dispatchEvent(
            new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }),
          );
          area.value = existing + text;
          area.dispatchEvent(new Event("input", { bubbles: true }));
        },
        { existing: value, text: chunk },
      );
    }
    pasted += chunk;
    await page.waitForTimeout(250);
    await capture(i === TASKS.length - 1 ? 1100 : 500);
  }

  // 4 · Coerce: TRUE/FALSE become real booleans (colored in the grid and in JSON)
  await page.locator("#opt-coerce").check();
  await page.waitForTimeout(300);
  await capture(1000);

  // 5 · Walk through the output formats
  await page.locator("#tab-json").click();
  await page.waitForTimeout(300);
  await capture(1100);

  await page.locator("#tab-markdown").click();
  await page.waitForTimeout(300);
  await capture(1100);

  await page.locator("#tab-grid").click();
  await page.waitForTimeout(250);
  await capture(700);

  // 6 · Copy the output
  await page.locator("#copy").click();
  await page.waitForTimeout(350);
  await capture(1400);

  await browser.close();
  server.close();

  // 7 · Encode the GIF
  const gif = GIFEncoder();
  for (const frame of frames) {
    const { data, width, height } = PNG.sync.read(frame.png);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay: frame.delayMs });
  }
  gif.finish();
  writeFileSync(OUT_PATH, Buffer.from(gif.bytes()));

  // Optional: dump the raw PNG frames for inspection (GIF_DEBUG=1)
  if (process.env.GIF_DEBUG) {
    const dir = resolve(ROOT, ".gif-frames");
    mkdirSync(dir, { recursive: true });
    frames.forEach((frame, index) => {
      writeFileSync(resolve(dir, `frame-${String(index).padStart(2, "0")}.png`), frame.png);
    });
    console.log(`✓ PNG frames written to ${dir}`);
  }

  const bytes = readFileSync(OUT_PATH).length;
  console.log(`✓ ${frames.length} frames → ${OUT_PATH} (${(bytes / 1024).toFixed(0)} KB)`);
  if (!pasted.includes("Tarea")) {
    console.error("⚠ The paste flow did not insert the expected text");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
