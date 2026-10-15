// Fails the build when the ESM bundle grows beyond the agreed size budget.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMIT_KB = 6;
const file = "dist/index.js";

const raw = readFileSync(file);
const gzipped = gzipSync(raw).length;
const kb = gzipped / 1024;

console.log(`${file}: ${raw.length} B raw · ${kb.toFixed(2)} KB gzip (limit ${LIMIT_KB} KB)`);

if (kb > LIMIT_KB) {
  console.error(`✗ Exceeded the ${LIMIT_KB} KB gzip limit`);
  process.exit(1);
}

console.log("✓ Within the size limit");
