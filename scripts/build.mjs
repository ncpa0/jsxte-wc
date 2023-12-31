import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = (...fpath) => path.resolve(__dirname, "..", ...fpath);

const isDev = process.argv.includes("--dev");
const watch = process.argv.includes("--watch");
const noSourceMap = process.argv.includes("--no-source-map");

async function main() {
  /**
   * @type {import("esbuild").BuildOptions}
   */
  const bldOptions = {
    target: "es2022",
    format: "esm",
    tsconfig: p("tsconfig.json"),
    entryPoints: [p("src/index.ts")],
    outdir: p("dist"),
    external: ["jsxte"],
    bundle: true,
    keepNames: true,
    treeShaking: !isDev,
    minify: false,
    sourcemap: noSourceMap ? false : isDev ? "inline" : false,
  };

  if (watch) {
    const buildCtx = await esbuild.context(bldOptions);
    await buildCtx.watch();
  } else {
    await esbuild.build(bldOptions);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
