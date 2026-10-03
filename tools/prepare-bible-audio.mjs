import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(await fs.readFile(path.join(root, "tools/bible-audio-release.json"), "utf8"));
const cache = path.join(root, "work", release.browser_archive);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
let archive;
try { archive = await fs.readFile(cache); } catch { /* First build. */ }
if (!archive || sha256(archive) !== release.browser_archive_sha256) {
  const response = await fetch(release.browser_archive_url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Bible Audio bundle could not be downloaded: ${response.status}`);
  archive = Buffer.from(await response.arrayBuffer());
  if (sha256(archive) !== release.browser_archive_sha256) throw new Error("Bible Audio bundle checksum did not match.");
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(cache, archive);
}
const destination = path.join(root, "public/bible-audio");
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
for (const [name, data] of Object.entries(unzipSync(archive))) {
  const target = path.resolve(destination, name);
  if (!target.startsWith(destination + path.sep)) throw new Error("Unexpected path in Bible Audio archive.");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}
console.log(`Prepared Bible Audio ${release.version} for the browser.`);
