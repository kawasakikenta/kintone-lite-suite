const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');

const outfile = path.resolve(__dirname, '..', '統合ツール_差分反映追加設計書.js');

const cssPlugin = {
  name: 'inline-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, 'utf8');
      const escaped = css.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      return {
        contents: `export default \`${escaped}\`;`,
        loader: 'js',
      };
    });
  },
};

async function run() {
  const ctx = await esbuild.context({
    entryPoints: [path.resolve(__dirname, 'src', 'index.js')],
    bundle: true,
    format: 'iife',
    outfile,
    charset: 'utf8',
    target: ['es2020'],
    minify: false,
    plugins: [cssPlugin],
    logLevel: 'info',
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    const stat = fs.statSync(outfile);
    console.log(`Built: ${outfile} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
