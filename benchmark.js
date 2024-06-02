import { transformSync } from "@babel/core";
import { compile as svelte5Compile } from "./svelte-5/node_modules/svelte/src/compiler/index.js";
import { compile as svelte4Compile } from "./svelte-4/node_modules/svelte/src/compiler/index.js";
import {
  compileScript as compileVueScript,
  parse as parseVue
} from "./vue/node_modules/vue/compiler-sfc/index.mjs";
import { build } from "vite";

import { minify } from "terser";

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { Buffer } from "node:buffer";
import { brotliCompressSync, gzipSync } from "node:zlib";

const frameworks = {
  preact: "./preact/src/app.jsx",
  react: "./react/src/App.jsx",
  solid: "./solid/src/App.jsx",
  svelte5: "./svelte-5/src/App.svelte",
  svelte5Classic: "./svelte-5-classic/src/App.svelte",
  svelte4: "./svelte-4/src/App.svelte",
  vue: "./vue/src/App.vue"
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
  for (const [framework, filepath] of Object.entries(frameworks)) {
    let code = readFileSync(filepath, {
      encoding: "utf8"
    });

    code = transforms[framework](code);

    // ChatGPT-generated regex to remove import statements
    code = code.replace(
      /import\s[\s\S]*?from\s['"][^'"]*['"];?|import\s['"][^'"]*['"];?/gm,
      ""
    );

    const { code: minified } = await minify(code);

    const gzipped = gzipSync(minified);
    const brotli = brotliCompressSync(minified);

    console.log(framework, {
      minified: bytesize(minified),
      gzip: bytesize(gzipped),
      brotli: bytesize(brotli)
    });

    writeFileSync(`./dist/${framework}.js`, code);
    writeFileSync(`./dist/${framework}.min.js`, minified);
    writeFileSync(`./dist/${framework}.min.js.gz`, gzipped);
    writeFileSync(`./dist/${framework}.min.js.brotli`, brotli);
  }
}

async function getRuntimeStats() {}

function bytesize(str) {
  return Buffer.byteLength(str, "utf-8");
}

function runBenchmark() {
  if (!existsSync("./dist")) {
    mkdirSync("./dist");
  }
  getComponentStats();
}

runBenchmark();
