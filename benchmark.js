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
import path from "node:path";
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

    const { minified, gzipped, brotli } = await writeDifferentFormats(
      code,
      framework
    );

    console.log(framework, {
      minified: bytesize(minified),
      gzip: bytesize(gzipped),
      brotli: bytesize(brotli)
    });
  }
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
  const result = await build({
    root: "./svelte-5"
  });
  const builtJs = result.output.find((o) => o.fileName.endsWith(".js")).code;

  const framework = "svelte5.bundle";
  const { minified, gzipped, brotli } = await writeDifferentFormats(
    builtJs,
    framework
  );
  console.log(framework, {
    minified: bytesize(minified),
    gzip: bytesize(gzipped),
    brotli: bytesize(brotli)
  });
}

function bytesize(str) {
  return Buffer.byteLength(str, "utf-8");
}

async function runBenchmark() {
  if (!existsSync("./dist")) {
    mkdirSync("./dist");
  }
  // await getComponentStats();
  await getBundleStats();
}

runBenchmark();
