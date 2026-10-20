// 打包一次，渲出多张静帧：node scripts/stills.mjs <合成> <帧号,帧号,...> [输出目录]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [comp, framesArg, outDir = "out/stills"] = process.argv.slice(2);
const frames = framesArg.split(",").map(Number);
const browserExecutable = process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable });
fs.mkdirSync(outDir, { recursive: true });
for (const frame of frames) {
  const output = path.join(outDir, `${comp}-${String(frame).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, browserExecutable, imageFormat: "png" });
  console.log(output);
}
