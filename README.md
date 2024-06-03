# Component Size Benchmark

This determines how an app's bundle size increases with the number of components, depending on the framework used. Specifically, the question I wanted to answer was **how does Svelte 5 compare to Svelte 4**?

Prior art:

- [Yes but does it scale?](https://github.com/sveltejs/svelte/issues/2546) on the sveltejs repo
- [Will it Scale? Finding Svelte's inflection point](https://github.com/halfnelson/svelte-it-will-scale) by halfnelson
- [JavaScript Framework TodoMVC Size Comparison](https://dev.to/this-is-learning/javascript-framework-todomvc-size-comparison-504f) by Ryan Carniato
- [Comparing generated code size of Vue and Svelte components](https://github.com/yyx990803/vue-svelte-size-analysis) by Evan You

## Running the benchmark

1. Run `npm install` in the root of the repo and in each subfolder to install dependencies.
2. Run `npm run bench` to run the benchmark. The stats will be output to the console. In addition, `dist/` will contain the generated JS files.

## Methodology

1. Each framework was initialized using their default Vite template and were updated to include a single component file. This component was an implementation of TodoMVC and was based on [the implementations](https://gist.github.com/ryansolid/aa5bd12ed4e2f9d592c4b23e58d6fa85) Ryan Carniato wrote for his article.
1. This component file is compiled in isolation. Import statements are removed (since they are usually shared in the final bundle) and the code is minified using terser. We then output the file size of the minified code, as well as the sizes when compressed with gzip and brotli.
1. Each app is bundled using Vite, minified, and compressed. This gets us the final bundle size. The difference between this bundle size and the individual component size is the size of the framework's runtime.

The results are output in [Markdown table format](stats.md).

### Svelte specific notes

Since this benchmark was written to gauge the impact of Svelte 5 on a codebase, it includes three different Svelte implementations:

- Svelte 4 with [`hydratable: true`](https://svelte.dev/docs/svelte-compiler#types-compileoptions). This includes extra code to allow the Svelte component to be hydrated after SSR.
- Svelte 4 with [`hydratable: false`](https://svelte.dev/docs/svelte-compiler#types-compileoptions). This is a smaller bundle since it does not include the hydration code.
- A prerelease version of Svelte 5. This does not have an equivalent hydratable flag since [Svelte components are always hydratable in Svelte 5](https://svelte-5-preview.vercel.app/docs/breaking-changes#changes-to-compiler-options).

## Findings

- Svelte 5 has a larger base runtime size than Svelte 4 (5.9kb vs 2.3kb / 1.5kb) but a much smaller component size (1.3kb vs 2.6kb / 2.1kb).
- This means Svelte 5 apps' bundle size increases at a much smaller rate than equivalent Svelte 4 apps.
  - A non-hydratable Svelte 4 app was equivalent in size to a Vue app at 22 TodoMVC-sized components. A hydratable Svelte 4 app was equivalent at 13 TodoMVC components. With Svelte 5, the threshold is much higher -- 228 TodoMVC components.
  - After 3 TodoMVC components in a hydratable Svelte 4 app, the app will be larger than the equivalent Svelte 5 app.
  - After 6 TodoMVC components in a non-hydratable Svelte 4 app, the app will be larger than the equivalent Svelte 5 app.
