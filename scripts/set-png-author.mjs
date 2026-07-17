/**
 * Adds standard PNG tEXt attribution chunks to generated screenshots.
 * @author yewwung <yewwung@163.com>
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ATTRIBUTION = Object.freeze({
  Author: "yewwung",
  Creator: "yewwung",
  LastModifiedBy: "yewwung",
  AuthorEmail: "yewwung@163.com",
});
const ATTRIBUTION_KEYS = new Set(Object.keys(ATTRIBUTION));
const CRC_TABLE = createCrcTable();

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error("Usage: node scripts/set-png-author.mjs <png-or-directory> [...]");
  process.exit(1);
}

const files = [...new Set(inputs.flatMap(findPngFiles))];
for (const file of files) {
  addAttribution(file);
  verifyAttribution(file);
  console.log(`attributed ${file}`);
}

function findPngFiles(input) {
  const path = resolve(input);
  const stat = statSync(path);
  if (stat.isFile()) return extname(path).toLowerCase() === ".png" ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? findPngFiles(child) : extname(entry.name).toLowerCase() === ".png" ? [child] : [];
  });
}

function addAttribution(file) {
  const buffer = readFileSync(file);
  const chunks = readChunks(buffer).filter((chunk) => !isManagedTextChunk(chunk));
  const iendIndex = chunks.findIndex((chunk) => chunk.type === "IEND");
  if (iendIndex < 0) throw new Error(`${file} does not contain IEND`);
  const textChunks = Object.entries(ATTRIBUTION).map(([key, value]) => createChunk("tEXt", Buffer.from(`${key}\0${value}`, "latin1")));
  chunks.splice(iendIndex, 0, ...textChunks);
  writeFileSync(file, Buffer.concat([PNG_SIGNATURE, ...chunks.map((chunk) => chunk.raw)]));
}

function verifyAttribution(file) {
  const chunks = readChunks(readFileSync(file));
  const values = new Map(
    chunks
      .filter((chunk) => chunk.type === "tEXt")
      .map((chunk) => chunk.data.toString("latin1").split("\0", 2)),
  );
  for (const [key, value] of Object.entries(ATTRIBUTION)) {
    if (values.get(key) !== value) throw new Error(`${file} is missing ${key}=${value}`);
  }
}

function readChunks(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Invalid PNG signature");
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > buffer.length) throw new Error("Invalid PNG chunk length");
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data, raw: buffer.subarray(offset, end) });
    offset = end;
    if (type === "IEND") break;
  }
  return chunks;
}

function isManagedTextChunk(chunk) {
  if (chunk.type !== "tEXt") return false;
  const separator = chunk.data.indexOf(0);
  const keyword = chunk.data.subarray(0, separator < 0 ? chunk.data.length : separator).toString("latin1");
  return ATTRIBUTION_KEYS.has(keyword);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const raw = Buffer.alloc(data.length + 12);
  raw.writeUInt32BE(data.length, 0);
  typeBuffer.copy(raw, 4);
  data.copy(raw, 8);
  raw.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return { type, data, raw };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  return Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    return crc >>> 0;
  });
}
