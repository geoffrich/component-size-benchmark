import { transformSync } from "@babel/core";

import { minify } from "terser";

import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { brotliCompressSync, gzipSync } from "node:zlib";

const frameworks = {
  preact: "./preact/src/app.jsx",
  react: "./react/src/App.jsx",
  solid: "./solid/src/App.jsx"
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
  }
};

for (const [framework, filepath] of Object.entries(frameworks)) {
  let code = readFileSync(filepath, {
    encoding: "utf8"
  });

  code = transforms[framework](code);

  // remove imports, which will be shared between multiple components
  code = code
    .split("\n")
    .filter((line) => !line.startsWith("import "))
    .join("\n");

  const { code: minified } = await minify(code);
  console.log(framework, {
    minified: bytesize(minified),
    gzip: bytesize(gzipSync(minified)),
    brotli: bytesize(brotliCompressSync(minified))
  });
}

function bytesize(str) {
  return Buffer.byteLength(str, "utf-8");
}
