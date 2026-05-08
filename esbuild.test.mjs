import esbuild from "esbuild";
import { builtinModules } from "node:module";
import { spawnSync } from "node:child_process";
import process from "node:process";

await esbuild.build({
  bundle: true,
  entryPoints: ["src/text/prepareTextForSpeech.test.ts"],
  external: builtinModules.map((moduleName) => `node:${moduleName}`),
  format: "esm",
  outfile: ".tmp/prepareTextForSpeech.test.mjs",
  platform: "node",
  target: "node20",
});

const result = spawnSync("node", [".tmp/prepareTextForSpeech.test.mjs"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
