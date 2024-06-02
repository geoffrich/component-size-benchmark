import { transformSync } from "@babel/core";
import { compile as svelte5Compile } from "./svelte-5/node_modules/svelte/src/compiler/index.js";
import { compile as svelte4Compile } from "./svelte-4/node_modules/svelte/src/compiler/index.js";
import {
  compileScript as compileVueScript,
  parse as parseVue
} from "./vue/node_modules/vue/compiler-sfc/index.mjs";
import { build } from "vite";

import { minify } from "terser";
import path from "node:path";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { Buffer } from "node:buffer";
import { brotliCompressSync, gzipSync } from "node:zlib";

const frameworks = {
  preact: {
    component: "app.jsx",
    dir: "./preact/"
  },
  react: {
    component: "App.jsx",
    dir: "./react/"
  },
  solid: {
    component: "App.jsx",
    dir: "./solid/"
  },
  svelte5: {
    component: "App.svelte",
    dir: "./svelte-5/"
  },
  svelte5Classic: {
    component: "App.svelte",
    dir: "./svelte-5-classic/"
  },
  svelte4: {
    component: "App.svelte",
    dir: "./svelte-4/"
  },
  vue: {
    component: "App.vue",
    dir: "./vue/"
  }
};

const transforms = {
  react: (src) => {
    const result = transformSync(src, {
      presets: ["@babel/preset-react"]
    });
    return result.code;
  },
  preact: (src) => {
    const result = transformSync(src, {
      plugins: [
        [
          "@babel/plugin-transform-react-jsx",
          {
            pragma: "h",
            pragmaFrag: "Fragment"
          }
        ]
      ]
    });
    return result.code;
  },
  solid: (src) => {
    const result = transformSync(src, {
      presets: ["solid"]
    });
    return result.code;
  },
  svelte5: (src) => {
    const result = svelte5Compile(src, {
      generate: "client",
      dev: false
    });
    return result.js.code;
  },
  svelte5Classic: (src) => {
    const result = svelte5Compile(src, {
      generate: "client",
      dev: false
    });
    return result.js.code;
  },
  svelte4: (src) => {
    const result = svelte4Compile(src, {
      generate: "dom",
      dev: false,
      css: "external",
      hydratable: true
    });
    return result.js.code;
  },
  vue: (src) => {
    const parsed = parseVue(src);
    const script = compileVueScript(parsed.descriptor, {
      inlineTemplate: true,
      id: "x"
    });
    return script.content;
  }
};

async function getComponentStats() {
  const result = {};
  for (const [framework, config] of Object.entries(frameworks)) {
    let filepath = path.join(config.dir, "src", config.component);
    let code = readFileSync(filepath, {
      encoding: "utf8"
    });

    code = transforms[framework](code);

    // ChatGPT-generated regex to remove import statements
    code = code.replace(
      /import\s[\s\S]*?from\s['"][^'"]*['"];?|import\s['"][^'"]*['"];?/gm,
      ""
    );

    const { minified, gzipped, brotli } = await writeDifferentFormats(
      code,
      framework
    );

    result[framework] = {
      minified: bytesize(minified),
      gzip: bytesize(gzipped),
      brotli: bytesize(brotli)
    };
  }

  return result;
}

async function writeDifferentFormats(src, filename) {
  const { code: minified } = await minify(src);

  const gzipped = gzipSync(minified);
  const brotli = brotliCompressSync(minified);

  writeFileSync(`./dist/${filename}.js`, src);
  writeFileSync(`./dist/${filename}.min.js`, minified);
  writeFileSync(`./dist/${filename}.min.js.gz`, gzipped);
  writeFileSync(`./dist/${filename}.min.js.brotli`, brotli);

  return {
    original: src,
    minified,
    gzipped,
    brotli
  };
}

async function getBundleStats() {
  const result = {};
  for (const [framework, config] of Object.entries(frameworks)) {
    const { output } = await build({
      root: config.dir,
      logLevel: "silent"
    });
    const builtJs = output.find((o) => o.fileName.endsWith(".js")).code;

    const { minified, gzipped, brotli } = await writeDifferentFormats(
      builtJs,
      `${framework}.bundle`
    );
    result[framework] = {
      minified: bytesize(minified),
      gzip: bytesize(gzipped),
      brotli: bytesize(brotli)
    };
  }
  return result;
}

function bytesize(str) {
  return Buffer.byteLength(str, "utf-8");
}

function makeCsv(componentStats, bundleStats) {
  let csv = "";
  const columns = Object.keys(frameworks);
  csv += "," + columns.join(",") + "\n";

  writeRow("component (min)", componentStats, "minified");
  writeRow("component (gzip)", componentStats, "gzip");
  writeRow("component (brotli)", componentStats, "brotli");
  writeRow("bundle (min)", bundleStats, "minified");
  writeRow("bundle (gzip)", bundleStats, "gzip");
  writeRow("bundle (brotli)", bundleStats, "brotli");
  return csv;

  function writeRow(label, obj, subkey) {
    csv += label;
    for (let column of columns) {
      csv += "," + obj[column][subkey];
    }
    csv += "\n";
  }
}

async function runBenchmark() {
  rmSync("./dist", { recursive: true, force: true });
  mkdirSync("./dist");
  const componentStats = await getComponentStats();
  const bundleStats = await getBundleStats();
  console.log([componentStats, bundleStats]);
  const csv = makeCsv(componentStats, bundleStats);
  writeFileSync("./dist/stats.csv", csv);
}

runBenchmark();
