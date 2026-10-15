import type { Matrix } from "../src/index.js";

/**
 * Minimal RFC 4180 CSV reader. Playground-only helper: the core library stays
 * focused on clipboard parsing, but dropping a `.csv` file here is handy.
 */
export function parseCsv(text: string, delimiter = ","): Matrix {
  const source = text.replace(/\r\n?/g, "\n");
  const rows: Matrix = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  // A trailing newline should not create an extra empty row.
  const last = rows[rows.length - 1];
  if (last && last.length === 1 && last[0] === "") {
    rows.pop();
  }

  return rows;
}
