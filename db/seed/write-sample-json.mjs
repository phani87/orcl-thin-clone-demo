import fs from "node:fs/promises";
import path from "node:path";
import { buildRetailData, SCALE_PRESETS, summarizeInventory } from "./generateRetailData.mjs";

const outputDir = path.resolve("generated");
const data = buildRetailData({ seed: "sample", scale: SCALE_PRESETS.tiny });

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "retail-sample.json"), JSON.stringify(data, null, 2));
console.log(summarizeInventory(data));
