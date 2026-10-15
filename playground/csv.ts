import type { Matrix } from "../src/index.js";

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

/** Count `delimiter` occurrences that are not inside a quoted field. */
function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }
  return count;
}

/**
 * Pick the delimiter that appears the most (and the most consistently) across
 * the first lines of the file. Playground-only helper for importing files:
 * European `.csv` files usually use `;`, and a wrong guess collapses the table
 * into a single column.
 */
export function detectDelimiter(text: string): string {
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, 50);

  if (lines.length === 0) return ",";

  let best: string = ",";
  let bestScore = 0;

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = lines.map((line) => countOutsideQuotes(line, delimiter));
    if (counts.every((count) => count === 0)) continue;
    const consistent = counts.every((count) => count === counts[0]);
    const score = consistent ? (counts[0] ?? 0) * 10 : Math.max(...counts);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Minimal RFC 4180 CSV reader. Playground-only helper: the core library stays
 * focused on clipboard parsing, but dropping a `.csv` file here is handy.
 *
 * Quotes are only special at the start of a field (like most real CSV readers),
 * fully blank lines are skipped, and the byte-order mark is ignored. Note that
 * `\r` inside a quoted field is normalized to `\n` with the rest of the file.
 */
export function parseCsv(text: string, delimiter = ","): Matrix {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rows: Matrix = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      if (row.length > 0 || field !== "") {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (row.length > 0 || field !== "") {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
